// docker compose restart onlysaid-chat_server
const axios = require("axios");

// Make sure these are at the very top of your file, outside any functions or blocks
const MAX_CONNECTIONS_PER_USER = 5;
const CONNECTION_TIMEOUT = 12 * 60 * 60 * 1000; // 12 hours
const connectionTimestamps = new Map();

// io: socket.io
// client: redis-client (ioredis client)
function setupSocketIO(io, client) {
  io.on("connection", async (socket) => {
    try {
      // Get user information from auth
      const user = socket.handshake.auth.user;
      console.log("user", user);
      if (!user || !user.id) {
        console.log("Socket connection rejected: No valid user provided");
        socket.disconnect(true);
        return;
      }

      const userId = user.id;
      console.log(`User ${userId} connected with socket ${socket.id}`);

      // Store connection timestamp
      connectionTimestamps.set(socket.id, Date.now());

      // Get existing socket connections for this user
      const userSockets = await client.smembers(`user:${userId}:sockets`);
      console.log(`User ${userId} has ${userSockets.length} existing connections`);

      // Clean up stale connections
      if (userSockets.length > 0) {
        for (const existingSocketId of userSockets) {
          // Check if this socket is still connected
          const connectedSocket = io.sockets.sockets.get(existingSocketId);
          
          if (!connectedSocket) {
            // Socket no longer exists, remove from Redis
            console.log(`Removing stale socket ${existingSocketId} for user ${userId}`);
            await client.srem(`user:${userId}:sockets`, existingSocketId);
          } else {
            // Check if this connection is too old
            const timestamp = connectionTimestamps.get(existingSocketId);
            if (timestamp && (Date.now() - timestamp > CONNECTION_TIMEOUT)) {
              console.log(`Disconnecting expired socket ${existingSocketId} for user ${userId}`);
              connectedSocket.disconnect(true);
              await client.srem(`user:${userId}:sockets`, existingSocketId);
              connectionTimestamps.delete(existingSocketId);
            }
          }
        }
      }

      // Get updated socket count after cleanup
      const updatedUserSockets = await client.smembers(`user:${userId}:sockets`);
      
      // If user still has too many connections, disconnect oldest ones
      if (updatedUserSockets.length >= MAX_CONNECTIONS_PER_USER) {
        console.log(`User ${userId} has too many connections (${updatedUserSockets.length}), cleaning up`);
        
        // Get timestamps for all connections
        const socketTimestamps = updatedUserSockets
          .map(sid => ({ 
            socketId: sid, 
            timestamp: connectionTimestamps.get(sid) || Infinity 
          }))
          .sort((a, b) => a.timestamp - b.timestamp); // Sort by oldest first
        
        // Keep only the newest MAX_CONNECTIONS_PER_USER - 1 connections (plus the current one)
        const socketsToRemove = socketTimestamps.slice(0, socketTimestamps.length - MAX_CONNECTIONS_PER_USER + 1);
        
        for (const { socketId } of socketsToRemove) {
          const oldSocket = io.sockets.sockets.get(socketId);
          if (oldSocket) {
            console.log(`Disconnecting excess socket ${socketId} for user ${userId}`);
            oldSocket.disconnect(true);
          }
          await client.srem(`user:${userId}:sockets`, socketId);
          connectionTimestamps.delete(socketId);
        }
      }

      // Add this socket to the user's set of sockets
      await client.sadd(`user:${userId}:sockets`, socket.id);

      // Handle disconnection
      socket.on("disconnect", async () => {
        console.log(`User ${userId} disconnected socket ${socket.id}`);
        
        // Remove this socket from the user's set of sockets
        await client.srem(`user:${userId}:sockets`, socket.id);
        connectionTimestamps.delete(socket.id);
        
        // Check if user has any remaining sockets
        const remainingSockets = await client.smembers(`user:${userId}:sockets`);
        if (remainingSockets.length === 0) {
          console.log(`User ${userId} has no remaining connections`);
          // Perform any cleanup needed when a user fully disconnects
        }
      });

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
          console.log("error", error.message);
          // console.error("Error processing message:", error);
        }
      });

      socket.on("delete_message", async (data) => {
        console.log("delete_message", data);
        
        // Delete message from app database
        deleteMessageFromAppDb(data);
        
        const roomId = data.roomId;
        
        try {
          // Get all users in this room
          const usersInRoom = await client.smembers(`room:${roomId}:users`);
          console.log("sending delete notification to usersInRoom", usersInRoom);
          
          // For each user in the room
          for (const userId of usersInRoom) {
            // Get all socket IDs for this user
            const socketIds = await client.smembers(`user:${userId}:sockets`);
            console.log(`User ${userId} has ${socketIds.length} active connections`);

            if (socketIds.length > 0) {
              // User is active, send delete notification to all their sockets
              socketIds.forEach(socketId => {
                io.to(socketId).emit("message_deleted", data);
                console.log(`Delete notification sent to socket ${socketId} for user ${userId}`);
              });
            }
            // No need to store delete notifications for offline users
          }
        } catch (error) {
          console.log("error in delete_message", error.message);
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
    } catch (error) {
      console.error("Error in socket connection handler:", error);
      socket.disconnect(true);
    }
  });

  // Add a cleanup function that runs periodically
  const cleanupStaleConnections = async () => {
    try {
      console.log("Running periodic socket cleanup");
      
      // Get all user keys with sockets
      const userKeys = await client.keys("user:*:sockets");
      
      for (const userKey of userKeys) {
        const userId = userKey.split(":")[1];
        const userSockets = await client.smembers(userKey);
        
        console.log(`Checking ${userSockets.length} sockets for user ${userId}`);
        
        for (const socketId of userSockets) {
          // Check if socket is still in the server's active connections
          const socket = io.sockets.sockets.get(socketId);
          
          if (!socket) {
            console.log(`Cleaning up disconnected socket ${socketId} for user ${userId}`);
            await client.srem(userKey, socketId);
            connectionTimestamps.delete(socketId);
          }
        }
      }
    } catch (error) {
      console.error("Error in periodic socket cleanup:", error);
    }
  };

  // Run cleanup every 12 hours (was 15 minutes)
  setInterval(cleanupStaleConnections, 12 * 60 * 60 * 1000);
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
  const update_room_url = process.env.CLIENT_URL + "/api/chat/update_room";

  await axios.put(update_room_url, {
    roomId: message.room_id,
    active_users: message.active_users,
  });
  console.log("DEBUGGGGGGGGGGGGGGGGG", message);
  await axios.post(url, message);

}

async function deleteMessageFromAppDb(message) {
  try {
    const url = process.env.CLIENT_URL + "/api/chat/delete_message";
    
    // Handle both formats: either message.id or message.messageId
    const messageId = message.id || message.messageId;
    
    if (!messageId) {
      console.error("Cannot delete message: Missing message ID", message);
      return;
    }
    
    // Ensure we're sending the correct parameter format with system role
    const payload = {
      id: messageId,
      role: "system"  // Add system role to bypass ownership checks
    };
    
    const response = await axios.post(url, payload);
    console.log("Message deleted successfully:", response.data);
  } catch (error) {
    console.error("Error deleting message:", error.response?.data || error.message);
  }
}

async function checkUnreadMessages(userId) {
  console.log("TODO:");
}

module.exports = { setupSocketIO };
