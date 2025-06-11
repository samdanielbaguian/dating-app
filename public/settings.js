const API_BASE = "/api/auth";

// Récupère le token
function getToken() {
  return localStorage.getItem("token");
}

// Calcule l'âge
function getUserAge(dateStr) {
  const dob = new Date(dateStr);
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970);
}

// Complétion du profil (adapter selon les champs de ton backend)
function computeProfileCompletion(user) {
  let fields = [
    user.name, user.email, user.bio, user.dateOfBirth,
    user.genderPreference, user.languages, user.relationshipType, user.profilePictures
  ];
  let filled = fields.filter(f => f && (Array.isArray(f) ? f.length > 0 : true)).length;
  return Math.round(100 * filled / fields.length);
}

// Affiche le cercle de complétion
function setProfileCompletion(percent) {
  const circle = document.getElementById('progressCircle');
  const pct = Math.max(0, Math.min(100, percent));
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - pct / 100);
  if (circle) {
    circle.style.strokeDasharray = circumference;
    circle.style.strokeDashoffset = offset;
  }
  const progress = document.getElementById('profileCompletion');
  if (progress) progress.textContent = Math.round(pct) + "%";
}

// Remplit les champs du profil à partir de l'objet user
function fillProfileFields(user) {
  // Nom + âge
  const userNameAge = document.getElementById('userNameAge');
  if (userNameAge)
    userNameAge.textContent = user.name && user.dateOfBirth
      ? `${user.name}, ${getUserAge(user.dateOfBirth)}`
      : user.name || "";

  // Bio
  const bioInput = document.getElementById('bioInput');
  if (bioInput) bioInput.value = user.bio || "";

  // Date de naissance (lecture seule)
  const birthdateValue = document.getElementById('birthdateValue');
  if (birthdateValue)
    birthdateValue.textContent = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString('fr-FR')
      : "";

  // Nom d'utilisateur (email ou username selon ton backend)
  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) usernameInput.value = user.username || user.email || "";

  // Genres préférés
  const genderInput = document.getElementById('genderInput');
  if (genderInput && user.genderPreference) {
    // Si multi-select : split ou mettre tableau directement selon backend
    Array.from(genderInput.options).forEach(option => {
      option.selected = Array.isArray(user.genderPreference)
        ? user.genderPreference.includes(option.value)
        : user.genderPreference === option.value;
    });
  }

  // Langues parlées
  const languagesInput = document.getElementById('languagesInput');
  if (languagesInput)
    languagesInput.value = (user.languages || []).join(', ');

  // Préférence relationnelle
  const relationshipInput = document.getElementById('relationshipInput');
  if (relationshipInput)
    relationshipInput.value = user.relationshipType || "";

  // Distance slider
  const distanceSlider = document.getElementById('distanceSlider');
  const distanceValue = document.getElementById('distanceValue');
  if (distanceSlider && user.distanceMax !== undefined) {
    distanceSlider.value = user.distanceMax;
    if (distanceValue) distanceValue.textContent = `${user.distanceMax} km`;
  } else if (distanceSlider && distanceValue) {
    distanceValue.textContent = `${distanceSlider.value} km`;
  }

  // Age recherché sliders
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  const ageRangeValue = document.getElementById('ageRangeValue');
  if (user.preferences?.ageRange && ageMinSlider && ageMaxSlider) {
    ageMinSlider.value = user.preferences.ageRange.min;
    ageMaxSlider.value = user.preferences.ageRange.max;
    if (ageRangeValue)
      ageRangeValue.textContent = `${user.preferences.ageRange.min} - ${user.preferences.ageRange.max} ans`;
  } else if (ageMinSlider && ageMaxSlider && ageRangeValue) {
    ageRangeValue.textContent = `${ageMinSlider.value} - ${ageMaxSlider.value} ans`;
  }

  // Avatar
  const avatarImg = document.querySelector('.avatar-img');
  if (avatarImg && user.profilePictures && user.profilePictures.length > 0) {
    avatarImg.src = user.profilePictures[0];
  }

  // Complétion
  setProfileCompletion(computeProfileCompletion(user));
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
    if (!res.ok) throw new Error("Erreur lors de la sauvegarde");
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

  // Bio
  const bioInput = document.getElementById('bioInput');
  if (bioInput) {
    bioInput.addEventListener('change', async (e) => {
      await updateProfile({ bio: e.target.value }, token);
    });
  }

  // Nom d'utilisateur
  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) {
    usernameInput.addEventListener('change', async (e) => {
      await updateProfile({ username: e.target.value }, token);
    });
  }

  // Genres préférés (select multiple)
  const genderInput = document.getElementById('genderInput');
  if (genderInput) {
    genderInput.addEventListener('change', async (e) => {
      // Multi-select : tableau, single-select : string
      const values = Array.from(genderInput.selectedOptions).map(opt => opt.value);
      await updateProfile({ genderPreference: genderInput.multiple ? values : values[0] || null }, token);
    });
  }

  // Langues parlées
  const languagesInput = document.getElementById('languagesInput');
  if (languagesInput) {
    languagesInput.addEventListener('change', async (e) => {
      const langs = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
      await updateProfile({ languages: langs }, token);
    });
  }

  // Préférence de relation
  const relationshipInput = document.getElementById('relationshipInput');
  if (relationshipInput) {
    relationshipInput.addEventListener('change', async (e) => {
      await updateProfile({ relationshipType: e.target.value }, token);
    });
  }

  // Distance (slider)
  const distanceSlider = document.getElementById('distanceSlider');
  const distanceValue = document.getElementById('distanceValue');
  if (distanceSlider) {
    distanceSlider.addEventListener('input', function () {
      if (distanceValue) distanceValue.textContent = `${this.value} km`;
    });
    distanceSlider.addEventListener('change', async (e) => {
      await updateProfile({ distanceMax: Number(e.target.value) }, token);
    });
  }

  // Age recherché (sliders min et max)
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  const ageRangeValue = document.getElementById('ageRangeValue');
  function updateAgeRange() {
    let min = parseInt(ageMinSlider.value);
    let max = parseInt(ageMaxSlider.value);
    if (min > max) { if (this === ageMinSlider) ageMaxSlider.value = min; else ageMinSlider.value = max; min = Math.min(min, max); max = Math.max(min, max);}
    if (ageRangeValue) ageRangeValue.textContent = `${min} - ${max} ans`;
  }
  function saveAgePrefs() {
    let min = Number(ageMinSlider.value);
    let max = Number(ageMaxSlider.value);
    updateProfile({ preferences: { ageRange: { min, max } } }, token);
  }
  if (ageMinSlider && ageMaxSlider && ageRangeValue) {
    ageMinSlider.addEventListener('input', updateAgeRange);
    ageMaxSlider.addEventListener('input', updateAgeRange);
    ageMinSlider.addEventListener('change', saveAgePrefs);
    ageMaxSlider.addEventListener('change', saveAgePrefs);
    updateAgeRange();
  }

  // Gestion du submit général (Enregistrer)
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) {
    settingsForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const payload = {
        bio: bioInput ? bioInput.value : undefined,
        username: usernameInput ? usernameInput.value : undefined,
        genderPreference: genderInput
          ? (genderInput.multiple
            ? Array.from(genderInput.selectedOptions).map(opt => opt.value)
            : genderInput.value)
          : undefined,
        languages: languagesInput ? languagesInput.value.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        relationshipType: relationshipInput ? relationshipInput.value : undefined,
        distanceMax: distanceSlider ? Number(distanceSlider.value) : undefined,
        preferences: (ageMinSlider && ageMaxSlider)
          ? { ageRange: { min: Number(ageMinSlider.value), max: Number(ageMaxSlider.value) } }
          : undefined,
      };
      await updateProfile(payload, token);
    });
  }
}

// DOM ready
window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  setupProfileListeners();
});
