const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  password: {
    type: String,
    // ⚠️ Certains utilisateurs OAuth n'ont pas de mot de passe
    required: function () {
      return !this.googleId;
    },
  },
  profilePictures: {
    type: [String],
    default: [],
  },
  location: {
    type: { type: String, default: "Point" },
    coordinates: {
      type: [Number],
      index: "2dsphere",
    },
    city: String,
    district: String,
  },
  bio: {
    type: String,
    default: "",
  },
  distanceMax: {
    type: Number,
    default: 10,
  },
  isPremium: {
    type: Boolean,
    default: false,
  },
  preferences: {
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 99 },
    },
  },
  relationshipType: {
    type: String,
    enum: ["Long terme", "Court terme", "Pour le fun"],
    default: "Long terme",
  },
  dateOfBirth: {
    type: Number,
  },
  genderPreference: {
    type: String,
    enum: ["Male", "Female", "Both"],
    default: "Both",
  },
  likes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  languages: {
    type: [String],
    default: [],
  },
  twoFactorEnabled: { type: Boolean, default: false },
twoFactorSecret: { type: String },

twoFactorTempSecret: { type: String },
twoFactorEmailLastSentAt: { type: Date },

refreshTokens: {
  type: [String],
  default: [],
},

  createdAt: {
    type: Date,
    default: Date.now,
  },
  googleId: {
    type: String, // Ajout si utilisateur créé via Google
  },
});

// Index géospatial
UserSchema.index({ location: "2dsphere" });

/**
 * 🔐 Hash du mot de passe avant enregistrement
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next(); // Si le mot de passe n'est pas modifié, ne rien faire

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * 🔍 Méthode de comparaison pour vérifier un mot de passe
 */
UserSchema.methods.comparePassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

module.exports = mongoose.model("User", UserSchema);
