import { Middleware } from 'redux';
import ChatSocketClient from '@/lib/chat_socket_client';
import { User } from '@/types/user';
import {
    setSocketConnected,
    addMessage,
    updateRoom,
    setSelectedRoom,
    setUnreadCount,
    clearSelectedRoom
} from '../features/chatSlice';
import { IMessage } from '@/types/chat';
import { INotification } from '@/types/notification';
import { toaster } from '@/components/ui/toaster';
import { v4 as uuidv4 } from 'uuid';
import { addNotification } from '../features/notificationSlice';

let socketClient: ChatSocketClient | null = null;

interface ChatAction {
    type: string;
    payload?: any;
}

export const socketMiddleware: Middleware = store => next => (action: unknown) => {
    const { dispatch, getState } = store;
    const chatAction = action as ChatAction;

    // Handle socket initialization
    if (chatAction.type === 'chat/initializeSocket') {
        const user: User = chatAction.payload;

        // clean up if needed.
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
        }

        // Create a new socket client
        socketClient = new ChatSocketClient(user);

        // Set up event listeners
        socketClient.onConnect(() => {
            dispatch(setSocketConnected(true));
        });

        socketClient.onDisconnect(() => {
            dispatch(setSocketConnected(false));
            toaster.create({
                title: "Socket Disconnected",
                description: "Please try reconnecting later",
                type: "error"
            });
        });

        socketClient.onMessage((message: IMessage) => {
            toaster.create({
                title: "Message Received",
                description: `From room ${message.room_id}: ${message.content}`,
                type: "info"
            });

            if (message && message.room_id) {
                toaster.create({
                    title: "Message Dispatched",
                    description: `To room ${message.room_id}`,
                    type: "info"
                });
                dispatch(addMessage({ roomId: message.room_id, message }));

                // If this is not the currently selected room, update unread count
                const state = getState();
                if (state.chat.selectedRoomId !== message.room_id) {
                    dispatch(setUnreadCount({
                        roomId: message.room_id,
                        count: (state.chat.unreadCounts[message.room_id] || 0) + 1
                    }));
                }
            } else {
                toaster.create({
                    title: "Invalid message format",
                    description: "Please try again later",
                    type: "error"
                });
            }
        });

        socketClient.onNotification((notification: INotification) => {
            console.log("Notification received in middleware:", notification);

            // Dispatch the notification to the store
            dispatch(addNotification(notification));
        });

        socketClient.onRoomUpdate((room) => {
            dispatch(updateRoom(room));
            toaster.create({
                title: "Room Updated",
                description: `Room ${room.id} updated`,
                type: "info"
            });
        });

        // Initialize the connection
        socketClient.initialize();

        return next(action);
    }

    // Handle socket disconnection
    if (chatAction.type === 'chat/disconnectSocket') {
        if (socketClient) {
            socketClient.disconnect();
            socketClient = null;
            dispatch(setSocketConnected(false));
        }

        return next(action);
    }

    // Handle sending messages
    if (chatAction.type === 'chat/sendMessage') {
        const { message } = chatAction.payload;
        if (socketClient) {
            socketClient.sendMessage(message);
        }

        return next(action);
    }

    // Handle joining a room
    if (chatAction.type === 'chat/joinRoom') {
        const roomId = chatAction.payload;
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.joinRoom(roomId);
            dispatch(setSelectedRoom(roomId));
        }
        return next(action);
    }

    if (chatAction.type === 'chat/inviteToRoom') {
        const { roomId, userIds } = chatAction.payload;
        console.log("MIDDLEWARE: Inviting users to room:", roomId, userIds);
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.inviteToRoom(roomId, userIds);
        }
        return next(action);
    }

    if (chatAction.type === 'chat/quitRoom') {
        const roomId = chatAction.payload;
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.quitRoom(roomId);
            dispatch(clearSelectedRoom(roomId));
        }
        return next(action);
    }

    if (chatAction.type === 'chat/mentionUser') {
        const { message } = chatAction.payload;
        const notification: INotification = {
            notification_id: uuidv4(),
            message: message.content,
            sender: message.sender,
            receivers: message.mentions?.map((user: User) => user.user_id),
            created_at: new Date().toISOString(),
        }
        if (socketClient && socketClient.socket && socketClient.socket.connected) {
            socketClient.sendNotification(notification);
        }
    }
    // Pass all other actions to the next middleware
    return next(action);
}; 