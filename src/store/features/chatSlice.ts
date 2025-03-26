import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { IChatRoom, IMessage } from '@/types/chat';
// import { User } from '@/types/user';

interface ChatState {
    isSocketConnected: boolean;
    rooms: IChatRoom[];
    selectedRoomId: string | null;
    messages: Record<string, IMessage[]>; // roomId -> messages
    unreadCounts: Record<string, number>; // roomId -> count
    isLoading: boolean;
}

const initialState: ChatState = {
    isSocketConnected: false,
    rooms: [],
    selectedRoomId: null,
    messages: {},
    unreadCounts: {},
    isLoading: false,
};

export const chatSlice = createSlice({
    name: 'chat',
    initialState,
    reducers: {
        setSocketConnected: (state, action: PayloadAction<boolean>) => {
            state.isSocketConnected = action.payload;
        },
        setRooms: (state, action: PayloadAction<IChatRoom[]>) => {
            state.rooms = action.payload;
        },
        addRoom: (state, action: PayloadAction<IChatRoom>) => {
            state.rooms.push(action.payload);
        },
        updateRoom: (state, action: PayloadAction<IChatRoom>) => {
            const index = state.rooms.findIndex(room => room.id === action.payload.id);
            if (index !== -1) {
                state.rooms[index] = action.payload;
            }
        },
        setSelectedRoom: (state, action: PayloadAction<string | null>) => {
            state.selectedRoomId = action.payload;
            // Reset unread count when selecting a room
            if (action.payload) {
                state.unreadCounts[action.payload] = 0;
            }
        },
        addMessage: (state, action: PayloadAction<{ roomId: string, message: IMessage }>) => {
            const { roomId, message } = action.payload;
            if (!state.messages[roomId]) {
                state.messages[roomId] = [];
            }
            state.messages[roomId].push(message);

            // Increment unread count if not the selected room
            if (state.selectedRoomId !== roomId) {
                state.unreadCounts[roomId] = (state.unreadCounts[roomId] || 0) + 1;
            }
        },
        setMessages: (state, action: PayloadAction<{ roomId: string, messages: IMessage[] }>) => {
            const { roomId, messages } = action.payload;
            state.messages[roomId] = messages;
        },
        setUnreadCount: (state, action: PayloadAction<{ roomId: string, count: number }>) => {
            state.unreadCounts[action.payload.roomId] = action.payload.count;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        joinRoom: (state, action: PayloadAction<string>) => {
            // This is just to update the Redux state
            // The actual socket join happens in the middleware
            const roomId = action.payload;
            // You could add any state changes needed when joining a room
        },
    },
});

export const {
    setSocketConnected,
    setRooms,
    addRoom,
    updateRoom,
    setSelectedRoom,
    addMessage,
    setMessages,
    setUnreadCount,
    setLoading,
    joinRoom,
} = chatSlice.actions;

export default chatSlice.reducer;
