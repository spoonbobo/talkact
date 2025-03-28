// src/store/reducers.ts
import { combineReducers } from '@reduxjs/toolkit';
import { createSlice } from '@reduxjs/toolkit';
import chatReducer from './features/chatSlice';
import userReducer from './features/userSlice';

// Example slice
const exampleSlice = createSlice({
  name: 'example',
  initialState: {
    value: 0,
  },
  reducers: {
    increment: (state) => {
      state.value += 1;
    },
    decrement: (state) => {
      state.value -= 1;
    },
    incrementByAmount: (state, action) => {
      state.value += action.payload;
    },
  },
});

export const { increment, decrement, incrementByAmount } = exampleSlice.actions;

const rootReducer = combineReducers({
  example: exampleSlice.reducer,
  chat: chatReducer,
  user: userReducer,
});

export default rootReducer;