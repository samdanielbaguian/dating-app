const express = require("express");
const router = express.Router();
const User = require("../models/User");  // Modèle pour accéder aux utilisateurs
const authMiddleware = require("../middleware/authMiddleware");


// Fonction de distance Haversine pour calculer la distance entre deux coordonnées géographiques
function haversineDistance(coord1, coord2) {
    const R = 6371; // Rayon de la Terre en kilomètres
    const dLat = (coord2[1] - coord1[1]) * (Math.PI / 180);
    const dLon = (coord2[0] - coord1[0]) * (Math.PI / 180);
    
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(coord1[1] * (Math.PI / 180)) * Math.cos(coord2[1] * (Math.PI / 180)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance en kilomètres
    return distance;
}

// Fonction pour obtenir les utilisateurs correspondants selon les critères
const getMatchingUsers = (user, usersList) => {
    const matchingUsers = usersList.filter(u => {
        const isGenderMatch = user.genderPreference === u.gender || user.genderPreference === 'Both';
        const isAgeMatch = Math.abs(new Date(user.dateOfBirth).getFullYear() - new Date(u.dateOfBirth).getFullYear()) <= 5; // Match des âges
        const isRelationshipTypeMatch = user.relationshipType === u.relationshipType; // Vérifier si le type de relation est le même
        
        const distance = haversineDistance(user.location.coordinates, u.location.coordinates); // Calculer la distance entre les utilisateurs
        const isDistanceMatch = distance <= user.distanceMax; // Vérifier si la distance est dans le rayon de matching
        
        return isGenderMatch && isAgeMatch && isRelationshipTypeMatch && isDistanceMatch;
    });
    
    return matchingUsers;
};

// Route pour obtenir les matchs
router.get("/match",authMiddleware,async (req, res) => {
    console.log("🔍 Requête matching pour :", req.user.id);

    try {
        const userId = req.user.id;
        const currentUser = await User.findById(userId);

        if (!currentUser || !currentUser.location) {
            return res.status(400).json({ message: "Utilisateur ou localisation non disponible." });
        }

        const radiusInKm = parseInt(req.query.radius) || 50;
        const radiusInMeters = radiusInKm * 1000;

        const currentYear = new Date().getFullYear();
        const minBirthDate = new Date(new Date().setFullYear(currentYear - currentUser.preferences.ageRange.max));
        const maxBirthDate = new Date(new Date().setFullYear(currentYear - currentUser.preferences.ageRange.min));

        // 🎯 Matching principal (précis)
        let matches = await User.find({
            _id: { $ne: userId },
            genderPreference: { $in: [currentUser.genderPreference, "Both"] },
            relationshipType: currentUser.relationshipType,
            dateOfBirth: { $gte: minBirthDate, $lte: maxBirthDate },
            location: {
                $near: {
                    $geometry: currentUser.location,
                    $maxDistance: radiusInMeters,
                }
            }
        }).select("-password");

        // Utilisation de la fonction getMatchingUsers
        matches = getMatchingUsers(currentUser, matches);

        // 😕 Si aucun résultat → matching par défaut (moins strict)
        if (matches.length === 0) {
            console.log("🔁 Aucun match précis, recherche de fallback...");

            matches = await User.find({
                _id: { $ne: userId },
                genderPreference: { $in: [currentUser.genderPreference, "Both"] },
                relationshipType: currentUser.relationshipType // Ajout du type de relation
            })
            .limit(10)
            .select("-password");

            return res.json({ 
                message: "Aucun match précis trouvé, voici quelques profils suggérés.", 
                fallback: true,
                matches 
            });
        }

        res.json({ message: "Matches trouvés.", fallback: false, matches });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
