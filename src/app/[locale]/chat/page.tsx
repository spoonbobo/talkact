"use client";

import {
  Box,
  Text,
  Flex,
  Icon,
  Container,
  Button,
  CloseButton,
  Drawer,
  Portal,
  VStack,
  HStack,
  Avatar,
  Badge,
  Separator,
  IconButton,
  Input
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaUsers, FaTasks, FaUserPlus, FaEdit, FaTimes, FaCalendarAlt, FaPlus, FaLink } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import axios from "axios";
import { IChatRoom, IMessage } from "@/types/chat";
import { User } from "@/types/user";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {
  setRooms,
  setSelectedRoom,
  setLoadingRooms,
  setLoadingMessages,
  joinRoom,
  setMessages,
  markRoomMessagesLoaded,
  clearSelectedRoom,
  quitRoom,
  updateRoom,
  removeUserFromRoom,
  setUnreadCount,
  addMessage,
  updateMessage,
  setPlanSectionWidth
} from '@/store/features/chatSlice';
import { updateActiveRooms } from '@/store/features/userSlice';
import React from "react";
import { ChatRoomList } from "@/components/chat/room_list";
import { ChatMessageList } from "@/components/chat/message_list";
import { ChatInput } from "@/components/chat/chat_input";
import { CreateRoomForm } from "@/components/chat/create_room_form";
import { toaster } from "@/components/ui/toaster";
import { useChatPageColors } from "@/utils/colors";
import { RoomMenu } from "@/components/chat/room_menu";
import { RoomInvitation } from "@/components/chat/room_invitation";
import { useRouter } from "next/navigation";
import OpenAI from "openai";
import { v4 as uuidv4 } from "uuid";
import { saveSession } from "@/store/middleware/streamingMiddleware";
import { setStreamingState } from '@/store/features/assistantSlice';

const MotionBox = motion.create(Box);
const MESSAGE_LIMIT = 30;
const openai = new OpenAI({
  baseURL: process.env.NEXT_PUBLIC_OPENAI_API_BASE_URL,
  apiKey: process.env.NEXT_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true
});

export default function ChatPage() {
  const { isAuthenticated } = useSelector((state: RootState) => state.user);
  const router = useRouter();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push("/signin");
    }
  }, [isAuthenticated, router]);

  if (!isAuthenticated) {
    return null;
  }

  return <ChatPageContent />;
}

// The main ChatPageContent component
const ChatPageContent = () => {
  const t = useTranslations("Chat");
  const { data: session } = useSession();
  const dispatch = useDispatch();
  const colors = useChatPageColors();

  // Get chat state from Redux - use individual selectors for better performance
  const rooms = useSelector((state: RootState) => state.chat.rooms);
  const selectedRoomId = useSelector((state: RootState) => state.chat.selectedRoomId);
  const messages = useSelector((state: RootState) => state.chat.messages);
  const unreadCounts = useSelector((state: RootState) => state.chat.unreadCounts);
  const isLoadingRooms = useSelector((state: RootState) => state.chat.isLoadingRooms);
  const isLoadingMessages = useSelector((state: RootState) => state.chat.isLoadingMessages);
  const messagesLoaded = useSelector((state: RootState) => state.chat.messagesLoaded);
  const isSocketConnected = useSelector((state: RootState) => state.chat.isSocketConnected);
  const isStreaming = useSelector((state: RootState) => state.assistant.isStreaming);
  const streamingMessageId = useSelector((state: RootState) => state.assistant.streamingMessageId);

  const currentUser = useSelector((state: RootState) => state.user.currentUser);
  const isOwner = useSelector((state: RootState) => state.user.isOwner);

  // Get messages for the selected room
  const currentMessages = selectedRoomId ? messages[selectedRoomId] || [] : [];

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState<boolean>(false);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

  // Add ref for message container to enable auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Use the centralized colors instead of direct useColorModeValue calls
  const bgSubtle = colors.bgSubtle;
  const textColor = colors.textColor;
  const textColorHeading = colors.textColorHeading;
  const borderColor = colors.borderColor;

  // Add new color variables for message list consistency
  const messageListBg = bgSubtle;
  const messageTextColor = colors.messageTextColor || textColor;

  // Add these state variables
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [isRoomDetailsOpen, setIsRoomDetailsOpen] = useState<boolean>(false);
  const [isInvitingUsers, setIsInvitingUsers] = useState<boolean>(false);
  const [roomUsers, setRoomUsers] = useState<User[]>([]);
  const [isEditingName, setIsEditingName] = useState<boolean>(false);
  const [isUpdatingName, setIsUpdatingName] = useState<boolean>(false);

  // Get the current room
  const currentRoom = useMemo(() => {
    return rooms.find(room => room.id === selectedRoomId);
  }, [rooms, selectedRoomId]);

  // Add this at the top of your component
  const isProcessingRef = useRef(false);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const response = await axios.get("/api/chat/get_rooms");
        // Make sure rooms have their active_users properly populated
        const roomsWithUsers = response.data.map((room: IChatRoom) => {
          // If active_users is null or undefined, initialize as empty array
          if (!room.active_users) {
            room.active_users = [];
          }
          return room;
        });

        dispatch(setRooms(roomsWithUsers));
      } catch (error) {
        toaster.create({
          title: t("error"),
          description: t("error_fetching_rooms"),
          type: "error"
        });
      } finally {
        dispatch(setLoadingRooms(false));
      }
    };

    if (session) {
      fetchRooms();
    }
  }, [session, dispatch]);

  // Fetch users and agents
  useEffect(() => {
    const fetchUsersAndAgents = async () => {
      try {
        // Fetch regular users
        const usersResponse = await axios.get("/api/user/get_users");
        setUsers(usersResponse.data.users);

        // No longer fetching agents separately
      } catch (error) {
        toaster.create({
          title: t("error"),
          description: t("error_fetching_users_agents"),
          type: "error"
        });
      }
    };

    if (session) {
      fetchUsersAndAgents();
    }
  }, [session]);

  // Add this new function to handle the agent API call
  const triggerAgentAPI = async (message: string, roomId: string) => {
    try {
      // Extract the mentioned agent username
      let assigneeId = null;
      const mentionMatch = message.match(/@([a-zA-Z0-9_]+)/);

      if (mentionMatch && mentionMatch[1]) {
        const mentionedUsername = mentionMatch[1];

        // Look for the mentioned user in all users
        const mentionedUser = users.find(user =>
          user.username === mentionedUsername ||
          (mentionedUsername === "agent" && user.role === "agent")
        );

        if (mentionedUser) {
          assigneeId = mentionedUser.user_id;
        }
      }

      // Create payload with assignee field always included
      const payload = {
        summoner: currentUser?.email,
        query: message,
        room_id: roomId,
        assigner: currentUser?.user_id,
        created_at: new Date().toISOString(),
        assignee: assigneeId, // Always include this field, even if null
      };

      const response = await axios.post(`/api/mcp/create_plan`, payload);

      dispatch(joinRoom(roomId));

      // Add the room to the user's active_rooms
      await axios.post("/api/user/update_user", {
        roomId: roomId,
        action: "add"
      });

      // Update the Redux state to match the database
      dispatch(updateActiveRooms({ roomId, action: "add" }));
    }
    catch (error) {
      console.error("Error calling agent API:", error);
      // Log more detailed error information
      if (axios.isAxiosError(error) && error.response) {
        console.error("Response status:", error.response.status);
        console.error("Response data:", error.response.data);
      }

      toaster.create({
        title: t("error"),
        description: t("error_calling_agent_api"),
        type: "error"
      });
    }
  };

  // Add this function to handle deepseek API calls with streaming
  const triggerDeepseekAPI = async (message: string, roomId: string) => {
    // Guard against re-entry
    if (isProcessingRef.current) {
      console.log("Already processing a request, skipping");
      return;
    }

    isProcessingRef.current = true;

    try {
      // Create a temporary message ID for the streaming response
      const tempMessageId = uuidv4();

      // Find the deepseek user or create a fallback if not found
      const deepseekUser: User = users.find((user: User) => user.username === "deepseek") || {
        user_id: "deepseek-" + uuidv4(),
        username: "deepseek",
        role: "agent", // Changed to "agent" to match your streaming middleware expectations
        email: "deepseek@ai.com",
        avatar: "",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        active_rooms: [],
        archived_rooms: [],
        settings: {} // Add the required settings property
      };

      // Create an initial empty message to show the streaming effect
      const initialMessage: IMessage = {
        id: tempMessageId,
        room_id: roomId,
        sender: deepseekUser,
        content: "", // Empty content that will be streamed
        created_at: new Date().toISOString(),
        mentions: [],
        isStreaming: true, // Mark as streaming
        avatar: deepseekUser.avatar || ""
      };

      // Add a small delay before dispatching the initial empty message
      // This ensures the user's message has time to be fully rendered
      await new Promise(resolve => setTimeout(resolve, 300));

      // Dispatch the initial empty message to show the bubble
      dispatch(addMessage({ roomId, message: initialMessage }));

      // Extract the actual query (remove the @deepseek mention)
      const query = message.replace(/@deepseek/gi, "").trim();

      // Get the last 10 messages from the conversation for context
      const currentMessages = messages[roomId] || [];

      // Add null checks and default values for message properties
      const lastMessages = currentMessages.slice(-10).map(msg => {
        // Ensure sender exists and has a role property
        const sender = msg.sender || { role: "user" };
        const role = (sender && typeof sender === 'object' && sender.role) ?
          (sender.role === "agent" ? "assistant" : "user") :
          "user";

        return {
          role: role as "user" | "assistant",
          content: msg.content || ""
        };
      });

      // Prepare the messages array for the API call
      const apiMessages = [
        { role: "system" as const, content: "You are a helpful assistant powered by Deepseek." },
        ...lastMessages,
        { role: "user" as const, content: query }
      ];

      // Use a throttled update approach to prevent too many renders
      let fullContent = "";
      let lastUpdateTime = Date.now();
      let updateTimer: NodeJS.Timeout | null = null;

      // Set streaming state to true at the start
      dispatch(setStreamingState({ isStreaming: true, messageId: tempMessageId }));

      try {
        // Start streaming with OpenAI
        const stream = await openai.chat.completions.create({
          model: "deepseek-chat",
          messages: apiMessages,
          stream: true
        });

        // Process the stream
        for await (const chunk of stream) {
          // Get the content delta
          const content = chunk.choices[0]?.delta?.content || "";

          // Append to the full content
          fullContent += content;

          // Throttle UI updates to prevent too many renders
          const currentTime = Date.now();
          if (currentTime - lastUpdateTime > 100) {
            // Update the message with the accumulated content
            dispatch(updateMessage({
              roomId,
              messageId: tempMessageId,
              content: fullContent,
              isStreaming: true
            }));
            lastUpdateTime = currentTime;
          } else if (updateTimer === null) {
            // Schedule an update if we haven't already
            updateTimer = setTimeout(() => {
              dispatch(updateMessage({
                roomId,
                messageId: tempMessageId,
                content: fullContent,
                isStreaming: true
              }));
              lastUpdateTime = Date.now();
              updateTimer = null;
            }, 100);
          }
        }

        // Clear any pending updates
        if (updateTimer) {
          clearTimeout(updateTimer);
          updateTimer = null;
        }

        // Final update with complete content
        dispatch(updateMessage({
          roomId,
          messageId: tempMessageId,
          content: fullContent,
          isStreaming: false
        }));

        // Also dispatch the final message to ensure it's properly saved in chat history
        dispatch({
          type: 'chat/sendMessage',
          payload: {
            message: {
              id: tempMessageId,
              room_id: roomId,
              sender: deepseekUser,
              content: fullContent,
              created_at: new Date().toISOString(),
              mentions: [],
              isStreaming: false,
              avatar: deepseekUser.avatar || ""
            }
          }
        });

        // Set streaming state to false when done
        dispatch(setStreamingState({ isStreaming: false, messageId: null }));

      } catch (streamError) {
        console.error("Streaming error:", streamError);

        // Update the message to show the error
        dispatch(updateMessage({
          roomId,
          messageId: tempMessageId,
          content: "Sorry, I encountered an error while processing your request.",
          isStreaming: false
        }));

        // Set streaming state to false on error
        dispatch(setStreamingState({ isStreaming: false, messageId: null }));
      }
    } catch (error) {
      console.error("Error calling Deepseek API:", error);

      // Log more detailed error information
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      // Use English fallback messages for errors to avoid translation issues
      toaster.create({
        title: "Error",
        description: "Error processing your request with Deepseek",
        type: "error"
      });

      // Set streaming state to false on error
      dispatch(setStreamingState({ isStreaming: false, messageId: null }));
    } finally {
      // Always reset the processing flag when done
      isProcessingRef.current = false;
    }
  };

  const handleCreateRoom = async () => {
    if (!newRoomName.trim()) {
      toaster.create({
        title: t("error"),
        description: t("room_name_required"),
        type: "error"
      });
      return;
    }

    setIsCreatingRoomLoading(true);

    try {
      const response = await axios.post("/api/chat/create_room", {
        name: newRoomName,
      });

      const newRoom = response.data;

      // Add the new room to the Redux store
      dispatch(joinRoom(newRoom.id));

      // Refresh the room list
      const roomsResponse = await axios.get("/api/chat/get_rooms");
      dispatch(setRooms(roomsResponse.data));

      // Select the new room
      dispatch(setSelectedRoom(newRoom.id));

      // Reset the form
      setNewRoomName("");
      setIsCreatingRoom(false);

      toaster.create({
        title: t("success"),
        description: t("room_created_successfully"),
        type: "success"
      });
    } catch (error) {
      console.error("Error creating room:", error);
      toaster.create({
        title: t("error"),
        description: t("error_creating_room"),
        type: "error"
      });
    } finally {
      setIsCreatingRoomLoading(false);
    }
  };

  // Group messages by sender for continuous messages
  const groupedMessages = selectedRoomId
    ? (messages[selectedRoomId]?.reduce(
      (
        acc: { sender: string; senderId?: string; avatar: string; messages: IMessage[]; isCurrentUser: boolean }[],
        message,
        index
      ) => {
        // Skip messages with null sender
        if (!message.sender) {
          return acc;
        }

        const prevMessage = messages[selectedRoomId][index - 1];

        // Check if this message is from the current user
        // Add null check for message.sender.email
        const isCurrentUser = message.sender.email && session?.user?.email
          ? message.sender.email === session.user.email
          : false;

        // Check if this message is from the same sender as the previous one
        // Add null checks for both message senders
        const isContinuation =
          prevMessage &&
          prevMessage.sender &&
          message.sender &&
          prevMessage.sender.email === message.sender.email;

        if (isContinuation) {
          // Add to the last group
          acc[acc.length - 1].messages.push(message);
        } else {
          // Create a new group
          acc.push({
            sender: message.sender.username || 'Unknown User',
            senderId: message.sender.user_id,
            avatar: message.avatar || '',
            messages: [message],
            isCurrentUser: isCurrentUser
          });
        }

        return acc;
      },
      []
    ) || [])
    : [];

  // Fetch user details when currentRoom changes
  useEffect(() => {
    const fetchUserDetails = async () => {
      if (currentRoom?.active_users && currentRoom.active_users.length > 0) {
        try {
          const response = await axios.post('/api/chat/get_rooms', {
            userIds: currentRoom.active_users
          });

          if (response.data && response.data.users) {
            setRoomUsers(response.data.users);
          }
        } catch (error) {
          console.error("Error fetching user details:", error);
        }
      } else {
        setRoomUsers([]);
      }
    };

    fetchUserDetails();
  }, [currentRoom]);

  // Fetch messages when selecting a room
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedRoomId) {
        try {
          dispatch(setLoadingMessages(true));
          const response = await axios.get(`/api/chat/get_messages?roomId=${selectedRoomId}&limit=${MESSAGE_LIMIT}`);

          // Get the raw messages from the server
          const serverMessages = response.data;

          setHasMoreMessages(serverMessages.length >= MESSAGE_LIMIT);

          // Process messages in batches to improve performance
          const processMessages = async () => {
            // Extract all unique user IDs from the messages
            const userIds = [...new Set(serverMessages.map((msg: any) =>
              typeof msg.sender === 'string' ? msg.sender : msg.sender?.user_id
            ))].filter(Boolean);

            // Fetch user details for all message senders in a single request
            const usersResponse = await axios.post('/api/user/get_users', {
              user_ids: userIds
            });

            // Create a map of user_id to User object for faster lookups
            const userMap = new Map();
            if (usersResponse.data && usersResponse.data.users) {
              usersResponse.data.users.forEach((user: User) => {
                userMap.set(user.user_id, user);
              });
            }

            // Transform messages to include proper User objects
            const transformedMessages = serverMessages.map((msg: any) => {
              // If sender is a string (user_id), replace with User object
              if (typeof msg.sender === 'string') {
                const user = userMap.get(msg.sender);
                return {
                  ...msg,
                  sender: user || {
                    user_id: msg.sender,
                    username: 'Unknown User',
                    email: '',
                    role: 'user',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString(),
                    active_rooms: [],
                    archived_rooms: []
                  }
                };
              }
              return msg;
            });

            // Update Redux store with processed messages
            dispatch(setMessages({
              roomId: selectedRoomId,
              messages: transformedMessages
            }));

            dispatch(markRoomMessagesLoaded(selectedRoomId));
          };

          // Process messages asynchronously
          await processMessages();
        } catch (error) {
          toaster.create({
            title: t("error"),
            description: t("error_fetching_messages"),
            type: "error"
          });
        } finally {
          dispatch(setLoadingMessages(false));
        }
      }
    };

    if (selectedRoomId) {
      fetchMessages();
    }
  }, [selectedRoomId, dispatch, t]);

  // If there are no rooms but a room is selected, clear the selection
  useEffect(() => {
    if (rooms.length === 0 && selectedRoomId) {
      dispatch(clearSelectedRoom());
    }
  }, [rooms, selectedRoomId, dispatch]);

  const handleSendMessage = useCallback(async (newMessage: IMessage) => {
    console.log("Sending message:", newMessage);

    if (newMessage.content.trim() && selectedRoomId) {
      // First dispatch the user's message to ensure it appears in the chat
      dispatch({
        type: 'chat/sendMessage',
        payload: { message: newMessage }
      });

      console.log("Message dispatched to Redux");
      await axios.post("/api/mcp/ask_admin", {
        room_id: selectedRoomId,
        owner_message: newMessage.content
      });

      // Use a longer timeout to ensure the user's message is fully rendered
      // before starting any AI processing
      setTimeout(() => {
        // Check for @deepseek mentions
        if (newMessage.content.toLowerCase().includes('@deepseek')) {
          // Call the deepseek API with streaming
          triggerDeepseekAPI(newMessage.content, selectedRoomId);
        }
        // Check for agent mentions
        else if (newMessage.mentions?.some(user => user.role === "agent")) {
          triggerAgentAPI(newMessage.content, selectedRoomId);
        }

        if (newMessage.mentions?.some(user => user.role === "user")) {
          dispatch({
            type: 'chat/mentionUser',
            payload: {
              message: newMessage,
            }
          });
        }
      }, 300); // Increased delay to ensure user message renders first

      setMessageInput("");

      // Directly scroll to bottom with multiple attempts to ensure it works
      if (messagesEndRef.current) {
        messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });

        // Add multiple attempts with timeouts to ensure scrolling works
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);

        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 300);
      }

      // Also dispatch the event as a backup method
      window.dispatchEvent(new CustomEvent('scrollToBottom'));
    }
  }, [dispatch, selectedRoomId, setMessageInput, triggerAgentAPI, triggerDeepseekAPI, messagesEndRef]);

  // Memoize the ChatInput props to prevent unnecessary re-renders
  const chatInputProps = useMemo(() => ({
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users,
    agents,
    currentUser,
    currentRoom,
    roomUsers,
    isSocketConnected,
  }), [
    messageInput,
    setMessageInput,
    handleSendMessage,
    selectedRoomId,
    users,
    agents,
    currentUser,
    currentRoom,
    roomUsers,
    isSocketConnected
  ]);

  // Optimize loadMoreMessages function
  const loadMoreMessages = async () => {
    if (!selectedRoomId || isLoadingMore || !hasMoreMessages) return;

    try {
      setIsLoadingMore(true);

      // Get the oldest message ID in the current messages
      const oldestMessage = currentMessages[0];
      const oldestMessageId = oldestMessage?.id;

      // Fetch older messages
      const response = await axios.get(`/api/chat/get_messages`, {
        params: {
          roomId: selectedRoomId,
          before: oldestMessageId,
          limit: MESSAGE_LIMIT
        }
      });

      const serverMessages = response.data;

      // If we got fewer messages than the limit, there are no more to load
      setHasMoreMessages(serverMessages.length >= MESSAGE_LIMIT);

      // Only proceed if we have messages to process
      if (serverMessages.length > 0) {
        // Use a more efficient approach to process messages
        const userIds = [...new Set(serverMessages.map((msg: any) =>
          typeof msg.sender === 'string' ? msg.sender : msg.sender?.user_id
        ))].filter(Boolean);

        // Fetch all user data in a single request
        const usersResponse = await axios.post('/api/user/get_users', {
          user_ids: userIds
        });

        // Create a map for faster lookups
        const userMap = new Map();
        if (usersResponse.data && usersResponse.data.users) {
          usersResponse.data.users.forEach((user: User) => {
            userMap.set(user.user_id, user);
          });
        }

        // Transform messages efficiently
        const transformedMessages = serverMessages.map((msg: any) => {
          if (typeof msg.sender === 'string') {
            const user = userMap.get(msg.sender);
            return {
              ...msg,
              sender: user || {
                user_id: msg.sender,
                username: 'Unknown User',
                email: '',
                role: 'user',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                active_rooms: [],
                archived_rooms: []
              }
            };
          }
          return msg;
        });

        // Add the older messages to the Redux store
        dispatch(setMessages({
          roomId: selectedRoomId,
          messages: [...transformedMessages, ...currentMessages]
        }));
      }
    } catch (error) {
      console.error("Error loading more messages:", error);
      toaster.create({
        title: t("error"),
        description: t("error_loading_more_messages"),
        type: "error"
      });
    } finally {
      setIsLoadingMore(false);
    }
  };

  // Optimize the loadMessages function
  const loadMessages = useCallback(async (roomId: string) => {
    try {
      console.log("Loading messages for room:", roomId);
      dispatch(setLoadingMessages(true));

      const response = await axios.get(`/api/chat/get_messages?roomId=${roomId}&limit=${MESSAGE_LIMIT}`);

      if (response.data && Array.isArray(response.data)) {
        const serverMessages = response.data;

        // Set hasMoreMessages based on the number of messages received
        setHasMoreMessages(serverMessages.length >= MESSAGE_LIMIT);

        // Process messages efficiently
        const userIds = [...new Set(serverMessages.map((msg: any) =>
          typeof msg.sender === 'string' ? msg.sender : msg.sender?.user_id
        ))].filter(Boolean);

        if (userIds.length > 0) {
          const usersResponse = await axios.post('/api/user/get_users', {
            user_ids: userIds
          });

          const userMap = new Map();
          if (usersResponse.data && usersResponse.data.users) {
            usersResponse.data.users.forEach((user: User) => {
              userMap.set(user.user_id, user);
            });
          }

          const transformedMessages = serverMessages.map((msg: any) => {
            if (typeof msg.sender === 'string') {
              const user = userMap.get(msg.sender);
              return {
                ...msg,
                sender: user || {
                  user_id: msg.sender,
                  username: 'Unknown User',
                  email: '',
                  role: 'user',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  active_rooms: [],
                  archived_rooms: []
                }
              };
            }
            return msg;
          });

          dispatch(setMessages({ roomId, messages: transformedMessages }));
        } else {
          dispatch(setMessages({ roomId, messages: serverMessages }));
        }

        dispatch(markRoomMessagesLoaded(roomId));
      }
    } catch (error) {
      console.error("Error loading messages:", error);
      toaster.create({
        title: t("error"),
        description: t("error_loading_messages"),
        type: "error"
      });
    } finally {
      dispatch(setLoadingMessages(false));
    }
  }, [dispatch, t]);

  // Then update the handleRoomSelect function
  const handleRoomSelect = useCallback((roomId: string) => {
    console.log("Selecting room:", roomId);

    // First join the room via socket
    dispatch({ type: 'chat/joinRoom', payload: roomId });

    // Then set it as selected in Redux
    dispatch(setSelectedRoom(roomId));

    // Reset unread count for this room
    dispatch(setUnreadCount({ roomId, count: 0 }));

    // Load messages if not already loaded
    if (!messagesLoaded[roomId]) {
      loadMessages(roomId);
    }
  }, [dispatch, messagesLoaded, loadMessages]);

  // Add this useEffect to your ChatPageContent component
  useEffect(() => {
    // When socket connects, join all rooms the user is part of
    if (isSocketConnected && rooms.length > 0) {
      console.log("Socket connected, joining all rooms:", rooms.map(r => r.id));
      rooms.forEach(room => {
        dispatch({ type: 'chat/joinRoom', payload: room.id });
      });
    }
  }, [isSocketConnected, rooms, dispatch]);

  // If loading, show loading indicator
  if (isLoadingRooms || isLoadingMessages || !session) {
    return <Loading />;
  }

  return (
    <Flex width="100%" height="100%">
      {/* Chat Interface Component - Make it flexible */}
      <Box flex="1" minWidth="0">
        <ChatInterfaceContainer
          isCreatingRoom={isCreatingRoom}
          newRoomName={newRoomName}
          setNewRoomName={setNewRoomName}
          handleCreateRoom={handleCreateRoom}
          setIsCreatingRoom={setIsCreatingRoom}
          currentRoom={currentRoom}
          currentUser={currentUser}
          groupedMessages={groupedMessages}
          messagesEndRef={messagesEndRef}
          loadMoreMessages={loadMoreMessages}
          isLoadingMore={isLoadingMore}
          hasMoreMessages={hasMoreMessages}
          chatInputProps={chatInputProps}
          colors={colors}
          t={t}
          dispatch={dispatch}
          setIsRoomDetailsOpen={setIsRoomDetailsOpen}
          clearSelectedRoom={clearSelectedRoom}
          quitRoom={quitRoom}
          isCreatingRoomLoading={isCreatingRoomLoading}
          isStreaming={isStreaming}
          streamingMessageId={streamingMessageId}
        />
      </Box>

      {/* Room Details Drawer */}
      <Drawer.Root open={isRoomDetailsOpen} onOpenChange={(e) => setIsRoomDetailsOpen(e.open)}>
        <Portal>
          <Drawer.Backdrop />
          <Drawer.Positioner>
            <Drawer.Content bg={colors.bgSubtle} borderColor={colors.borderColor}>
              <Drawer.Header borderBottomColor={colors.borderColor}>
                <Drawer.Title color={colors.textColorHeading}>{currentRoom?.name || t("room_details")}</Drawer.Title>
              </Drawer.Header>
              <Drawer.Body>
                {currentRoom ? (
                  <VStack align="stretch" gap={4}>
                    <Box>
                      <Text fontWeight="bold" mb={2} color={colors.textColorHeading}>{t("room_info")}</Text>
                      <Text fontSize="sm" color={colors.textColor}>ID: {currentRoom.id}</Text>
                      <Text fontSize="sm" color={colors.textColor}>{t("created_at")}: {new Date(currentRoom.created_at || Date.now()).toLocaleString()}</Text>

                      {/* Room Name Edit Section */}
                      <Box mt={3}>
                        <HStack justifyContent="space-between" mb={2}>
                          <Text fontWeight="bold" color={colors.textColorHeading}>{t("room_name")}</Text>
                          <IconButton
                            aria-label={isEditingName ? t("cancel") : t("edit")}
                            size="sm"
                            variant="outline"
                            borderRadius="full"
                            onClick={() => setIsEditingName(!isEditingName)}
                            colorScheme="blue"
                          >
                            <Icon as={isEditingName ? FaTimes : FaEdit} />
                          </IconButton>
                        </HStack>

                        {isEditingName ? (
                          <HStack mt={2}>
                            <Input
                              value={newRoomName}
                              onChange={(e) => setNewRoomName(e.target.value)}
                              placeholder={t("enter_room_name")}
                              size="sm"
                            />
                            <Button
                              size="sm"
                              colorScheme="blue"
                              loading={isUpdatingName}
                              onClick={async () => {
                                if (!newRoomName.trim() || !currentRoom) return;

                                setIsUpdatingName(true);
                                try {
                                  const response = await axios.put('/api/chat/update_room', {
                                    roomId: currentRoom.id,
                                    name: newRoomName.trim()
                                  });

                                  if (response.data) {
                                    dispatch(updateRoom(response.data));
                                    setIsEditingName(false);
                                    toaster.create({
                                      title: t("success"),
                                      description: t("room_name_updated"),
                                      type: "success"
                                    });
                                  }
                                } catch (error) {
                                  console.error("Error updating room name:", error);
                                  toaster.create({
                                    title: t("error"),
                                    description: t("failed_to_update_room_name"),
                                    type: "error"
                                  });
                                } finally {
                                  setIsUpdatingName(false);
                                }
                              }}
                            >
                              {t("save")}
                            </Button>
                          </HStack>
                        ) : (
                          <Text fontSize="md" color={colors.textColor}>{currentRoom.name}</Text>
                        )}
                      </Box>
                    </Box>

                    <Separator />

                    {/* Invite Users Section */}
                    <Box>
                      <HStack justifyContent="space-between" mb={2}>
                        <Text fontWeight="bold" color={colors.textColorHeading}>{t("invite_users")}</Text>
                        <IconButton
                          aria-label={isInvitingUsers ? t("cancel") : t("invite")}
                          size="sm"
                          variant="outline"
                          borderRadius="full"
                          onClick={() => setIsInvitingUsers(!isInvitingUsers)}
                          colorScheme="blue"
                        >
                          {/* Icon is provided via the icon prop */}
                          <Icon as={FaUserPlus} />
                        </IconButton>
                      </HStack>

                      {isInvitingUsers && currentRoom && (
                        <Box mt={2} mb={4}>
                          <RoomInvitation
                            roomId={currentRoom.id}
                            currentUsers={roomUsers}
                            onClose={() => setIsInvitingUsers(false)}
                          />
                        </Box>
                      )}
                    </Box>

                    <Separator />

                    <Box>
                      <Text fontWeight="bold" mb={2} color={colors.textColorHeading}>{t("active_users")}</Text>
                      {roomUsers && roomUsers.length > 0 ? (
                        <VStack align="stretch" gap={2}>
                          {roomUsers.map((user: User) => (
                            <HStack key={user.user_id} gap={3}>

                              <Avatar.Root size="sm" mt={2}>
                                <Avatar.Fallback name={user.username || user.email} />
                                <Avatar.Image src={user.avatar || undefined} />
                              </Avatar.Root>
                              <Text fontSize="sm" color={colors.textColor}>{user.username || user.email}</Text>
                              {user.email === currentUser?.email && (
                                <Badge colorScheme="green" size="sm">{t("you")}</Badge>
                              )}
                            </HStack>
                          ))}
                        </VStack>
                      ) : (
                        <Text fontSize="sm" color={colors.textColorSecondary || "gray.500"}>
                          {t("no_active_users")}
                          <Button
                            colorScheme="blue"
                            size="sm"
                            ml={2}
                            onClick={async () => {
                              try {
                                // Changed from GET with query param to POST with request body
                                const response = await axios.post('/api/chat/get_room', {
                                  roomId: currentRoom.id
                                });
                                if (response.data) {
                                  // Update the room in Redux
                                  dispatch(updateRoom(response.data));
                                }
                              } catch (error) {
                                console.error("Error refreshing room data:", error);
                              }
                            }}
                          >
                            {t("refresh")}
                          </Button>
                        </Text>
                      )}
                    </Box>
                  </VStack>
                ) : (
                  <Text color={colors.textColor}>{t("no_room_selected")}</Text>
                )}
              </Drawer.Body>
              <Drawer.Footer borderTopColor={colors.borderColor}>
                <Button variant="outline" onClick={() => setIsRoomDetailsOpen(false)}
                  borderColor={colors.borderColor} color={colors.textColor}>
                  {t("close")}
                </Button>
              </Drawer.Footer>
              <Drawer.CloseTrigger asChild>
                <CloseButton size="sm" position="absolute" right={3} top={3} color={colors.textColor} />
              </Drawer.CloseTrigger>
            </Drawer.Content>
          </Drawer.Positioner>
        </Portal>
      </Drawer.Root>
    </Flex>
  );
};

// Interface for ChatInterfaceContainer props
interface ChatInterfaceContainerProps {
  isCreatingRoom: boolean;
  newRoomName: string;
  setNewRoomName: (name: string) => void;
  handleCreateRoom: () => void;
  setIsCreatingRoom: (value: boolean) => void;
  currentRoom: IChatRoom | undefined;
  currentUser: User | null;
  groupedMessages: Array<{
    sender: string;
    senderId?: string;
    avatar: string;
    messages: IMessage[];
    isCurrentUser: boolean;
  }>;
  messagesEndRef: React.RefObject<HTMLDivElement | null>;
  loadMoreMessages: () => void;
  isLoadingMore: boolean;
  hasMoreMessages: boolean;
  chatInputProps: any; // You can define a more specific type if needed
  colors: ReturnType<typeof useChatPageColors>;
  t: any; // Replace with proper translation type if available
  dispatch: any; // Replace with proper dispatch type if needed
  setIsRoomDetailsOpen: (value: boolean) => void;
  clearSelectedRoom: any; // Replace with proper action type
  quitRoom: any; // Replace with proper action type
  isCreatingRoomLoading: boolean;
  isStreaming: boolean;
  streamingMessageId: string | null;
}

// Then update the component definition
const ChatInterfaceContainer = ({
  isCreatingRoom,
  newRoomName,
  setNewRoomName,
  handleCreateRoom,
  setIsCreatingRoom,
  currentRoom,
  currentUser,
  groupedMessages,
  messagesEndRef,
  loadMoreMessages,
  isLoadingMore,
  hasMoreMessages,
  chatInputProps,
  colors,
  t,
  dispatch,
  setIsRoomDetailsOpen,
  clearSelectedRoom,
  quitRoom,
  isCreatingRoomLoading,
  isStreaming,
  streamingMessageId
}: ChatInterfaceContainerProps) => {
  const { bgSubtle, textColor, textColorHeading, borderColor } = colors;

  return (
    <MotionBox
      layout
      initial={{ opacity: 0 }}
      animate={{ opacity: 1, scale: 1 }}
      style={{ backgroundColor: bgSubtle }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
        opacity: { duration: 0.3 },
        scale: { duration: 0.3 }
      }}
      height="100%"
      width="100%"
      overflow="hidden"
      borderRadius="md"
      display="flex"
      flexDirection="column"
      borderWidth="1px"
      borderColor={borderColor}
      zIndex={2}
      whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
    >
      {/* Chat header */}
      <Flex
        p={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={bgSubtle}
        align="center"
        minHeight="80px"
        width="100%"
        position="relative"
        justifyContent="space-between"
      >
        <AnimatePresence mode="wait">
          {isCreatingRoom ? (
            <CreateRoomForm
              newRoomName={newRoomName}
              setNewRoomName={setNewRoomName}
              handleCreateRoom={handleCreateRoom}
              handleCancel={() => {
                setIsCreatingRoom(false);
                setNewRoomName("");
              }}
              isCreatingRoomLoading={isCreatingRoomLoading}
            />
          ) : (
            <motion.div
              key="room-info"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >
              <Box ml={3}>
                <Text
                  fontSize="lg"
                  fontWeight="bold"
                  color={textColorHeading}
                  display="flex"
                  alignItems="center"
                >
                  {currentRoom?.name || t("select_room")}
                </Text>
                <AnimatePresence>
                  {currentRoom && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                    >
                      <Flex align="center">
                        <Icon
                          as={FaUsers}
                          color={colors.aiNameColor}
                          boxSize={3}
                          mr={1}
                        />
                        <Text fontSize="xs" color={colors.textColor}>
                          {t("active_users")}:{" "}
                          {currentRoom?.active_users?.length || 0}
                        </Text>
                      </Flex>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Box>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Room Menu moved to right side */}
        {currentRoom && !isCreatingRoom && (
          <Box>
            <RoomMenu
              onRoomDetails={() => {
                setIsRoomDetailsOpen(true);
              }}
              onExitRoom={async () => {
                try {
                  // Call API to remove room from active rooms
                  const response = await fetch('/api/user/update_user', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                      roomId: currentRoom.id,
                      action: 'remove'
                    }),
                  });

                  // Call the remove_user_from_room endpoint
                  await axios.put(`/api/chat/remove_user_from_room`, {
                    roomId: currentRoom.id,
                    userId: currentUser?.user_id
                  });

                  // Only dispatch if currentUser and user_id exist
                  if (currentUser?.user_id) {
                    dispatch(removeUserFromRoom({
                      roomId: currentRoom.id,
                      userId: currentUser.user_id
                    }));
                  }

                  if (!response.ok) {
                    throw new Error('Failed to exit room');
                  }

                  // Clear the selected room in Redux
                  dispatch(clearSelectedRoom());

                  // notice server to quit room
                  dispatch(quitRoom(currentRoom.id));

                  // refresh room list
                  const roomsResponse = await axios.get("/api/chat/get_rooms");
                  dispatch(setRooms(roomsResponse.data));

                  toaster.create({
                    title: t("success"),
                    description: t("left_room_successfully"),
                    type: "info"
                  });
                } catch (error) {
                  console.error("Error exiting room:", error);
                  toaster.create({
                    title: t("error"),
                    description: t("error_leaving_room"),
                    type: "error"
                  });
                }
              }}
            />
          </Box>
        )}
      </Flex>

      {/* Messages area */}
      <ChatMessageList
        messageGroups={groupedMessages}
        messagesEndRef={messagesEndRef}
        onLoadMore={loadMoreMessages}
        isLoadingMore={isLoadingMore}
        hasMoreMessages={hasMoreMessages}
        isStreaming={isStreaming}
        streamingMessageId={streamingMessageId}
        className="message-list-container"
      />

      {/* Input area */}
      <ChatInput {...chatInputProps} />
    </MotionBox>
  );
};