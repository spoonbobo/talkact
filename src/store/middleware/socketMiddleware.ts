import { Middleware } from 'redux';
import ChatSocketClient from '@/lib/chat_socket_client';
import { User } from '@/types/user';
import {
    setSocketConnected,
    addMessage,
    updateRoom,
    setSelectedRoom
} from '../features/chatSlice';
import { IMessage } from '@/types/chat';

// This will hold our socket instance
let socketClient: ChatSocketClient | null = null;

export const socketMiddleware: Middleware = store => next => action => {
    const { dispatch, getState } = store;

    // Handle socket initialization
    // @ts-ignore
    if (action.type === 'chat/initializeSocket') {
        // @ts-ignore
        const user: User = action.payload;

        // Only create a new socket if one doesn't exist
        if (!socketClient) {
            socketClient = new ChatSocketClient(user);

            // Set up event listeners
            socketClient.onConnect(() => {
                dispatch(setSocketConnected(true));
                console.log('Socket connected successfully');
            });

            socketClient.onDisconnect(() => {
                dispatch(setSocketConnected(false));
                console.log('Socket disconnected');
            });

            socketClient.onMessage((message: IMessage) => {
                console.log("message", message);
                dispatch(addMessage({ roomId: message.room_id, message }));
                console.log(`Message received in room ${message.room_id}:`, message);
            });

            socketClient.onRoomUpdate((room) => {
                dispatch(updateRoom(room));
                console.log('Room updated:', room);
            });

            // Initialize the connection
            socketClient.initialize();
        }

        return next(action);
    }

    // Handle socket disconnection
    // @ts-ignore
    if (action.type === 'chat/disconnectSocket') {
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
            dispatch(setSocketConnected(false));
        }

        return next(action);
    }

    // Handle sending messages
    // @ts-ignore
    if (action.type === 'chat/sendMessage') {
        // TODO: fix this
        // @ts-ignore
        const { message } = action.payload;
        if (socketClient) {
            // @ts-ignore
            socketClient.sendMessage(message);
        }

        return next(action);
    }

    // Handle joining a room
    // @ts-ignore
    if (action.type === 'chat/joinRoom') {
        // @ts-ignore
        const roomId = action.payload;
        // @ts-ignore
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            // @ts-ignore
            socketClient.joinRoom(roomId);
            // Optionally select the room after joining
            dispatch(setSelectedRoom(roomId));
        }
        return next(action);
    }

    // Pass all other actions to the next middleware
    return next(action);
}; 