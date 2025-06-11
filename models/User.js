const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true },
  password: {
    type: String,
    required: function () { return !this.googleId; },
  },
  refreshTokens: { type: [String], default: [] },
  
  profilePictures: { type: [String], default: [] },
  location: {
    type: { type: String, default: "Point" },
    coordinates: { type: [Number], index: "2dsphere" }, // [longitude, latitude]
    city: String,
    district: String,
  },
  bio: { type: String, default: "" },
  distanceMax: { type: Number, default: 10 },
  isPremium: { type: Boolean, default: false },
  preferences: {
    ageRange: {
      min: { type: Number, default: 18 },
      max: { type: Number, default: 99 },
    },
  },
  relationshipType: {
  type: [String],
  enum: ["Long terme", "Court terme", "Pour le fun"],
  default: ["Long terme"]
},
  dateOfBirth: { type: Date },
 genderPreference: {
  type: [String],
  enum: ["Male", "Female", "Both"],
  default: ["Both"]
},
  likes: [
    { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  ],
  languages: { type: [String], default: [] },
  twoFactorEnabled: { type: Boolean, default: false },
  twoFactorSecret: { type: String },
  twoFactorTempSecret: { type: String },
  twoFactorEmailLastSentAt: { type: Date },
  refreshTokens: { type: [String], default: [] },
  googleId: { type: String }, // utilisateur créé via Google

  // --------- AJOUTS POUR MESSAGERIE AVANCÉE ---------
  // Préférence : refuser les messages d'utilisateurs qui ne sont pas un match
  blockNonMatchMessages: { type: Boolean, default: false },

  // Log des nouveaux contacts non-match approchés (pour quota premium)
  // Chaque entrée : { userId: ObjectId, date: Date }
  nonMatchContactsLog: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    date: { type: Date, default: Date.now }
  }],
}, { timestamps: true }); // Ajoute createdAt et updatedAt

// Index géospatial
UserSchema.index({ location: "2dsphere" });

/**
 * 🔐 Hash du mot de passe avant enregistrement
 */
UserSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
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

/**
 * Méthode pour renvoyer un user “propre” au client (sans infos sensibles)
 */
UserSchema.methods.toSafeObject = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.refreshTokens;
  delete obj.twoFactorSecret;
  delete obj.twoFactorTempSecret;
  delete obj.nonMatchContactsLog; // Ne jamais exposer ce log côté client
  // Ajoute d’autres champs sensibles ici si besoin
  return obj;
};

module.exports = mongoose.model("User", UserSchema);
