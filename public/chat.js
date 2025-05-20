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
  const messageNotification = document.getElementById("messageNotification");

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

  window.openChat = function (user) {
    currentChatUserId = user._id;
    chatUserName.textContent = user.name;
    chatUserPhoto.src = user.profilePicture || "/default.jpg";
    chatPopup.classList.remove("hidden");
    chatMessages.innerHTML = "";
    chatInput.value = "";
    loadOldMessages(user._id); 

    // Cacher la notification si elle est visible
    if (messageNotification) {
      messageNotification.classList.add("hidden");
    }
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

  // ✅ ENVOI PAR TOUCHE ENTRÉE
  chatInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") sendChatBtn.click();
  });

  function handleIncomingMessage(data) {
    if (data.senderId === currentChatUserId) {
      appendMessage(data.message, false);
    } else {
      console.log("📩 Nouveau message d'un autre utilisateur.");
      if (messageNotification) {
        messageNotification.classList.remove("hidden");
      }
    }
  }

  function appendMessage(text, isSentByUser) {
    const div = document.createElement("div");
    div.className = "chat-message " + (isSentByUser ? "sent" : "received");
    div.textContent = text;
    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;
  }


 async function loadRecipientInfo() {
  try {
    const res = await fetch(`/api/users/${receiverId}`, {
      headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('token')
      }
    });

    if (!res.ok) throw new Error("Impossible de récupérer le profil");

    const user = await res.json();

    document.getElementById("recipientName").textContent = user.name || "Utilisateur";
    document.getElementById("recipientPhoto").src = user.profilePictures?.[0] || "default.jpg";

    const recipientLink = document.getElementById("recipientLink");
    recipientLink.href = `/profile.html?userId=${receiverId}`;
  } catch (err) {
    console.error("Erreur chargement destinataire:", err);
  }
}


window.onload = () => {
  loadMessages();
  loadRecipientInfo(); // ajouter ça ici
};


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
});
 