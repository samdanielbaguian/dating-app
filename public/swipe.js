document.addEventListener("DOMContentLoaded", function() {
  // ========= Variables globales =========
  const socket = io();
  const token = localStorage.getItem("token");
  let currentUserId = null;
  let currentChatUserId = null;

  // --- DOM Elements principaux ---
  const chatPopup = document.getElementById("chatPopup");
  const chatUserPhoto = document.getElementById("chatUserPhoto");
  const chatUserName = document.getElementById("chatUserName");
  const chatMessages = document.getElementById("chatMessages");
  const chatInput = document.getElementById("chatInput");
  const sendChatBtn = document.getElementById("sendChatBtn");
  const closeChatBtn = document.getElementById("closeChatBtn");

  // Navigation barre
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
  const navHome = document.getElementById('navHome');
  if (navHome) navHome.classList.add('active');
  document.querySelectorAll('.bottom-nav .nav-icon').forEach(icon => {
    const btnParent = icon.closest('.nav-btn');
    if (btnParent.classList.contains('active')) {
      icon.src = "icons/" + icon.dataset.active;
    } else {
      icon.src = "icons/" + icon.dataset.inactive;
    }
  });

  // ========== MODALE PROFIL & GALERIE VERTICALE ==========
  const cardsContainer = document.getElementById('cardsContainer');
  const profileModal = document.getElementById('profileModal');
  const closeProfileModal = document.getElementById('closeProfileModal');
  let currentProfile = null;

  if (cardsContainer) {
    cardsContainer.addEventListener('click', function(e) {
      const photo = e.target.closest('.main-photo');
      if (photo) {
        const userId = photo.dataset.userId;
        showProfileModal(userId);
      }
    });
  }

  if (closeProfileModal) {
    closeProfileModal.addEventListener('click', function() {
      profileModal.style.display = 'none';
      document.body.style.overflow = '';
    });
  }

  function showProfileModal(userId) {
    // Remplacer par appel AJAX pour charger les vraies données
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
    if (gallery) {
      gallery.innerHTML = userData.photos.map(src => `<img src="${src}" alt="Photo">`).join("");
    }
    // Remplir les infos
    const infos = document.getElementById('modalInfos');
    if (infos) {
      infos.innerHTML = `
        <div><b>${userData.name}, ${userData.age}</b></div>
        <div>📍 ${userData.city} — ${userData.distance}</div>
        <div>✨ ${userData.compatibility} de compatibilité</div>
        <div class="interests-list">
          ${userData.interests.map(int => `<span class="interest">${int}</span>`).join("")}
        </div>
      `;
    }
    if (profileModal) {
      profileModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    }
  }

  // ========== CHAT & SOCKETS ==========
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
  fetchCurrentUserId();

  // Ouverture de chat
  window.openChat = function (user) {
    currentChatUserId = user._id;
    if (chatUserName) chatUserName.textContent = user.name;
    if (chatUserPhoto) chatUserPhoto.src = user.profilePicture || "/default.jpg";
    if (chatPopup) chatPopup.classList.remove("hidden");
    if (chatMessages) chatMessages.innerHTML = "";
    if (chatInput) chatInput.value = "";
    loadOldMessages(user._id);
  };

  if (closeChatBtn) {
    closeChatBtn.addEventListener("click", () => {
      if (chatPopup) chatPopup.classList.add("hidden");
      if (chatMessages) chatMessages.innerHTML = "";
      if (chatInput) chatInput.value = "";
      currentChatUserId = null;
    });
  }

  if (sendChatBtn) {
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
  }

  function handleIncomingMessage(data) {
    if (data.senderId === currentChatUserId) {
      appendMessage(data.message, false);
    } else {
      // Afficher badge notification
      const notification = document.getElementById("messageNotification");
      if (notification) {
        notification.classList.remove("hidden");
        notification.onclick = async () => {
          try {
            const res = await fetch(`/api/users/${data.senderId}`, {
              headers: { Authorization: "Bearer " + token }
            });
            const user = await res.json();
            openChat(user);
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
    if (!chatMessages) return;
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
    if (popup) {
      popup.classList.remove("hidden");
      const closeBtn = document.getElementById("closePopupBtn");
      if (closeBtn) {
        closeBtn.onclick = () => popup.classList.add("hidden");
      }
    }
  }

  const sendMessageBtn = document.getElementById("sendMessageBtn");
  if (sendMessageBtn) {
    sendMessageBtn.addEventListener("click", async () => {
      const messageInput = document.getElementById("messageInput");
      const message = messageInput.value.trim();
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
          messageInput.value = "";
        }
      } catch (error) {
        console.error("Erreur lors de l'envoi du message:", error);
      }
    });
  }

  window.closePopup = () => {
    const popup = document.getElementById("noMatchPopup");
    if (popup) popup.classList.add("hidden");
  };

  // ========== LIKE + MATCH ==========
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
          openChat(userData);
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

  // ========== SWING.JS ==========
  // Assure-toi que les cartes '.swipe-card' sont dans le DOM AVANT ce code !
  if (typeof Swing !== "undefined") {
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

    // Optionnel : fonction pour recharger les profils
    function reloadProfiles() {
      // À implémenter si besoin
    }
  }
});
