const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const authMiddleware = require("../middleware/authMiddleware");
const User = require("../models/User");

const router = express.Router();

// === CONFIGURATION DE MULTER ===
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, "uploads/"),
    filename: (req, file, cb) =>
        cb(null, Date.now() + path.extname(file.originalname))
});

const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const ext = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mime = allowedTypes.test(file.mimetype);
    if (ext && mime) {
        cb(null, true);
    } else {
        cb(new Error("Format de fichier non valide."));
    }
};

// public/photo.js

// Fonction principale d'upload de photos et de mise à jour du profil
async function submitPhotos() {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Vous devez être connecté pour continuer.");
    return;
  }
  const formData = new FormData();
  // Ajout de la photo de profil principale (input avec id "profilePicture")
  const profileInput = document.getElementById('profilePicture');
  const profileFile = profileInput && profileInput.files[0];
  if (profileFile) formData.append("photos", profileFile);
  // Ajout des autres photos de la galerie (inputs dans .photo-slot)
  document.querySelectorAll('.photo-slot input[type="file"]').forEach(input => {
    if (input.files[0]) formData.append("photos", input.files[0]);
  });

  try {
    // 1. Upload des photos
    const uploadResponse = await fetch("/api/photo/upload", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` }, // PAS de Content-Type ici !
      body: formData
    });
    const uploadResult = await uploadResponse.json();
    if (!uploadResponse.ok) throw new Error(uploadResult.message || "Erreur lors de l'upload");

    // 2. Mise à jour des préférences (bio, distance, âge, langues)
    const bio = document.getElementById("bio").value.trim();
    const distanceMax = Number(document.getElementById("distance").value);
    const ageMinVal = Number(document.getElementById("ageMin").value);
    const ageMaxVal = Number(document.getElementById("ageMax").value);
    const languages = document.getElementById("languages").value
      .split(",")
      .map(lang => lang.trim())
      .filter(Boolean);
    const preferencesBody = {
      bio,
      distanceMax,
      preferences: { ageRange: { min: ageMinVal, max: ageMaxVal } },
      languages
    };
    const prefResponse = await fetch("/api/auth/update", {
      method: "PUT",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(preferencesBody)
    });
    const prefResult = await prefResponse.json();
    if (!prefResponse.ok) throw new Error(prefResult.message || "Erreur lors de la mise à jour");

    alert("Profil mis à jour avec succès !");
    window.location.href = "index.html";
  } catch (err) {
    console.error(err);
    alert("Erreur : " + err.message);
  }
}

// Fonction pour supprimer une photo de la galerie
async function deletePhoto(photoPath) {
  const token = localStorage.getItem("token");
  if (!token) {
    alert("Vous devez être connecté pour continuer.");
    return;
  }
  try {
    const response = await fetch("/api/photo/gallery-photo", {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ photo: photoPath })
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Erreur lors de la suppression");
    alert("Photo supprimée avec succès !");
    // Ici, tu peux rafraîchir la galerie côté front (reload ou suppression dynamique du DOM)
    window.location.reload();
  } catch (err) {
    console.error(err);
    alert("Erreur : " + err.message);
  }
}

// Ajoute les event listeners de suppression après le chargement du DOM
document.addEventListener("DOMContentLoaded", function () {
  document.querySelectorAll('.remove-photo').forEach(btn => {
    btn.addEventListener('click', function (e) {
      e.preventDefault();
      // Récupère le chemin de la photo (ex: depuis un attribut data-photo-path sur l'image)
      const photoSlot = this.closest('.photo-slot');
      const img = photoSlot && photoSlot.querySelector('img[data-photo-path]');
      const photoPath = img && img.dataset.photoPath;
      if (photoPath) {
        if (confirm("Supprimer cette photo ?")) deletePhoto(photoPath);
      }
    });
  });
});

// Tu peux appeler submitPhotos() via ton bouton "C'est parti !" :
// <button type="button" class="submit-button" onclick="submitPhotos()">C’est parti !</button>

module.exports = router;
