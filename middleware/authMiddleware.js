const { verifyAccessToken } = require("../utils/jwt");
const User = require("../models/User");

module.exports = async function (req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Token manquant ou invalide." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id);
    if (!user) {
      return res.status(401).json({ message: "Utilisateur introuvable." });
    }
    req.user = {
      id: user._id.toString(),
      email: user.email,
      isPremium: user.isPremium,
      name: user.name,
    };
    next();
  } 
  catch (error) {
  console.error(error);
  return res.status(401).json({ message: "Token invalide ou expiré." });
}
};
