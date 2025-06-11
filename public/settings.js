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

// GENRE PRÉFÉRÉ (multi-selection possible)
const GENDER_OPTIONS = [
  { value: "Male", label: "Homme" },
  { value: "Female", label: "Femme" },
  { value: "Both", label: "Les deux" }
];
function renderGenderPreferenceBadges(selected = []) {
  const row = document.getElementById('genderPreferenceBadges');
  if (!row) return;
  row.innerHTML = "";
  GENDER_OPTIONS.forEach(opt => {
    const badge = document.createElement('span');
    badge.className = "badge-toggle" + (selected.includes(opt.value) ? " active" : "");
    badge.textContent = opt.label;
    badge.tabIndex = 0;
    badge.setAttribute("role","button");
    badge.setAttribute("aria-pressed", selected.includes(opt.value) ? "true" : "false");
    badge.addEventListener('click', async () => {
      let newSelected = Array.isArray(selected) ? [...selected] : [];
      if (newSelected.includes(opt.value)) {
        newSelected = newSelected.filter(v => v !== opt.value);
      } else {
        newSelected.push(opt.value);
      }
      await updateProfile({ genderPreference: newSelected }, getToken());
      renderGenderPreferenceBadges(newSelected);
    });
    row.appendChild(badge);
  });
}

// PRÉFÉRENCE DE RELATION (multi-selection possible)
const RELATIONSHIP_OPTIONS = [
  { value: "Long terme", label: "Long terme" },
  { value: "Court terme", label: "Court terme" },
  { value: "Pour le fun", label: "Pour le fun" }
];
function renderRelationshipTypeBadges(selected = []) {
  const row = document.getElementById('relationshipTypeBadges');
  if (!row) return;
  row.innerHTML = "";
  RELATIONSHIP_OPTIONS.forEach(opt => {
    const badge = document.createElement('span');
    badge.className = "badge-toggle" + (selected.includes(opt.value) ? " active" : "");
    badge.textContent = opt.label;
    badge.tabIndex = 0;
    badge.setAttribute("role","button");
    badge.setAttribute("aria-pressed", selected.includes(opt.value) ? "true" : "false");
    badge.addEventListener('click', async () => {
      let newSelected = Array.isArray(selected) ? [...selected] : [];
      if (newSelected.includes(opt.value)) {
        newSelected = newSelected.filter(v => v !== opt.value);
      } else {
        newSelected.push(opt.value);
      }
      await updateProfile({ relationshipType: newSelected }, getToken());
      renderRelationshipTypeBadges(newSelected);
    });
    row.appendChild(badge);
  });
}

// Remplit les champs du profil à partir de l'objet user
function fillProfileFields(user) {
  // Nom + âge
  const userNameAge = document.getElementById('userNameAge');
  if (userNameAge)
    userNameAge.textContent = user.name && user.dateOfBirth
      ? `${user.name}, ${getUserAge(user.dateOfBirth)}`
      : user.name || "";

  // Bio (si input présent dans une version future)
  const bioInput = document.getElementById('bioInput');
  if (bioInput) bioInput.value = user.bio || "";
  const bioValue = document.getElementById('bioValue');
  if (bioValue) bioValue.textContent = user.bio || "";

  // Date de naissance (lecture seule)
  const birthdateValue = document.getElementById('birthdateValue');
  if (birthdateValue)
    birthdateValue.textContent = user.dateOfBirth
      ? new Date(user.dateOfBirth).toLocaleDateString('fr-FR')
      : "";

  // Nom d'utilisateur (email ou username selon ton backend)
  const usernameInput = document.getElementById('usernameInput');
  if (usernameInput) usernameInput.value = user.username || user.email || "";
  const usernameValue = document.getElementById('usernameValue');
  if (usernameValue) usernameValue.textContent = user.username || user.email || "";

  // Genres préférés (affichage badge display non éditable ici)
  const genderBadges = document.getElementById('genderBadges');
  if (genderBadges) {
    genderBadges.innerHTML = "";
    let gp = user.genderPreference;
    let arr = Array.isArray(gp) ? gp : gp ? [gp] : [];
    if (arr.includes("Male") || arr.includes("Both"))
      genderBadges.innerHTML += `<span class="badge">Homme</span>`;
    if (arr.includes("Female") || arr.includes("Both"))
      genderBadges.innerHTML += `<span class="badge">Femme</span>`;
    if (arr.includes("Both"))
      genderBadges.innerHTML += `<span class="badge">Les deux</span>`;
  }

  // Langues parlées (badges)
  const languagesBadges = document.getElementById('languagesBadges');
  if (languagesBadges) {
    languagesBadges.innerHTML = "";
    (user.languages || []).forEach(lang => {
      languagesBadges.innerHTML += `<span class="badge">${lang}</span>`;
    });
  }

  // Badges interactifs pour genre & relation
  let gp = user.genderPreference;
  renderGenderPreferenceBadges(Array.isArray(gp) ? gp : gp ? [gp] : []);
  let rt = user.relationshipType;
  renderRelationshipTypeBadges(Array.isArray(rt) ? rt : rt ? [rt] : []);

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

// Installe les listeners sur tous les champs modifiables et sliders
function setupProfileListeners() {
  const token = getToken();

  // Distance slider (affichage dynamique + MAJ backend)
  const distanceSlider = document.getElementById('distanceSlider');
  const distanceValue = document.getElementById('distanceValue');
  if (distanceSlider && distanceValue) {
    distanceSlider.addEventListener('input', function () {
      distanceValue.textContent = `${this.value} km`;
    });
    distanceSlider.addEventListener('change', async (e) => {
      await updateProfile({ distanceMax: Number(e.target.value) }, token);
    });
    // Affichage initial
    distanceValue.textContent = `${distanceSlider.value} km`;
  }

  // Double slider âge recherché (affichage dynamique + MAJ backend)
  const ageMinSlider = document.getElementById('ageMinSlider');
  const ageMaxSlider = document.getElementById('ageMaxSlider');
  const ageRangeValue = document.getElementById('ageRangeValue');
  function updateAgeRange() {
    let min = parseInt(ageMinSlider.value, 10);
    let max = parseInt(ageMaxSlider.value, 10);
    if (min > max) {
      if (this === ageMinSlider) ageMaxSlider.value = min;
      else ageMinSlider.value = max;
      min = Math.min(min, max);
      max = Math.max(min, max);
    }
    if (ageRangeValue)
      ageRangeValue.textContent = `${min} - ${max} ans`;
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

  // Gestion nav bar (activer bouton profil + icônes dynamiques)
  function setupNavBar() {
    document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => b.classList.remove('active'));
    const navProfile = document.getElementById('navProfile');
    if (navProfile) navProfile.classList.add('active');

    document.querySelectorAll('.bottom-nav .nav-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.bottom-nav .nav-btn').forEach(b => {
          b.classList.remove('active');
          const img = b.querySelector('img.nav-icon');
          if(img) img.src = img.getAttribute('data-inactive');
        });
        this.classList.add('active');
        const img = this.querySelector('img.nav-icon');
        if(img) img.src = img.getAttribute('data-active');
      });
    });
    const profileBtn = document.getElementById('navProfile');
    if (profileBtn) {
      const img = profileBtn.querySelector('img.nav-icon');
      if (img) img.src = img.getAttribute('data-active');
    }
  }
  setupNavBar();

  // (ajoute ici tous les autres listeners pour bio, username, langues, etc. si besoin)
}

// DOM ready
window.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  setupProfileListeners();
});
