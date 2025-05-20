const jwt = require("jsonwebtoken");
const User = require("../models/User");
require("dotenv").config();

const authMiddleware = async (req, res, next) => {
    try {
        const authHeader = req.header("Authorization");

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            console.warn("⚠️ Requête sans token valide.");
            return res.status(401).json({ message: "Accès refusé. Token manquant ou mal formaté." });
        }

        const token = authHeader.replace("Bearer ", "").trim();
        const decoded = jwt.verify(token, process.env.JWT_SECRET);

        const user = await User.findById(decoded.id).select("-password");
        
        if (!user) {
            console.warn(`❌ Aucun utilisateur trouvé pour l'ID ${decoded.id}`);
            return res.status(404).json({ message: "Utilisateur non trouvé." });
        }

        req.user = user;  // Stocker l'utilisateur dans `req.user`
        console.log("✅ Utilisateur authentifié :", user._id);

        next();
    } catch (error) {
        if (error.name === "TokenExpiredError") {
            return res.status(401).json({ message: "Session expirée. Veuillez vous reconnecter." });
        } else {
            return res.status(401).json({ message: "Token invalide ou expiré." });
        }
    }
};

module.exports = authMiddleware;
