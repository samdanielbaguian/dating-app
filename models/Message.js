const mongoose = require("mongoose");

const MessageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['text', 'image'],
    default: 'text',
  },
  fileUrl: {
    type: String,
    default: '',
  },
  seen: {
    type: Boolean,
    default: false,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Index pour améliorer les performances des requêtes fréquentes (recherche par conversation)
MessageSchema.index({ sender: 1, receiver: 1, timestamp: -1 });

module.exports = mongoose.model("Message", MessageSchema);
