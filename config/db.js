const mongoose = require("mongoose");
require("dotenv").config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        console.log("✅ MongoDB connecté !");
    } catch (err) {
        console.error("❌ Erreur de connexion MongoDB :", err.message);
        process.exit(1); // Arrête le processus si la connexion échoue
    }
};

module.exports = connectDB;
