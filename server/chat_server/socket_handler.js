// docker compose restart kakashi-chat_server
const axios = require('axios');

// io: socket.io
// client: redis-client (ioredis client)
function setupSocketIO(io, client) {
  io.on("connection", (socket) => {
    // console.log(`Client connected: ${socket.id}`);
    
    // Get user information from socket handshake
    const userId = socket.handshake.auth.user.user_id;
    
    if (!userId) {
      console.error("No user ID provided for socket connection");
      return;
    }
    
    // Update the user's socket ID in Redis
    client.set(`user:${userId}:socket`, socket.id);
    
    // Check if user has any rooms they belong to
    client.smembers(`user:${userId}:rooms`).then(async (rooms) => {
      // For each room the user belongs to, check for unread messages
      for (const roomId of rooms) {
        try {
          // Get unread messages for this user in this room
          const unreadMessages = await client.lrange(`room:${roomId}:unread:${userId}`, 0, -1);
          
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
          await client.del(`room:${roomId}:unread:${userId}`);
        } catch (err) {
          console.error(`Error processing unread messages for room ${roomId}:`, err);
        }
      }
    }).catch(err => {
      console.error("Error retrieving user rooms:", err);
    });

    socket.on("join_room", (roomId) => {
      console.log("join_room", roomId, userId);
      
      // Add user to room in Redis
      if (userId) {
        client.sadd(`room:${roomId}:users`, userId);
        client.sadd(`user:${userId}:rooms`, roomId);
      }
    });

    socket.on("invite_to_room", (data) => {
      console.log("invite_to_room", data);

      // send invite to room to users
      const { roomId, userIds } = data;
      for (const userId of userIds) {
        client.sadd(`room:${roomId}:users`, userId);
        client.sadd(`user:${userId}:rooms`, roomId);
      }
    });

    socket.on("quit_room", (roomId) => {
      console.log("quit_room", roomId);
      
      // Remove user from room in Redis
      if (userId) {
        client.srem(`room:${roomId}:users`, userId);
        client.srem(`user:${userId}:rooms`, roomId);
      }
    });
    
    socket.on("message", async (data) => {
      // insert this message in the app db
      insertionMessageInAppDb(data);
      const roomId = data.room_id;

      try {
        // Get all users in this room
        const usersInRoom = await client.smembers(`room:${roomId}:users`);
        console.log("sending msg to usersInRoom", usersInRoom);
        // For each user in the room
        for (const userId of usersInRoom) {
          // Get the user's socket ID
          const socketId = await client.get(`user:${userId}:socket`);
          
          if (socketId) {
            // User is active, send message directly
            io.to(socketId).emit("message", data);
            console.log("message sent to", socketId);
          } else {
            // User is not active, store message in Redis for later
            await client.lpush(`room:${roomId}:unread:${userId}`, JSON.stringify(data));
            console.log("message stored in Redis for", userId);
          }
        }
      } catch (error) {
        console.error("Error processing message:", error);
      }
    });

    socket.on("notification", async (data) => {
      console.log("notification", data);
      const roomId = data.room_id;
      // Array to store all receiver IDs
      let allReceivers = [];
      
      // Check if direct receivers array exists
      if (data.receivers && Array.isArray(data.receivers)) {
        allReceivers = [...data.receivers];
      }
      console.log(roomId);
      
      // Check if roomId exists - get all users in the room
      if (roomId) {
        try {
          const roomUsers = await client.smembers(`room:${roomId}:users`);
          // Add room users to receivers list (avoiding duplicates)
          allReceivers = [...new Set([...allReceivers, ...roomUsers])];
          console.log('allReceivers', allReceivers)
        } catch (error) {
          console.error(`Error getting users for room ${roomId}:`, error);
        }
      }
      
      // For each receiver in the notification
      for (const receiverId of allReceivers) {
        try {
          // Get the receiver's socket ID from Redis
          const socketId = await client.get(`user:${receiverId}:socket`);
          
          if (socketId) {
            console.log("socketId", socketId);
            // User is online, send notification directly
            io.to(socketId).emit("notification", data);
            // console.log(`Notification sent to user ${receiverId} via socket ${socketId}`);
          } else {
            console.log("socketId not found for", receiverId);
            // // User is offline, store notification for later delivery
            // // You might want to implement a storage mechanism similar to unread messages
            // await client.lpush(`user:${receiverId}:unread_notifications`, JSON.stringify(data));
            // console.log(`Notification stored for offline user ${receiverId}`);
          }
        } catch (error) {
          console.error(`Error sending notification to user ${receiverId}:`, error);
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
      
      // Remove socket ID from Redis, but keep room associations
      if (userId) {
        client.del(`user:${userId}:socket`);
      }
    });
  });
}

// TODO: not needed for now as we are loading all messages in db anyways.
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

async function insertionMessageInAppDb(message) {
  const url = process.env.CLIENT_URL + "/api/chat/insert_message";
  const resp = await axios.post(url, message);
}


async function checkUnreadMessages(userId) {
  console.log("TODO:")
}

module.exports = { setupSocketIO };

