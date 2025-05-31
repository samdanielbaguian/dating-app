document.addEventListener("DOMContentLoaded", () => {
  const socket = io();
  const token = localStorage.getItem("token");
  let currentUserId = null;
  let currentChatUserId = null;

  const chatPopup = document.getElementById("chatPopup");
  const chatUserPhoto = document.getElementById("chatUserPhoto");
  const chatUserName = document.getElementById("chatUserName");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");
  const closeChatBtn = document.getElementById("closeChatBtn");

  // Récupération de l'utilisateur connecté
  async function fetchCurrentUserId() {
    try {
      const res = await fetch("/api/auth/profile", {
        headers: { Authorization: "Bearer " + token },
      });
      const user = await res.json();
      currentUserId = user._id;
      socket.on(`receiveMessage:${currentUserId}`, handleIncomingMessage);
    } catch (err) {
      console.error("Erreur récupération ID utilisateur :", err);
    }
  }


// Barre de navigation : icône colorée si active, grise sinon
document.addEventListener('DOMContentLoaded', function() {
  const navBtns = document.querySelectorAll('.bottom-nav .nav-btn');
  navBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      navBtns.forEach(b => b.classList.remove('active'));
      this.classList.add('active');
      // Change l'icône si besoin
      document.querySelectorAll('.bottom-nav .nav-icon').forEach(icon => {
        const btnParent = icon.closest('.nav-btn');
        const isActive = btnParent.classList.contains('active');
        if (isActive) {
          icon.src = "icons/" + icon.dataset.active;
        } else {
          icon.src = "icons/" + icon.dataset.inactive;
        }
      });
    });
  });

  // Met l'Accueil actif par défaut
  document.getElementById('navHome').classList.add('active');
  document.querySelectorAll('.bottom-nav .nav-icon').forEach(icon => {
    const btnParent = icon.closest('.nav-btn');
    if (btnParent.classList.contains('active')) {
      icon.src = "icons/" + icon.dataset.active;
    } else {
      icon.src = "icons/" + icon.dataset.inactive;
    }
  });

  // Gestion de l'ouverture/fermeture de la modale profil
  const cardsContainer = document.getElementById('cardsContainer');
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  let currentProfile = null;

  // Simulation d’un écouteur pour les photos principales
  cardsContainer.addEventListener('click', function(e) {
    const photo = e.target.closest('.main-photo');
    if (photo) {
      const userId = photo.dataset.userId;
      // Charge les infos utilisateur et les photos supplémentaires
      showProfileModal(userId);
    }
  });

  closeProfileModal.addEventListener('click', function() {
    profileModal.style.display = 'none';
    document.body.style.overflow = '';
  });

  // Fonction pour afficher la modale avec photos verticales et infos
  function showProfileModal(userId) {
    // Remplacer cette partie par un appel AJAX pour charger les vraies données
    // Exemple de données simulées :
    const userData = {
      name: "Alice",
      age: 26,
      city: "Paris",
      distance: "3.1 km",
      compatibility: "72%",
      interests: ["Voyages", "Musique", "Animaux"],
      photos: [
        "uploads/profile1.jpg",
        "uploads/photo2.jpg",
        "uploads/photo3.jpg"
      ]
    };
    // Remplir la galerie verticale
    const gallery = document.getElementById('modalGallery');
    gallery.innerHTML = userData.photos.map(src => `<img src="${src}" alt="Photo">`).join("");
    // Remplir les infos
    const infos = document.getElementById('modalInfos');
    infos.innerHTML = `
      <div><b>${userData.name}, ${userData.age}</b></div>
      <div>📍 ${userData.city} — ${userData.distance}</div>
      <div>✨ ${userData.compatibility} de compatibilité</div>
      <div class="interests-list">
        ${userData.interests.map(int => `<span class="interest">${int}</span>`).join("")}
      </div>
    `;
    profileModal.style.display = 'flex';
    document.body.style.overflow = 'hidden';
  }
});
  
  fetchCurrentUserId();

  // Fonction d'ouverture du chat
  window.openChat = function (user) {
    currentChatUserId = user._id;
    chatUserName.textContent = user.name;
    chatUserPhoto.src = user.profilePicture || "/default.jpg";
    chatPopup.classList.remove("hidden");
    chatMessages.innerHTML = "";
    chatInput.value = "";
    loadOldMessages(user._id);
  };

  closeChatBtn.addEventListener("click", () => {
    chatPopup.classList.add("hidden");
    chatMessages.innerHTML = "";
    chatInput.value = "";
    currentChatUserId = null;
  });

  sendChatBtn.addEventListener("click", () => {
    const message = chatInput.value.trim();
    if (!message || !currentChatUserId || !currentUserId) return;

    socket.emit("sendMessage", {
      senderId: currentUserId,
      receiverId: currentChatUserId,
      message,
    });

    appendMessage(message, true);
    chatInput.value = "";
  });

  function handleIncomingMessage(data) {
  if (data.senderId === currentChatUserId) {
    appendMessage(data.message, false);
  } else {
    // Afficher le badge de notification si le chat n'est pas ouvert avec cet utilisateur
    const notification = document.getElementById("messageNotification");
    if (notification) {
      notification.classList.remove("hidden");

      // Clique sur le badge => recharge la conversation
      notification.onclick = async () => {
        try {
          // Appelle une route backend pour récupérer les infos de l'expéditeur
          const res = await fetch(`/api/users/${data.senderId}`, {
            headers: { Authorization: "Bearer " + token }
          });
          const user = await res.json();
          openChat(user); // ouvre le chat avec cet utilisateur
          notification.classList.add("hidden");
        } catch (err) {
          console.error("Erreur récupération profil expéditeur :", err);
        }
      };
    }

    console.log("📩 Nouveau message d'un autre utilisateur.");
  }
}


  function appendMessage(text, isSentByUser) {
    const div = document.createElement("div");
    div.className = "chat-message " + (isSentByUser ? "sent" : "received");
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }

  async function loadOldMessages(receiverId) {
    try {
      const res = await fetch(`/api/messages/${receiverId}`, {
        headers: { Authorization: "Bearer " + token },
      });
      if (!res.ok) throw new Error("Erreur de récupération des messages");

      const messages = await res.json();
      messages.forEach(msg => {
        appendMessage(msg.content, msg.sender === currentUserId);
      });
    } catch (err) {
      console.error("Erreur chargement messages:", err);
    }
  }

  function showNoMatchPopup() {
    const popup = document.getElementById("noMatchPopup");
    popup.classList.remove("hidden");

    const closeBtn = document.getElementById("closePopupBtn");
    if (closeBtn) {
      closeBtn.onclick = () => popup.classList.add("hidden");
    }
  }

  document.getElementById("sendMessageBtn")?.addEventListener("click", async () => {
    const message = document.getElementById("messageInput").value.trim();
    if (!message || !currentChatUserId) return;

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ receiverId: currentChatUserId, message }),
      });

      if (res.status === 403) {
        showNoMatchPopup();
        return;
      }

      if (res.ok) {
        const data = await res.json();
        appendMessage(data.data.content, true);
        document.getElementById("messageInput").value = "";
      }
    } catch (error) {
      console.error("Erreur lors de l'envoi du message:", error);
    }
  });

  window.closePopup = () => {
    const popup = document.getElementById("noMatchPopup");
    popup.classList.add("hidden");
  };

  // ✅ LOGIQUE DE LIKE + MATCH + CHAT AUTO
  async function handleLike(userId, userData) {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ likedUserId: userId }),
      });

      if (res.status === 201) {
        const result = await res.json();

        if (result.match === true) {
          console.log("🎉 Match mutuel avec", userData.name);
          openChat(userData); // 👈 Ouvre le chat automatiquement
        } else {
          console.log("Like enregistré sans match.");
        }
      } else {
        console.warn("Erreur lors du like.");
      }
    } catch (err) {
      console.error("Erreur lors du like :", err);
    }
  }

  // 👉 Tu peux appeler handleLike() depuis ici, ou depuis ton bouton ou ta logique de swipe :
  // Exemple (à adapter selon ton interface) :
  // document.getElementById("likeBtn").addEventListener("click", () => {
  //   const userData = {
  //     _id: profilIdAffiché,
  //     name: profilName,
  //     profilePicture: profilPhotoURL
  //   };
  //   handleLike(userData._id, userData);
  // });


  // ... (tout ton code existant au-dessus reste inchangé)

// LOGIQUE DE SWIPE (Swing.js)
const stack = Swing.Stack();

document.querySelectorAll('.swipe-card').forEach(cardElement => {
  stack.createCard(cardElement);
});

stack.on('throwout', (event) => {
  const direction = event.throwDirection.toString();
  const card = event.target;

  const profilId = card.dataset.userid;
  const profilName = card.dataset.username;
  const profilPhoto = card.dataset.userphoto;

  const userData = {
    _id: profilId,
    name: profilName,
    profilePicture: profilPhoto,
  };

  if (direction.includes('RIGHT')) {
    handleLike(profilId, userData);
  }

  // Supprimer la carte du DOM après le swipe
  card.remove();
});

// Optionnel : pour réinitialiser la pile de cartes après un certain nombre de swipes
function reloadProfiles() {
  // Recharger les profils depuis le backend si tu veux
  // ou afficher un message "plus de profils"
}


});
