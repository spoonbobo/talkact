// dummy-service/index.js
const Redis = require("ioredis");
const express = require("express");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// Serve a simple HTML page
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Redis Cluster Demo</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        #messages { list-style-type: none; margin: 0; padding: 0; }
        #messages li { margin-bottom: 5px; padding: 5px; background-color: #f1f1f1; }
        input { padding: 5px; width: 300px; }
        button { padding: 5px 10px; }
      </style>
    </head>
    <body>
      <h1>Redis Cluster Demo</h1>
      <div>
        <input id="messageInput" placeholder="Type a message..." />
        <button id="sendBtn">Send</button>
      </div>
      <h2>Messages from Queue:</h2>
      <ul id="messages"></ul>

      <script src="/socket.io/socket.io.js"></script>
      <script>
        const socket = io();
        const messageInput = document.getElementById('messageInput');
        const sendBtn = document.getElementById('sendBtn');
        const messagesList = document.getElementById('messages');

        // Receive messages from server
        socket.on('queueData', (data) => {
          const li = document.createElement('li');
          li.textContent = JSON.stringify(data);
          messagesList.prepend(li);
        });

        // Send message to server
        sendBtn.addEventListener('click', () => {
          const message = messageInput.value;
          if (message) {
            socket.emit('sendMessage', message);
            messageInput.value = '';
          }
        });

        // Handle enter key
        messageInput.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            sendBtn.click();
          }
        });
      </script>
    </body>
    </html>
  `);
});

async function main() {
  const maxRetries = 10;
  let retries = 0;
  let connected = false;
  let client;

  while (!connected && retries < maxRetries) {
    try {
      console.log(
        `Attempting to connect to Redis Cluster at ${process.env.REDIS_HOST}:${process.env.REDIS_PORT} (Attempt ${retries + 1}/${maxRetries})`
      );

      // Create a Redis Cluster client
      client = new Redis.Cluster(
        [
          {
            host: process.env.REDIS_HOST,
            port: process.env.REDIS_PORT,
            password: process.env.REDIS_PASSWORD,
          },
        ],
        {
          redisOptions: {
            password: process.env.REDIS_PASSWORD,
          },
          scaleReads: "all",
          enableReadyCheck: true,
          maxRedirections: 16,
          retryDelayOnFailover: 2000,
        }
      );

      client.on("error", (err) => {
        console.error("Redis Client Error", err);
      });

      client.on("ready", () => {
        console.log("Connected to Redis Cluster successfully!");
        connected = true;
      });

      // Wait for connection to be ready
      await new Promise((resolve) => {
        if (client.status === "ready") {
          resolve();
        } else {
          client.once("ready", resolve);
        }
      });

      // Set up Socket.IO connection
      io.on("connection", (socket) => {
        console.log("New client connected");

        // Handle client sending a message
        socket.on("sendMessage", async (message) => {
          try {
            const dummyData = {
              message: message,
              timestamp: new Date().toISOString(),
              source: "socket.io",
            };

            const reply = await client.lpush(
              "dummyQueue",
              JSON.stringify(dummyData)
            );
            console.log("Data sent to Redis via Socket.IO:", dummyData);
            console.log("Redis reply:", reply);

            // Broadcast the new message to all clients
            io.emit("queueData", dummyData);
          } catch (err) {
            console.error("Error sending data to Redis:", err);
          }
        });

        // Send recent messages to newly connected client
        const sendRecentMessages = async () => {
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
        };

        sendRecentMessages();

        socket.on("disconnect", () => {
          console.log("Client disconnected");
        });
      });

      const sendData = async () => {
        try {
          const dummyData = {
            message: "Hello from dummy service!",
            timestamp: new Date().toISOString(),
            source: "automated",
          };

          const reply = await client.lpush(
            "dummyQueue",
            JSON.stringify(dummyData)
          );
          console.log("Data sent to Redis:", dummyData);
          console.log("Redis reply:", reply);

          // Broadcast to all connected clients
          io.emit("queueData", dummyData);
        } catch (err) {
          console.error("Error sending data to Redis:", err);
        }
      };

      // Send data immediately
      await sendData();

      // Then send data every 5 seconds
      setInterval(sendData, 5000);

      // Start the HTTP server
      const PORT = process.env.PORT || 3000;
      httpServer.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
      });
    } catch (err) {
      console.error(
        `Failed to connect to Redis (Attempt ${retries + 1}/${maxRetries}):`,
        err
      );
      retries++;

      if (retries < maxRetries) {
        console.log(`Retrying in 5 seconds...`);
        await new Promise((resolve) => setTimeout(resolve, 5000));
      } else {
        console.error("Max retries reached. Could not connect to Redis.");
        process.exit(1);
      }
    }
  }
}

main().catch((err) => {
  console.error("Failed to run the application:", err);
  process.exit(1);
});
