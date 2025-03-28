// src/store/store.js
import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // defaults to localStorage for web
import chatReducer from './features/chatSlice';
import userReducer from './features/userSlice';
import { socketMiddleware } from './middleware/socketMiddleware';

// Combine all reducers
const rootReducer = combineReducers({
    chat: chatReducer,
    user: userReducer,
    // Add other reducers here
});

// Configure persist settings for root reducer
const persistConfig = {
    key: 'root',
    storage,
    whitelist: ['chat', 'user'], // Persist both chat and user state
};

// Create a persisted reducer
const persistedReducer = persistReducer(persistConfig, rootReducer);

// Configure the store
export const store = configureStore({
    reducer: persistedReducer,
    middleware: (getDefaultMiddleware) =>
        getDefaultMiddleware({
            serializableCheck: {
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
            },
        }).concat(socketMiddleware),
});

// Persistor object
export const persistor = persistStore(store);

// Define RootState type
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;