// do not delete below line.
// import { io, Manager } from "socket.io-client";
import io from "socket.io-client";
import { User } from "@/types/user";
import { IMessage } from "@/types/chat";


class ChatSocketClient {
    // @ts-ignore
    private socket: any;
    private user: User;
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

        this.socket = io(socketUrl, {
            auth: {
                user: this.user
            },
            reconnection: true,
            reconnectionAttempts: 5,
            reconnectionDelay: 1000,
            timeout: 20000
        });
        console.log(this.socket);
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
        }
    }

    onDisconnect(callback: () => void): void {
        if (this.socket) {
            this.socket.on('disconnect', callback);
        }
    }

    onMessage(callback: (message: IMessage) => void): void {
        if (this.socket) {
            this.socket.on('message', (data: IMessage) => {
                if (data && data.room_id) {
                    console.log("Received message from server:", data);
                    callback(data);
                } else {
                    console.error("Received malformed message:", data);
                }
            });
        }
    }

    onRoomUpdate(callback: (room: any) => void): void {
        if (this.socket) {
            this.socket.on('room_update', callback);
        }
    }

    sendMessage(message: IMessage): void {
        if (this.socket && this.socket.connected) {
            this.socket.emit('message', message);
        }
    }

    disconnect(): void {
        if (this.socket && this.socket.connected) {
            this.socket.disconnect();
            console.log("Socket disconnected successfully");
        }
    }
}

export default ChatSocketClient;