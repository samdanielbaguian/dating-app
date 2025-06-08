// settings.js

const API_BASE = "/api/auth";

// Récupère le token (depuis localStorage, ou autre selon ton app)
function getToken() {
  return localStorage.getItem("token");
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

// Affiche la complétion du profil (progress bar ou pourcentage)
function setProfileCompletion(percent) {
  const progress = document.getElementById('profileCompletion');
  if(progress) progress.textContent = percent + "%";
}

// Remplit les champs du profil à partir de l'objet user
function fillProfileFields(user) {
  // Texte et badges
  if(document.getElementById('userNameAge'))
    document.getElementById('userNameAge').textContent = user.name && user.dateOfBirth
      ? `${user.name}, ${getUserAge(user.dateOfBirth)}`
      : user.name || "";

  if(document.getElementById('bioValue'))
    document.getElementById('bioValue').textContent = user.bio || "";

  if(document.getElementById('birthdateValue'))
    document.getElementById('birthdateValue').textContent = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString('fr-FR')
      : "";

  if(document.getElementById('usernameValue'))
    document.getElementById('usernameValue').textContent = user.email || "";

  if(document.getElementById('profileCompletion'))
    setProfileCompletion(computeProfileCompletion(user));

  // Badges genres
  const genderBadges = document.getElementById('genderBadges');
  if(genderBadges) {
    genderBadges.innerHTML = "";
    if (user.genderPreference === "Male" || user.genderPreference === "Both")
      genderBadges.innerHTML += `<span class="badge">Homme</span>`;
    if (user.genderPreference === "Female" || user.genderPreference === "Both")
      genderBadges.innerHTML += `<span class="badge">Femme</span>`;
  }

  // Badges langues
  const languagesBadges = document.getElementById('languagesBadges');
  if(languagesBadges) {
    languagesBadges.innerHTML = "";
    (user.languages || []).forEach(lang => {
      languagesBadges.innerHTML += `<span class="badge">${lang}</span>`;
    });
  }

  // Préférence relation
  const relationshipBadges = document.getElementById('relationshipBadges');
  if(relationshipBadges) {
    relationshipBadges.innerHTML = "";
    if(user.relationshipType)
      relationshipBadges.innerHTML = `<span class="badge">${user.relationshipType}</span>`;
  }

  // Sliders distance & âge recherché
  const distanceSlider = document.getElementById('distanceSlider');
  const distanceValue = document.getElementById('distanceValue');
  if(distanceSlider && user.distanceMax !== undefined) {
    distanceSlider.value = user.distanceMax;
    if(distanceValue) distanceValue.textContent = `${user.distanceMax} km`;
  }
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  const ageRangeValue = document.getElementById('ageRangeValue');
  if(user.preferences?.ageRange && ageMinSlider && ageMaxSlider) {
    ageMinSlider.value = user.preferences.ageRange.min;
    ageMaxSlider.value = user.preferences.ageRange.max;
    if(ageRangeValue)
      ageRangeValue.textContent = `${user.preferences.ageRange.min} - ${user.preferences.ageRange.max} ans`;
  }

  // Avatar
  const avatarImg = document.querySelector('.avatar-img');
  if(avatarImg && user.profilePictures && user.profilePictures.length > 0) {
    avatarImg.src = user.profilePictures[0];
  }

  // --- Pré-remplissage des champs éditables
  const bioInput = document.getElementById('bioInput');
  if(bioInput) bioInput.value = user.bio || "";

  const languagesInput = document.getElementById('languagesInput');
  if(languagesInput) languagesInput.value = (user.languages || []).join(', ');

  const relationshipTypeSelect = document.getElementById('relationshipTypeSelect');
  if(relationshipTypeSelect) relationshipTypeSelect.value = user.relationshipType || "";

  const genderPreferenceSelect = document.getElementById('genderPreferenceSelect');
  if(genderPreferenceSelect) genderPreferenceSelect.value = user.genderPreference || "";
}

// Charge le profil utilisateur au chargement de la page
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

// Met à jour le profil utilisateur côté serveur
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
    // Mets à jour visuellement :
    fillProfileFields(data.user);
  } catch (err) {
    alert("Erreur lors de la sauvegarde du profil.");
    console.error(err);
  }
}

// Installe les listeners sur tous les champs modifiables
function setupProfileListeners() {
  const token = getToken();

  // Distance (slider)
  const distanceSlider = document.getElementById('distanceSlider');
  if(distanceSlider) {
    distanceSlider.addEventListener('change', async (e) => {
      await updateProfile({ distanceMax: Number(e.target.value) }, token);
    });
  }

  // Age recherché (sliders min et max)
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  function saveAgePrefs() {
    if(ageMinSlider && ageMaxSlider)
      updateProfile({ preferences: { ageRange: {
        min: Number(ageMinSlider.value),
        max: Number(ageMaxSlider.value)
      } } }, token);
  }
  if(ageMinSlider) ageMinSlider.addEventListener('change', saveAgePrefs);
  if(ageMaxSlider) ageMaxSlider.addEventListener('change', saveAgePrefs);

  // Bio (textarea ou input)
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

  // Préférence relationnelle (select)
  const relationshipTypeSelect = document.getElementById('relationshipTypeSelect');
  if (relationshipTypeSelect) {
    relationshipTypeSelect.addEventListener('change', async (e) => {
      await updateProfile({ relationshipType: e.target.value }, token);
    });
  }

  // Genre préféré (select)
  const genderPreferenceSelect = document.getElementById('genderPreferenceSelect');
  if (genderPreferenceSelect) {
    genderPreferenceSelect.addEventListener('change', async (e) => {
      await updateProfile({ genderPreference: e.target.value }, token);
    });
  }
}

// Initialisation au chargement de la page
window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  setupProfileListeners();
});
