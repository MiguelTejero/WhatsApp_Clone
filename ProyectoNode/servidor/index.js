const express = require("express");
const { createServer } = require("http");
const path = require("path");
const socketIo = require("socket.io");
const cors = require("cors");

const app = express();
const server = createServer(app);
const io = socketIo(server, { cors: { origin: "*" } });

app.use(cors());
app.use(express.static(path.join(__dirname, "../public")));

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

let users = {}; // Almaceno los usuarios y su información

// Manejo de conexión de socket
io.on("connection", (socket) => {
  console.log("Nuevo usuario conectado", socket.id);

  socket.on("register", (userData) => {
    users[socket.id] = {
      name: userData.name,
      profilePicUrl: userData.profilePicUrl,
      status: userData.status,
    };

    io.emit("updateUserList", Object.values(users)); // Enviar lista de usuarios
    io.emit("message", { system: true, text: `${userData.name} se ha unido al chat.` }); // Notificación de nuevo usuario
  });

  // Recibir mensaje y enviarlo a todos
  socket.on("sendMessage", (message) => {
    if (users[socket.id]) {
      io.emit("message", {
        user: users[socket.id],
        text: message.text
      });
    }
  });

  // Recibir archivo y enviarlo a todos
  socket.on("sendFile", (fileData) => {
    if (users[socket.id]) {
      io.emit("fileMessage", {
        user: users[socket.id],
        file: fileData.file,
        name: fileData.name,
        type: fileData.type
      });
    }
  });

  // Notificación de "está escribiendo"
  socket.on("typing", (isTyping) => {
    if (users[socket.id]) {
      socket.broadcast.emit("typing", {
        user: users[socket.id],
        isTyping: isTyping
      });
    }
  });

  // Manejo de desconexión de un usuario
  socket.on("disconnect", () => {
    if (users[socket.id]) {
      let disconnectedUser = users[socket.id];
      delete users[socket.id]; // Elimino al usuario desconectado
      io.emit("updateUserList", Object.values(users)); // Actualizo lista de usuarios
      io.emit("message", { system: true, text: `${disconnectedUser.name} se ha desconectado.` }); // Notificación de desconexión
    }
  });
});

server.listen(3000, () => {
  console.log("Servidor funcionando en http://localhost:3000");
});
