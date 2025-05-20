document.addEventListener("DOMContentLoaded", () => {
    const likeBtn = document.getElementById("likeBtn");
    const message = document.getElementById("likeMessage");
// Vérifie si un token est présent dans l'URL après redirection Google
const urlParams = new URLSearchParams(window.location.search);
const tokenFromUrl = urlParams.get("token");
    

    likeBtn.addEventListener("click", async () => {
        likeBtn.disabled = true;
        message.textContent = "❤️ Envoi en cours...";

        // Fonction pour récupérer le prochain profil dynamique
        async function fetchProfile() {
            const response = await fetch("/api/profiles/next", {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                }
            });
            if (tokenFromUrl) {
                localStorage.setItem("token", tokenFromUrl); // Stocke le token
                // Optionnel : redirige proprement pour enlever le token de l’URL
                window.history.replaceState({}, document.title, "/");
            }
            if (!response.ok) {
                console.error("Erreur lors de la récupération du profil");
                return;
            } 

            const profile = await response.json();


            
                const swipeLeftBtn = document.getElementById("swipeLeftBtn");
                const swipeRightBtn = document.getElementById("swipeRightBtn");
                const profileCard = document.getElementById("profileCard");
            
                // Fonction pour gérer l'action de swipe
                const handleSwipe = (direction) => {
                    if (direction === 'left') {
                        profileCard.classList.add('swiped-left');
                        // Logique pour gérer le rejet du profil (par exemple, ne pas ajouter de like)
                    } else if (direction === 'right') {
                        profileCard.classList.add('swiped-right');
                        // Logique pour gérer l'ajout du like, et éventuellement vérifier un match
                    }
            
                    // Après l'animation, récupérer un nouveau profil
                    setTimeout(() => {
                        // Recharger ou afficher un nouveau profil
                        loadNextProfile();
                    }, 300); // Attendre la fin de l'animation
                };
            
                // Écouteurs d'événements pour les boutons de swipe
                swipeLeftBtn.addEventListener('click', () => handleSwipe('left'));
                swipeRightBtn.addEventListener('click', () => handleSwipe('right'));
            
                // Fonction pour charger un profil suivant
                const loadNextProfile = async () => {
                    // Exemple de récupération d'un profil suivant via l'API
                    const response = await fetch('/api/profiles/next', {
                        method: 'GET',
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem("token")}`,
                        },
                    });
                    
                    if (!response.ok) {
                        console.error('Erreur lors de la récupération du profil');
                        return;
                    }
            
                    const profile = await response.json();
                    // Mettre à jour la page avec les données du profil suivant
                    document.getElementById('profileName').textContent = `${profile.name}, ${profile.age}`;
                    document.getElementById('profileBio').textContent = profile.bio;
                    document.getElementById('profilePhoto').src = profile.photo;
                };
            
            

            
            // Mettre à jour dynamiquement le profil dans profile.js
            currentProfile = profile;
            document.getElementById("profileName").textContent = profile.name;
            document.getElementById("profileBio").textContent = profile.bio;
            document.getElementById("profilePhoto").src = profile.photo;
        }

        // Appeler la fonction pour charger un nouveau profil
        await fetchProfile();

        try {
            // Utiliser l'ID du profil dynamique
            const res = await fetch(`/api/likes/like/${currentProfile._id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${localStorage.getItem("token")}`,
                },
            });

            const data = await res.json();

            if (response.ok) {
                message.textContent = data.message || "❤️ Vous avez aimé ce profil !";

                // Émettre un événement de like via WebSocket
                const senderId = localStorage.getItem("userId");
                const receiverId = data.likedUserId;  // L'ID de l'utilisateur liké
                socket.emit("like", { senderId, receiverId });
            } else {
                message.textContent = data.message || "❌ Erreur lors du like";
            }
        } catch (err) {
            console.error(err);
            message.textContent = "❌ Erreur de connexion.";
        } finally {
            setTimeout(() => {
                likeBtn.disabled = false;
                message.textContent = "❤️ J'aime";
            }, 2000);
        }
    });

    // Écouter les événements de match via WebSocket
    socket.on("newMatch", (data) => {
        // Afficher une notification ou un popup de match
        const matchMessage = `Félicitations ! Vous avez un match avec ${data.user.name}! 🎉`;
        alert(matchMessage);  // Simple alert, peut être remplacé par une notification plus jolie
    });

    // Code pour gérer les notifications en temps réel
const socket = io();

// Recevoir les notifications
socket.on("newNotification", (data) => {
    const notificationContainer = document.getElementById("notification-container");

    // Créer un élément de notification
    const notification = document.createElement("div");
    notification.classList.add("notification");

    // Ajouter le contenu de la notification
    notification.innerHTML = `
        <span>${data.content}</span>
        <span class="close" onclick="this.parentElement.remove()">×</span>
    `;
    if (data.type === "match") {
        notification.classList.add("match");
    } else if (data.type === "error") {
        notification.classList.add("error");
    }

    // Ajouter la notification au conteneur
    notificationContainer.appendChild(notification);

    // Supprimer la notification après 5 secondes
    setTimeout(() => {
        notification.remove();
    }, 5000);
});


});
