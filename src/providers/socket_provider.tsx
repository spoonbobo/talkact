"use client";

import React, { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { User } from '@/types/user';

export default function SocketProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const isSocketConnected = useSelector((state: RootState) => state.chat.isSocketConnected);

  useEffect(() => {
    // Initialize socket when session is available and socket is not already connected
    if (session && !isSocketConnected) {
      const user: User = {
        id: 1, // You might want to get this from your session
        username: session?.user?.name || "",
        email: session?.user?.email || "",
        created_at: new Date(),
        updated_at: new Date(),
        active_rooms: [],
        archived_rooms: [],
        avatar: session?.user?.image || "",
      };
      
      // Dispatch action to initialize socket
      dispatch({ type: 'chat/initializeSocket', payload: user });
    }
    
    // Clean up function for when the provider unmounts or session changes
    return () => {
      // Only disconnect if the session is gone (user logged out)
      if (!session && isSocketConnected) {
        dispatch({ type: 'chat/disconnectSocket' });
      }
    };
  }, [session, isSocketConnected, dispatch]);

  return <>{children}</>;
} 