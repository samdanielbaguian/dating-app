document.addEventListener("DOMContentLoaded", () => {
    const profileName = document.getElementById("profileName");
    const profileBio = document.getElementById("profileBio");
    const profilePhoto = document.getElementById("profilePhoto");
    const message = document.getElementById("likeMessage");
    const likeBtn = document.getElementById("likeBtn");

    const token = localStorage.getItem("token");
    let currentProfile = null;

    if (!profileName || !profileBio || !profilePhoto || !message || !likeBtn) {
        console.error("❌ Certains éléments du DOM sont introuvables.");
        return;
    }

    // 🔍 Vérifie si un userId est présent dans l'URL
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromURL = urlParams.get("userId");

    async function fetchProfile() {
        try {
            const endpoint = userIdFromURL
                ? `/api/users/${userIdFromURL}` // Profil spécifique
                : `/api/profiles/suggestions`;  // Suggestion aléatoire

            const res = await fetch(endpoint, {
                headers: { "Authorization": `Bearer ${token}` }
            });

            if (!res.ok) throw new Error("Erreur lors de la récupération du profil.");

            const profile = await res.json();
            currentProfile = profile;

            profileName.textContent = profile.name;
            profileBio.textContent = profile.bio;
            profilePhoto.src = profile.profilePictures?.[0] || "/default.jpg";

            // Désactiver le bouton like si on consulte un profil via userId
            if (userIdFromURL) {
                likeBtn.style.display = "none";
                message.textContent = "";
            }

        } catch (err) {
            console.error("❌ Erreur chargement profil :", err);
            profileName.textContent = "Profil indisponible";
        }
    }

    likeBtn.addEventListener("click", async () => {
        if (!currentProfile) return;

        likeBtn.disabled = true;
        message.textContent = "❤️ Envoi en cours...";

        try {
            const res = await fetch(`/api/likes/like/${currentProfile._id}`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });

            const data = await res.json();
            message.textContent = res.ok ? data.message : "❌ Erreur lors du like";

            if (res.ok && !userIdFromURL) {
                await fetchProfile(); // charge un autre profil seulement si pas via URL
            }

        } catch (err) {
            console.error("❌ Erreur réseau :", err);
            message.textContent = "❌ Erreur de connexion.";
        } finally {
            setTimeout(() => {
                likeBtn.disabled = false;
                message.textContent = "❤️ J'aime";
            }, 2000);
        }
    });

    fetchProfile();
});
