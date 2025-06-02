const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");
require("dotenv").config();
const connectDB = require("./config/db");

const session = require("express-session");
const Message = require("./models/Message"); // Pour sauvegarder les messages
const authRoutes = require("./routes/auth"); // Authentification (email + mot de passe)
const messageRoutes = require("./routes/messages"); // API pour messages HTTP
const matchingRoutes = require("./routes/matching"); // Importer matching.js
const User = require("./models/User"); // user info
const Match = require("./models/Match"); // creation d'un match
const uploadRoutes = require("./routes/upload");
const likeRoutes = require("./routes/likes");
const passport = require("passport");
const photoRoutes = require("./routes/photo");
require("./config/passport");
const conversationRoutes = require('./routes/conversationRoutes');
const photoRoutes = require("./routes/photo");




// Initialisation de l'application Express
const app = express();
const server = http.createServer(app); // Serveur HTTP pour socket.io

// Connexion WebSocket
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(passport.initialize()); //initialisation google identification
app.use(passport.session());
app.use(session({
    secret: "monSuperSecret", // à remplacer par une vraie clé secrète
    resave: false,
    saveUninitialized: false
  }));
// Connexion à la base de données MongoDB
connectDB();

// Route test
app.get("/", (req, res) => {
    res.send("Bienvenue sur l'API de l'application de rencontre !");
});

// Routes de l'application
app.use("/api/auth", authRoutes);       // Pour inscription / login / profil
app.use("/api/messages", messageRoutes); // Pour récupérer les anciens messages HTTP
app.use("/api/matches", matchingRoutes); // Enregistrer les routes de matching
app.use("/api/likes", likeRoutes);   
app.use("/api/upload", uploadRoutes);
app.use("/api/photo", photoRoutes);
app.use('/api', conversationRoutes);
   // pour les likes
// Socket.io : gestion en temps réel
io.on("connection", (socket) => {
    console.log(`🟢 Utilisateur connecté : ${socket.id}`);
    
    // Événement sendMessage
    socket.on("sendMessage", async ({ senderId, receiverId, message }) => {
        try {
            const sender = await User.findById(senderId);
            const receiver = await User.findById(receiverId);
            
            const isMatch = receiver.likes.includes(senderId) && sender.likes.includes(receiverId);
            const isPremium = sender.isPremium;
  
            if (!isMatch && !isPremium) {
                socket.emit("errorMessage", "Vous devez matcher ou être premium pour envoyer un message.");
                return;
            }
  
            // Enregistrement du message
            const newMsg = await Message.create({
                sender: senderId,
                receiver: receiverId,
                content: message
            });
  
            // Envoi au destinataire
            io.to(receiverId).emit(`receiveMessage:${receiverId}`, {
                senderId,
                message,
            });
  
            // Envoi de la notification au destinataire
          io.to(receiverId).emit("newNotification", {
            type: "message",
            content: `Nouveau message de ${sender.name}`,
            timestamp: new Date()
        });

        } catch (err) {
            console.error("Erreur Socket.io :", err);
        }
    });
  
    // Événement pour like et match
    socket.on("like", async (data) => {
        try {
            const { senderId, receiverId } = data;
            const senderUser = await User.findById(senderId);
            const receiverUser = await User.findById(receiverId);
  
            if (receiverUser.likes.includes(senderId)) {
                const match = new Match({
                    user1: senderId,
                    user2: receiverId
                });
                await match.save();
  
                io.to(senderId).emit("newMatch", { matchId: match._id, user: receiverUser });
                io.to(receiverId).emit("newMatch", { matchId: match._id, user: senderUser });
                console.log(`Match créé entre ${senderId} et ${receiverId}`);
            

// Envoi d'une notification de match
io.to(senderId).emit("newNotification", {
    type: "match",
    content: `Vous avez un match avec ${receiverUser.name}!`,
    timestamp: new Date()
});
io.to(receiverId).emit("newNotification", {
    type: "match",
    content: `Vous avez un match avec ${senderUser.name}!`,
    timestamp: new Date()
});
}

        }
        
        
        catch (err) {
            console.error("❌ Erreur lors de la gestion du like et du match:", err);
        }
    });
  
    socket.on("disconnect", () => {
        console.log(`🔴 Déconnexion : ${socket.id}`);
    });
  });
  

// Démarrage du serveur
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`🚀 Serveur lancé sur http://localhost:${PORT}`);
});
