// Helpers Auth (à réutiliser selon ton projet)
async function apiFetch(url, options = {}) {
  let token = localStorage.getItem("token");
  options.headers = options.headers || {};
  options.headers.Authorization = `Bearer ${token}`;
  let res = await fetch(url, options);
  if (res.status === 401) {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      localStorage.clear();
      window.location.href = "/login.html";
      return;
    }
    const refreshRes = await fetch("/api/auth/refresh", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    });
    if (refreshRes.ok) {
      const { accessToken, refreshToken: newRefresh } = await refreshRes.json();
      localStorage.setItem("token", accessToken);
      localStorage.setItem("refreshToken", newRefresh);
      options.headers.Authorization = `Bearer ${accessToken}`;
      return fetch(url, options);
    } else {
      localStorage.clear();
      window.location.href = "/login.html";
      return;
    }
  }
  return res;
}

// Paramètres de pagination et filtrage
let currentPage = 1;
const pageSize = 20;
let onlyNonMatched = false;

// Affichage des likes reçus
async function loadLikes(page = 1) {
  const likesGrid = document.getElementById('likesGrid');
  const likesCount = document.getElementById('likesCount');
  const noLikes = document.getElementById('noLikes');
  const pagination = document.getElementById('likesPagination');
  likesGrid.innerHTML = '';
  likesCount.textContent = '';
  noLikes.style.display = 'none';
  pagination.innerHTML = '';

  let url = `/api/likes/received?page=${page}&limit=${pageSize}`;
  if (onlyNonMatched) url += "&onlyNonMatched=true";
  let res = await apiFetch(url);
  if (!res || !res.ok) {
    noLikes.style.display = '';
    return;
  }
  let users = await res.json();
  if (!users || users.length === 0) {
    noLikes.style.display = '';
    likesCount.textContent = '';
    return;
  }
  likesCount.textContent = `Tu as reçu ${users.length} like${users.length > 1 ? 's' : ''} !`;
  users.forEach(user => {
    const card = document.createElement('div');
    card.className = 'like-card';

    // Badges
    if (user.isMatched) {
      const badge = document.createElement('span');
      badge.className = 'badge match';
      badge.textContent = 'Match !';
      card.appendChild(badge);
    }

    // Avatar
    const avatar = document.createElement('img');
    avatar.className = 'like-avatar';
    avatar.src = (user.profilePictures && user.profilePictures[0]) || 'icons/default-avatar.png';
    avatar.alt = user.name;
    card.appendChild(avatar);

    // Infos
    const info = document.createElement('div');
    info.className = 'like-info';
    info.innerHTML = `<div class="like-name">${user.name || ''}</div>
      <div class="like-age-city">${user.age ? user.age + ' ans' : ''}${user.city ? ' • ' + user.city : ''}</div>`;
    card.appendChild(info);

    // Actions
    const actions = document.createElement('div');
    actions.className = 'like-actions';

    // Voir profil
    const seeBtn = document.createElement('button');
    seeBtn.className = 'see-profile';
    seeBtn.textContent = 'Voir profil';
    seeBtn.onclick = () => showProfileModal(user);
    actions.appendChild(seeBtn);

    // Like back (si pas déjà match)
    if (!user.isMatched) {
      const likeBtn = document.createElement('button');
      likeBtn.className = 'like-back';
      likeBtn.textContent = 'Like en retour';
      likeBtn.onclick = async () => {
        likeBtn.disabled = true;
        likeBtn.textContent = '...';
        const resp = await apiFetch(`/api/likes/${user.id}`, {
          method: "POST"
        });
        if (resp && resp.ok) {
          likeBtn.textContent = 'Match !';
          likeBtn.disabled = true;
          // Afficher le badge match
          const badge = document.createElement('span');
          badge.className = 'badge match';
          badge.textContent = 'Match !';
          card.appendChild(badge);
        } else {
          likeBtn.textContent = 'Erreur';
          likeBtn.disabled = false;
        }
      };
      actions.appendChild(likeBtn);

      // Retirer le like (unlike)
      const unlikeBtn = document.createElement('button');
      unlikeBtn.className = 'unlike';
      unlikeBtn.textContent = 'Retirer le like';
      unlikeBtn.onclick = async () => {
        unlikeBtn.disabled = true;
        unlikeBtn.textContent = '...';
        const resp = await apiFetch(`/api/likes/${user.id}`, { method: "DELETE" });
        if (resp && resp.ok) {
          card.remove();
        } else {
          unlikeBtn.textContent = 'Erreur';
          unlikeBtn.disabled = false;
        }
      };
      actions.appendChild(unlikeBtn);
    }

    card.appendChild(actions);
    likesGrid.appendChild(card);
  });

  // Pagination simple (boutons précédent/suivant)
  if (users.length === pageSize || page > 1) {
    if (page > 1) {
      const prevBtn = document.createElement('button');
      prevBtn.textContent = 'Précédent';
      prevBtn.onclick = () => {
        currentPage -= 1;
        loadLikes(currentPage);
      };
      pagination.appendChild(prevBtn);
    }
    if (users.length === pageSize) {
      const nextBtn = document.createElement('button');
      nextBtn.textContent = 'Suivant';
      nextBtn.onclick = () => {
        currentPage += 1;
        loadLikes(currentPage);
      };
      pagination.appendChild(nextBtn);
    }
  }
}

// Affichage de la modale profil (complète selon ton appli)
function showProfileModal(user) {
  const modal = document.getElementById("profileModal");
  const gallery = document.getElementById("modalGallery");
  const infos = document.getElementById("modalInfos");
  gallery.innerHTML = '';
  infos.innerHTML = '';

  // Photos
  if (user.profilePictures && user.profilePictures.length > 0) {
    user.profilePictures.forEach(url => {
      const img = document.createElement('img');
      img.src = url;
      img.style.width = '100%';
      img.style.marginBottom = '9px';
      img.style.borderRadius = '10px';
      gallery.appendChild(img);
    });
  } else {
    const img = document.createElement('img');
    img.src = (user.profilePictures && user.profilePictures[0]) || 'icons/default-avatar.png';
    img.style.width = '100%';
    img.style.borderRadius = '10px';
    gallery.appendChild(img);
  }

  // Infos détaillées
  infos.innerHTML = `
    <h3 style="color:#fff;">${user.name || ''}</h3>
    <div style="color:#bbb;">${user.age ? user.age + ' ans' : ''}${user.city ? ' • ' + user.city : ''}</div>
    <div style="margin-top:18px;color:#ccc;">${user.bio || ''}</div>
  `;
  modal.style.display = '';
}
document.getElementById("closeProfileModal").onclick = () => {
  document.getElementById("profileModal").style.display = "none";
};

// Gestion du filtrage "likes non-matchés"
document.getElementById('filterNonMatched').onchange = function () {
  onlyNonMatched = this.checked;
  currentPage = 1;
  loadLikes();
};

// Chargement initial
window.onload = () => {
  loadLikes();
};
