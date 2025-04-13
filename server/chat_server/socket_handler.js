// docker compose restart onlysaid-chat_server
const axios = require("axios");

// io: socket.io
// client: redis-client (ioredis client)
function setupSocketIO(io, client) {
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Get user information from socket handshake
    const userId = socket.handshake.auth.user.user_id;

    if (!userId) {
      console.error("No user ID provided for socket connection");
      return;
    }

    // Store socket ID in a set for this user (supports multiple connections)
    client.sadd(`user:${userId}:sockets`, socket.id);
    console.log(`Added socket ${socket.id} for user ${userId}`);

    // Check if user has any rooms they belong to
    client
      .smembers(`user:${userId}:rooms`)
      .then(async (rooms) => {
        // For each room the user belongs to, check for unread messages
        for (const roomId of rooms) {
          try {
            // Get unread messages for this user in this room
            const unreadMessages = await client.lrange(
              `room:${roomId}:unread:${userId}`,
              0,
              -1
            );

            // Send unread messages to the user
            unreadMessages.forEach((msg) => {
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
            console.error(
              `Error processing unread messages for room ${roomId}:`,
              err
            );
          }
        }
      })
      .catch((err) => {
        console.error("Error retrieving user rooms:", err);
      });

    socket.on("join_room", (roomId) => {
      console.log("join_room", roomId, userId);

      // Add user to room in Redis
      if (userId) {
        // Make sure these Redis operations are working
        client.sadd(`room:${roomId}:users`, userId)
          .then(() => {
            console.log(`Added user ${userId} to room ${roomId}`);
            return client.sadd(`user:${userId}:rooms`, roomId);
          })
          .then(() => {
            console.log(`Added room ${roomId} to user ${userId}'s rooms`);
          })
          .catch(err => {
            console.error(`Error adding user ${userId} to room ${roomId}:`, err);
          });
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
      console.log("message==============", data);
      insertionMessageInAppDb(data);
      const roomId = data.room_id;

      try {
        // Get all users in this room
        const usersInRoom = await client.smembers(`room:${roomId}:users`);
        console.log("sending msg to usersInRoom", usersInRoom);
        
        // For each user in the room
        for (const userId of usersInRoom) {
          // Get all socket IDs for this user
          const socketIds = await client.smembers(`user:${userId}:sockets`);
          console.log(`User ${userId} has ${socketIds.length} active connections`);

          if (socketIds.length > 0) {
            // User is active, send message to all their sockets
            socketIds.forEach(socketId => {
              io.to(socketId).emit("message", data);
              console.log(`Message sent to socket ${socketId} for user ${userId}`);
            });
          } else {
            // User is not active, store message in Redis for later
            await client.lpush(
              `room:${roomId}:unread:${userId}`,
              JSON.stringify(data)
            );
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
          console.log("allReceivers", allReceivers);
        } catch (error) {
          console.error(`Error getting users for room ${roomId}:`, error);
        }
      }

      // For each receiver in the notification
      for (const receiverId of allReceivers) {
        try {
          // Get all socket IDs for this user
          const socketIds = await client.smembers(`user:${receiverId}:sockets`);

          if (socketIds.length > 0) {
            // User is online, send notification to all their sockets
            socketIds.forEach(socketId => {
              io.to(socketId).emit("notification", data);
              console.log(`Notification sent to socket ${socketId} for user ${receiverId}`);
            });
          } else {
            console.log("No active sockets found for user", receiverId);
            // Handle offline users if needed
          }
        } catch (error) {
          console.error(
            `Error sending notification to user ${receiverId}:`,
            error
          );
        }
      }
    });

    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);

      // Remove this specific socket ID from the user's set of sockets
      if (userId) {
        client.srem(`user:${userId}:sockets`, socket.id);
        console.log(`Removed socket ${socket.id} for user ${userId}`);
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
  console.log("TODO:");
}

module.exports = { setupSocketIO };
