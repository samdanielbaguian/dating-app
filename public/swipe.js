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
