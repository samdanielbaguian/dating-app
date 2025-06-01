const jwt = require("jsonwebtoken");

const ACCESS_TOKEN_EXPIRE = "15m"; // Durée de vie du access token
const REFRESH_TOKEN_EXPIRE = "7d"; // Durée de vie du refresh token

function generateAccessToken(user) {
  return jwt.sign(
    { id: user._id, email: user.email, isPremium: user.isPremium },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRE }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user._id },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: REFRESH_TOKEN_EXPIRE }
  );
}

function verifyAccessToken(token) {
  return jwt.verify(token, process.env.JWT_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
};
