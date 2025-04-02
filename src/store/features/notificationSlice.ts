import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { Notification } from '@/types/notification';

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
    position: { x: number, y: number };
}

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
    position: { x: 20, y: 20 }
};

const notificationSlice = createSlice({
    name: 'notification',
    initialState,
    reducers: {
        setNotifications: (state, action: PayloadAction<Notification[]>) => {
            state.notifications = action.payload;
            state.unreadCount = action.payload.filter(n => !n.read).length;
        },
        markAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find(n => n.id === action.payload);
            if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },
        addNotification: (state, action: PayloadAction<Notification>) => {
            state.notifications.unshift(action.payload);
            if (!action.payload.read) {
                state.unreadCount += 1;
            }
        },
        updatePosition: (state, action: PayloadAction<{ x: number, y: number }>) => {
            state.position = action.payload;
        }
    }
});

export const {
    setNotifications,
    markAsRead,
    addNotification,
    updatePosition
} = notificationSlice.actions;

export default notificationSlice.reducer;
