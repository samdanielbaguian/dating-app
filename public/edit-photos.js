const API_BASE = "/api/auth";

// Utilitaire pour obtenir le token
function getToken() {
  return localStorage.getItem("token");
}

// --- Carousel & Drag & Drop ---

let dragSrcIndex = null;
let dragOverIndex = null;
let currentPics = [null, null, null, null];

function renderPhotoCarousel(profilePictures=[]) {
  const carousel = document.getElementById('photoCarousel');
  carousel.innerHTML = '';
  currentPics = profilePictures.slice(0,4);
  while (currentPics.length < 4) currentPics.push(null);

  for (let i = 0; i < 4; i++) {
    const slot = document.createElement('div');
    slot.className = 'carousel-slot';
    slot.dataset.index = i;

    // Drag & drop events
    slot.draggable = currentPics[i] ? true : false;
    if (currentPics[i]) {
      slot.addEventListener('dragstart', dragStart);
      slot.addEventListener('dragend', dragEnd);
    }
    slot.addEventListener('dragover', dragOver);
    slot.addEventListener('drop', drop);
    slot.addEventListener('dragleave', dragLeave);

    // Photo existante
    if (currentPics[i]) {
      // Drag handle (optionnel mais UX)
      const dragHandle = document.createElement('span');
      dragHandle.className = "drag-handle";
      dragHandle.title = "Déplacer";
      dragHandle.textContent = "≡";
      slot.appendChild(dragHandle);

      const img = document.createElement('img');
      img.src = currentPics[i];
      slot.appendChild(img);

      // Bouton suppression
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-photo-btn';
      removeBtn.title = 'Supprimer cette photo';
      removeBtn.innerHTML = '&times;';
      removeBtn.onclick = async (e) => {
        e.stopPropagation();
        if (confirm("Supprimer cette photo ?")) {
          await removePhoto(currentPics[i]);
        }
      };
      slot.appendChild(removeBtn);

      // Clic droit = téléchargement
      img.addEventListener('contextmenu', function(e) {
        e.preventDefault();
        window.open(currentPics[i], '_blank');
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

      // Drag & drop ajout direct
      slot.addEventListener('drop', (e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files || []);
        if(files.length > 0) handlePhotoDrop(e, i, files[0]);
        slot.classList.remove('dragover');
      });
      slot.addEventListener('dragover', (e) => {
        e.preventDefault();
        slot.classList.add('dragover');
      });
      slot.addEventListener('dragleave', (e) => {
        slot.classList.remove('dragover');
      });
    }
    carousel.appendChild(slot);
  }
}

function dragStart(e) {
  dragSrcIndex = Number(this.dataset.index);
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = "move";
}
function dragEnd(e) {
  dragSrcIndex = null;
  this.classList.remove('dragging');
}
function dragOver(e) {
  e.preventDefault();
  dragOverIndex = Number(this.dataset.index);
  this.classList.add('dragover');
}
function dragLeave(e) {
  this.classList.remove('dragover');
}
function drop(e) {
  e.preventDefault();
  if (dragSrcIndex === null || dragOverIndex === null || dragSrcIndex === dragOverIndex) {
    this.classList.remove('dragover');
    return;
  }
  // Switch les indexes
  let picsCopy = [...currentPics];
  [picsCopy[dragSrcIndex], picsCopy[dragOverIndex]] = [picsCopy[dragOverIndex], picsCopy[dragSrcIndex]];
  savePhotoOrder(picsCopy.filter(Boolean));
  dragSrcIndex = null;
  dragOverIndex = null;
  this.classList.remove('dragover');
}

// Ouvre le file input caché et stocke l'index à remplir
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
    try {
      // On upload la photo, le backend ajoute en fin (max 4), puis on modifie l'ordre
      const uploadRes = await fetch("/api/auth/upload-photo", {
        method: 'POST',
        headers: { 'Authorization': 'Bearer ' + token },
        body: formData
      });
      const data = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(data.message || "Erreur lors de l'upload");

      // On place l'URL dans le bon slot
      const slot = parseInt(input.dataset.slot, 10);
      let newPics = data.profilePictures || [];
      while (newPics.length < 4) newPics.push(null);
      // Si la photo existe déjà ailleurs, évite le doublon dans l'ordre
      let url = newPics[newPics.length-1];
      newPics = newPics.filter(p=>p&&p!==url);
      newPics.splice(slot, 0, url);
      newPics = newPics.slice(0,4);

      await savePhotoOrder(newPics.filter(Boolean));
    } catch (err) {
      alert(err.message || "Erreur lors de l'upload.");
      console.error(err);
    }
  };
}

// Drag & drop d'un fichier depuis l'explorateur sur une case vide
async function handlePhotoDrop(e, slotIndex, file) {
  const token = getToken();
  const formData = new FormData();
  formData.append('photos', file);
  try {
    const uploadRes = await fetch("/api/auth/upload-photo", {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + token },
      body: formData
    });
    const data = await uploadRes.json();
    if (!uploadRes.ok) throw new Error(data.message || "Erreur lors de l'upload");

    // Place dans le bon slot
    let newPics = data.profilePictures || [];
    while (newPics.length < 4) newPics.push(null);
    let url = newPics[newPics.length-1];
    newPics = newPics.filter(p=>p&&p!==url);
    newPics.splice(slotIndex, 0, url);
    newPics = newPics.slice(0,4);

    await savePhotoOrder(newPics.filter(Boolean));
  } catch (err) {
    alert(err.message || "Erreur lors de l'upload.");
    console.error(err);
  }
}

// Supprime une photo
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
      let pics = data.profilePictures || [];
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

// Met à jour/sauvegarde l’ordre après drag & drop OU ajout
async function savePhotoOrder(newOrderPics) {
  const token = getToken();
  try {
    const res = await fetch('/api/auth/update', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + token
      },
      body: JSON.stringify({ profilePictures: newOrderPics })
    });
    const data = await res.json();
    if (res.ok) {
      let pics = data.user.profilePictures || [];
      while (pics.length < 4) pics.push(null);
      renderPhotoCarousel(pics);
    } else {
      alert(data.message || "Erreur lors de la modification de l’ordre");
    }
  } catch (err) {
    alert("Erreur lors de la modification de l’ordre");
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
  let pics = data.user.profilePictures || [];
  while (pics.length < 4) pics.push(null);
  return pics;
}

// Init
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const pics = await fetchProfilePictures();
    renderPhotoCarousel(pics);
    setupHiddenInputListener();
  } catch (err) {
    alert(err.message || "Erreur lors du chargement de vos photos");
  }
});
