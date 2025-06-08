// settings.js

// Emplacement du backend (change si besoin)
const API_BASE = "/api/auth";

// Récupère le token (depuis localStorage, ou autre selon ton app)
function getToken() {
  return localStorage.getItem("token");
}

// Remplit les champs du profil à partir de l'objet user
function fillProfileFields(user) {
  document.getElementById('userNameAge').textContent = user.name && user.dateOfBirth
    ? `${user.name}, ${getUserAge(user.dateOfBirth)}`
    : user.name || "";
  document.getElementById('bioValue').textContent = user.bio || "";
  document.getElementById('birthdateValue').textContent = user.dateOfBirth
    ? new Date(user.dateOfBirth).toLocaleDateString('fr-FR')
    : "";
  document.getElementById('usernameValue').textContent = user.email || "";
  document.getElementById('profileCompletion').textContent = computeProfileCompletion(user) + "%";

  // Badges genres
  const genderBadges = document.getElementById('genderBadges');
  genderBadges.innerHTML = "";
  if (user.genderPreference === "Male" || user.genderPreference === "Both")
    genderBadges.innerHTML += `<span class="badge">Homme</span>`;
  if (user.genderPreference === "Female" || user.genderPreference === "Both")
    genderBadges.innerHTML += `<span class="badge">Femme</span>`;

  // Badges langues
  const languagesBadges = document.getElementById('languagesBadges');
  languagesBadges.innerHTML = "";
  (user.languages || []).forEach(lang => {
    languagesBadges.innerHTML += `<span class="badge">${lang}</span>`;
  });

  // Préférence relation
  const relationshipBadges = document.getElementById('relationshipBadges');
  relationshipBadges.innerHTML = "";
  if(user.relationshipType)
    relationshipBadges.innerHTML = `<span class="badge">${user.relationshipType}</span>`;

  // Sliders distance & âge recherché
  const distanceSlider = document.getElementById('distanceSlider');
  const distanceValue = document.getElementById('distanceValue');
  if(distanceSlider && user.distanceMax !== undefined) {
    distanceSlider.value = user.distanceMax;
    distanceValue.textContent = `${user.distanceMax} km`;
  }
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  const ageRangeValue = document.getElementById('ageRangeValue');
  if(user.preferences?.ageRange) {
    ageMinSlider.value = user.preferences.ageRange.min;
    ageMaxSlider.value = user.preferences.ageRange.max;
    ageRangeValue.textContent = `${user.preferences.ageRange.min} - ${user.preferences.ageRange.max} ans`;
  }

  // Avatar
  const avatarImg = document.querySelector('.avatar-img');
  if(avatarImg && user.profilePictures && user.profilePictures.length > 0) {
    avatarImg.src = user.profilePictures[0];
  }
  // Progression profil
  setProfileCompletion(computeProfileCompletion(user));
}

// Calcule l'âge à partir de la date de naissance
function getUserAge(dateStr) {
  const dob = new Date(dateStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// Calcule la complétion du profil (simple, à adapter)
function computeProfileCompletion(user) {
  let fields = [
    user.name, user.email, user.bio, user.dateOfBirth,
    user.genderPreference, user.languages, user.relationshipType, user.profilePictures
  ];
  let filled = fields.filter(f => f && (Array.isArray(f) ? f.length>0 : true)).length;
  return Math.round(100 * filled / fields.length);
}

// Récupère le profil au chargement
async function loadProfile() {
  const token = getToken();
  if (!token) {
    alert("Vous devez être connecté.");
    window.location.href = "login.html";
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/me`, {
      headers: { 'Authorization': 'Bearer ' + token }
    });
    if (!res.ok) throw new Error("Erreur lors du chargement du profil");
    const data = await res.json();
    fillProfileFields(data.user);
  } catch (err) {
    alert("Impossible de charger vos informations.");
    console.error(err);
  }
}

// Sauvegarde les modifications dès qu'un champ change
function setupProfileListeners() {
  const token = getToken();
  // Distance
  document.getElementById('distanceSlider').addEventListener('change', async (e) => {
    await updateProfile({ distanceMax: Number(e.target.value) }, token);
  });
  // Age recherché
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  function saveAgePrefs() {
    updateProfile({ preferences: { ageRange: {
      min: Number(ageMinSlider.value),
      max: Number(ageMaxSlider.value)
    } } }, token);
  }
  ageMinSlider.addEventListener('change', saveAgePrefs);
  ageMaxSlider.addEventListener('change', saveAgePrefs);
  // Tu peux ajouter d'autres listeners pour bio, langues, etc.
}

// Envoie une mise à jour du profil
async function updateProfile(payload, token) {
  try {
    const res = await fetch(`${API_BASE}/update`, {
      method: "PUT",
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify(payload)
    });
    if(!res.ok) throw new Error("Erreur lors de la sauvegarde");
    const data = await res.json();
    // Optionnel, mets à jour visuellement :
    fillProfileFields(data.user);
  } catch (err) {
    alert("Erreur lors de la sauvegarde du profil.");
    console.error(err);
  }
}

// ... (le reste du fichier reste identique)

// Ajoute ceci dans fillProfileFields pour remplir les champs éditables (si tu as des input ou textarea pour bio/langues etc.)
function fillProfileFields(user) {
  // ... (déjà présent)
  // Ajout pour champs éditables :
  if(document.getElementById('bioInput')) document.getElementById('bioInput').value = user.bio || "";
  if(document.getElementById('languagesInput')) document.getElementById('languagesInput').value = (user.languages || []).join(', ');
  if(document.getElementById('relationshipTypeSelect')) document.getElementById('relationshipTypeSelect').value = user.relationshipType || "";
  if(document.getElementById('genderPreferenceSelect')) document.getElementById('genderPreferenceSelect').value = user.genderPreference || "";
  // ...
}

// Ajoute ces écouteurs dans setupProfileListeners
function setupProfileListeners() {
  const token = getToken();

  // Distance et âge déjà présents...

  // Bio
  const bioInput = document.getElementById('bioInput');
  if (bioInput) {
    bioInput.addEventListener('change', async (e) => {
      await updateProfile({ bio: e.target.value }, token);
    });
  }

  // Langues (input séparé par virgule)
  const languagesInput = document.getElementById('languagesInput');
  if (languagesInput) {
    languagesInput.addEventListener('change', async (e) => {
      const langs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
      await updateProfile({ languages: langs }, token);
    });
  }

  // Préférence relationnelle
  const relationshipTypeSelect = document.getElementById('relationshipTypeSelect');
  if (relationshipTypeSelect) {
    relationshipTypeSelect.addEventListener('change', async (e) => {
      await updateProfile({ relationshipType: e.target.value }, token);
    });
  }

  // Genre préféré
  const genderPreferenceSelect = document.getElementById('genderPreferenceSelect');
  if (genderPreferenceSelect) {
    genderPreferenceSelect.addEventListener('change', async (e) => {
      await updateProfile({ genderPreference: e.target.value }, token);
    });
  }

  // ... (sliders distance et âge restent)
}

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  setupProfileListeners();
  // Tu peux ajouter ici d'autres listeners pour les autres champs modifiables
});
