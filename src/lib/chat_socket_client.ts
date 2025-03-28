// do not delete below line.
// import { io, Manager } from "socket.io-client";
import io from "socket.io-client";
import { User } from "@/types/user";
import { IMessage } from "@/types/chat";

class ChatSocketClient {
    socket: any;
    private user: User;
    private messageCallback: ((message: IMessage) => void) | null = null;

    constructor(user: User) {
        this.user = user;
    }

    initialize(): void {
        if (this.user.username === "") {
            return;
        }

        const socketUrl = process.env.NODE_ENV === 'production'
            ? window.location.origin
            : `${window.location.protocol}//${window.location.hostname}:3001`;

        console.log("Initializing socket connection to:", socketUrl);

        this.socket = io(socketUrl, {
            auth: {
                user: this.user
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });

        // Add direct event listeners for debugging
        this.socket.on('connect', () => {
            console.log("Socket connected with ID:", this.socket.id);

            // Set up message listener after connection is established
            if (this.messageCallback) {
                this.setupMessageListener(this.messageCallback);
            }
        });

        this.socket.on('connect_error', (err: any) => console.error("Socket connection error:", err));
        this.socket.on('error', (err: any) => console.error("Socket error:", err));

        // Add a direct listener for messages to debug
        this.socket.on('message', (data: any) => {
            console.log("DIRECT MESSAGE LISTENER TRIGGERED:", data);
        });

        console.log("Socket instance created:", this.socket);
    }

    onConnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('connect', callback);
        }
    }

    joinRoom(roomId: string): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('join_room', roomId);
            console.log(`Joined room: ${roomId}`);
        } else {
            console.warn(`Cannot join room ${roomId} - socket not connected`);
        }
    }

    onDisconnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('disconnect', callback);
        }
    }

    onMessage(callback: (message: IMessage) => void): void {
        // Store the callback for later use if socket isn't connected yet
        this.messageCallback = callback;

        if (this.socket && this.socket.connected) {
            this.setupMessageListener(callback);
        } else {
            console.log("Socket not connected yet, message listener will be set up after connection");
        }
    }

    private setupMessageListener(callback: (message: IMessage) => void): void {
        console.log("Setting up message listener on socket:", this.socket.id);

        // Remove any existing listeners to prevent duplicates
        this.socket.off('message');

        this.socket.on('message', (data: any) => {
            console.log("MESSAGE RECEIVED RAW:", data);

            try {
                // Handle both string and object formats
                const messageData = typeof data === 'string' ? JSON.parse(data) : data;

                if (messageData && messageData.room_id) {
                    console.log("Valid message received:", messageData);
                    callback(messageData);
                } else {
                    console.error("Received malformed message structure:", messageData);
                }
            } catch (error) {
                console.error("Error processing received message:", error, data);
            }
        });
    }

    onRoomUpdate(callback: (room: any) => void): void {
        if (this.socket) {
            this.socket.on('room_update', callback);
        }
    }

    sendMessage(message: IMessage): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('message', message);
        } else {
            console.error("Cannot send message - socket not connected");
        }
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            console.log("Socket disconnected successfully");
        }
    }
}

export default ChatSocketClient;