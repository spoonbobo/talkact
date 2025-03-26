// docker compose restart kakashi-chat_server
const axios = require('axios');

// io: socket.io
// client: redis-client (ioredis client)
function setupSocketIO(io, client) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);
    
    // Get user information from socket handshake
    const userEmail = socket.handshake.auth.user.email;
    
    if (!userEmail) {
      console.error("No user email provided for socket connection");
      return;
    }
    
    // Update the user's socket ID in Redis
    client.set(`user:${userEmail}:socket`, socket.id);
    
    // Check if user has any rooms they belong to
    client.smembers(`user:${userEmail}:rooms`).then(async (rooms) => {
      // For each room the user belongs to, check for unread messages
      for (const roomId of rooms) {
        try {
          // Get unread messages for this user in this room
          const unreadMessages = await client.lrange(`room:${roomId}:unread:${userEmail}`, 0, -1);
          
          // Send unread messages to the user
          unreadMessages.forEach(msg => {
            try {
              const parsedMsg = JSON.parse(msg);
              socket.emit("message", parsedMsg);
            } catch (e) {
              console.error("Error parsing message:", e);
            }
          });
          
          // Clear unread messages after sending
          await client.del(`room:${roomId}:unread:${userEmail}`);
        } catch (err) {
          console.error(`Error processing unread messages for room ${roomId}:`, err);
        }
      }
    }).catch(err => {
      console.error("Error retrieving user rooms:", err);
    });

    socket.on("quit_room", (roomId) => {
      console.log("quit_room", roomId);
      
      // Remove user from room in Redis
      if (userEmail) {
        client.srem(`room:${roomId}:users`, userEmail);
        client.srem(`user:${userEmail}:rooms`, roomId);
      }
    });
    
    socket.on("join_room", (roomId) => {
      console.log("join_room", roomId);
      
      // Add user to room in Redis
      if (userEmail) {
        client.sadd(`room:${roomId}:users`, userEmail);
        client.sadd(`user:${userEmail}:rooms`, roomId);
      }
    });
    
    socket.on("message", async (data) => {
      // insert this message in the app db
      insertionMessageInAppDb(data);
      const roomId = data.room_id;

      try {
        // Get all users in this room
        const usersInRoom = await client.smembers(`room:${roomId}:users`);
        console.log("usersInRoom", usersInRoom);
        // For each user in the room
        for (const userEmail of usersInRoom) {
          // Get the user's socket ID
          const socketId = await client.get(`user:${userEmail}:socket`);
          
          if (socketId) {
            // User is active, send message directly
            io.to(socketId).emit("message", data);
            console.log("message sent to", socketId);
          } else {
            // User is not active, store message in Redis for later
            await client.lpush(`room:${roomId}:unread:${userEmail}`, JSON.stringify(data));
            console.log("message stored in Redis for", userEmail);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Remove socket ID from Redis, but keep room associations
      if (userEmail) {
        client.del(`user:${userEmail}:socket`);
      }
    });
  });
}

async function sendRecentMessages(socket, client) {
  try {
    const messages = await client.lrange("dummyQueue", 0, 9);
    messages.forEach((msg) => {
      try {
        const parsedMsg = JSON.parse(msg);
        socket.emit("queueData", parsedMsg);
      } catch (e) {
        console.error("Error parsing message:", e);
      }
    });
  } catch (err) {
    console.error("Error retrieving messages from Redis:", err);
  }
}

/*
resp {
  id: '1742981869884',
  room_id: '829a2b39-27b0-4dbb-bb12-50b595def2e8',
  sender: {
    name: 'Season',
    email: 'seasonluke@gmail.com',
    image: 'https://avatars.githubusercontent.com/u/73148791?v=4'
  },
  content: 'aaa',
  timestamp: '2025-03-26T09:37:49.884Z',
  avatar: 'https://avatars.githubusercontent.com/u/73148791?v=4'
}
*/
async function insertionMessageInAppDb(message) {
  const url = process.env.CLIENT_URL + "/api/chat/insert_message";
  const resp = await axios.post(url, message);
}


async function checkUnreadMessages(userId) {
  console.log("TODO:")
}

module.exports = { setupSocketIO };

