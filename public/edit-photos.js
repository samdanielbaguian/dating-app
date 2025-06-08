const API_BASE = "/api/auth";

function getToken() {
  return localStorage.getItem("token");
}

// Génère le carousel/galerie avec 4 cases (vides ou avec photo)
function renderPhotoCarousel(profilePictures=[]) {
  const carousel = document.getElementById('photoCarousel');
  carousel.innerHTML = '';
  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'carousel-slot';

    // Photo existante
    if (profilePictures[i]) {
      const img = document.createElement('img');
      img.src = profilePictures[i];
      slot.appendChild(img);

      // Bouton suppression
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-photo-btn';
      removeBtn.title = 'Supprimer cette photo';
      removeBtn.innerHTML = '&times;';
      removeBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm("Supprimer cette photo ?")) {
          await removePhoto(profilePictures[i]);
        }
      };
      slot.appendChild(removeBtn);

      // Clic droit = téléchargement
      img.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        window.open(profilePictures[i], '_blank');
      });
    } else {
      // Case vide : bouton ajout
      const addBtn = document.createElement('button');
      addBtn.className = 'add-photo-btn';
      addBtn.type = 'button';
      addBtn.title = "Ajouter une photo";
      addBtn.innerHTML = `
        <span style="font-size:34px;line-height:34px;user-select:none;">&#43;</span>
        <span style="font-size:12px;color:#444;">Ajouter</span>
      `;
      addBtn.onclick = () => openFileInput(i);
      slot.appendChild(addBtn);
    }
    carousel.appendChild(slot);
  }
}

// Ouvre le file input caché et stocke la case à remplir
function openFileInput(slotIndex) {
  const input = document.getElementById('hiddenFileInput');
  input.dataset.slot = slotIndex;
  input.value = "";
  input.click();
}

// Upload la photo dans le slot choisi
function setupHiddenInputListener() {
  const input = document.getElementById('hiddenFileInput');
  input.onchange = async function () {
    const files = input.files;
    if (!files || !files[0]) return;
    const token = getToken();
    const formData = new FormData();
    formData.append('photos', files[0]);
    // On veut remplacer la photo à l’index choisi (si présente)
    try {
      // On charge les photos existantes pour l’ordre
      const profilePictures = await fetchProfilePictures();
      let newPictures = [...profilePictures];
      const slot = parseInt(input.dataset.slot, 10);
      newPictures[slot] = null; // on va remplacer à cet index

      // Upload la photo
      const res = await fetch("/api/auth/upload-photo", {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erreur lors de l'upload");

      // Remplace dans le bon slot (garde l’ordre)
      // data.profilePictures contient toutes les photos (max 4), on remet dans le bon slot
      let uploaded = data.profilePictures;
      // Si moins que 4, complète avec des cases vides
      while (uploaded.length < 4) uploaded.push(null);
      renderPhotoCarousel(uploaded);
    } catch (err) {
      alert(err.message || "Erreur lors de l'upload.");
      console.error(err);
    }
  };
}

// Supprime une photo (backend)
async function removePhoto(url) {
  const token = getToken();
  try {
    const res = await fetch('/api/auth/remove-photo', {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (res.ok) {
      let pics = data.profilePictures;
      while (pics.length < 4) pics.push(null);
      renderPhotoCarousel(pics);
    } else {
      alert(data.message || "Erreur lors de la suppression");
    }
  } catch (err) {
    alert("Erreur lors de la suppression");
    console.error(err);
  }
}

// Récupère la liste des photos de profil (backend)
async function fetchProfilePictures() {
  const token = getToken();
  const res = await fetch(`${API_BASE}/me`, {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  if (!res.ok) throw new Error("Impossible de charger vos photos.");
  const data = await res.json();
  // Complète à 4 slots pour la gestion d’ordre
  let pics = data.user.profilePictures || [];
  while (pics.length < 4) pics.push(null);
  return pics;
}

// Initialisation
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const pics = await fetchProfilePictures();
    renderPhotoCarousel(pics);
    setupHiddenInputListener();
  } catch (err) {
    alert(err.message || "Erreur lors du chargement de vos photos");
  }
});
