const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const OtpSchema = new mongoose.Schema({
  phone: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // expire après 5 minutes
  },
});

// 🔒 Hasher automatiquement le champ otp avant de sauvegarder
OtpSchema.pre("save", async function (next) {
  if (!this.isModified("otp")) return next();

  try {
    const salt = await bcrypt.genSalt(10);
    this.otp = await bcrypt.hash(this.otp, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// 🔍 Méthode personnalisée pour comparer un OTP avec le hash
OtpSchema.methods.compareOtp = async function (enteredOtp) {
  return bcrypt.compare(enteredOtp, this.otp);
};

module.exports = mongoose.model("Otp", OtpSchema);
