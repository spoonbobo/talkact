import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { User } from '@/types/user';

interface UserState {
    currentUser: User | null;
    isOwner: boolean;
    isAuthenticated: boolean;
    isLoading: boolean;
    isSigningOut: boolean;
    error: string | null;
}

const initialState: UserState = {
    isOwner: false,
    currentUser: null,
    isAuthenticated: false,
    isLoading: false,
    isSigningOut: false,
    error: null
};

// Configure persist for user slice
const userPersistConfig = {
    key: 'user',
    storage,
    whitelist: ['currentUser', 'isAuthenticated'] // Only persist these fields
};

export const userSlice = createSlice({
    name: 'user',
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.currentUser = action.payload;
            state.isAuthenticated = true;
            state.isOwner = action.payload.email === "seasonluke@gmail.com" || action.payload.email === "spoon@simsreal.ai";
            state.error = null;
        },
        clearUser: (state) => {
            state.currentUser = null;
            state.isAuthenticated = false;
        },
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },
        setSigningOut: (state, action: PayloadAction<boolean>) => {
            state.isSigningOut = action.payload;
        },
        setError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
        }
    }
});

export const {
    setUser,
    clearUser,
    setLoading,
    setSigningOut,
    setError
} = userSlice.actions;

// Create a persisted reducer
const persistedUserReducer = persistReducer(userPersistConfig, userSlice.reducer);

export default persistedUserReducer; 