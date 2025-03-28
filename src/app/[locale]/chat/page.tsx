"use client";

// TODO: only load messages from db for first launch
// in later, fetch unread messages from db

import {
  Box,
  Text,
  Flex,
  Icon,
  Container,
  Heading,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaComments, FaUsers, FaExchangeAlt, FaTasks } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import axios from "axios";
import { IMessage, IChatRoom } from "@/types/chat";
import { User } from "@/types/user";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import {
  setRooms,
  setSelectedRoom,
  setLoading,
  joinRoom,
  setMessages,
  markRoomMessagesLoaded
} from '@/store/features/chatSlice';
import { v4 as uuidv4 } from 'uuid';
import { useColorModeValue } from "@/components/ui/color-mode"
import React from "react";
import { ChatRoomList } from "@/components/chat/room_list";
import { ChatMessageList } from "@/components/chat/message_list";
import { ChatInput } from "@/components/chat/chat_input";
import { CreateRoomForm } from "@/components/chat/create_room_form";

const MotionBox = motion(Box);

// Add this dummy TaskLog component
const TaskLog = () => {
  const t = useTranslations("Chat");
  const bgColor = useColorModeValue("white", "gray.800");
  const borderColor = useColorModeValue("gray.200", "gray.700");
  const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");

  return (
    <Box
      height="100%"
      width="100%"
      bg={bgSubtle}
      borderRadius="md"
      borderWidth="1px"
      borderColor={borderColor}
      overflow="hidden"
      display="flex"
      flexDirection="column"
      transition="all 0.3s ease"
      boxShadow="sm"
    >
      <Flex
        p={4}
        borderBottomWidth="1px"
        borderColor={borderColor}
        bg={bgSubtle}
        align="center"
      >
        <Icon as={FaTasks} color="blue.500" mr={2} />
        <Text fontWeight="bold" color={textColorHeading}>{t("task_log")}</Text>
      </Flex>

      <Box flex="1" p={4} overflow="auto">
        {/* Empty content for now - will be replaced later */}
        <Text color={textColor} fontSize="sm" textAlign="center" mt={10}>
          {t("task_log_empty")}
        </Text>
      </Box>
    </Box>
  );
};

export default function ChatPage() {
  const t = useTranslations("Chat");
  const { data: session } = useSession();
  const dispatch = useDispatch();

  // Get chat state from Redux
  const {
    rooms,
    selectedRoomId,
    messages,
    unreadCounts,
    isLoading,
    messagesLoaded
  } = useSelector((state: RootState) => state.chat);

  // Get messages for the selected room
  const currentMessages = selectedRoomId ? messages[selectedRoomId] || [] : [];

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState<boolean>(false);
  const [isLayoutFlipped, setIsLayoutFlipped] = useState<boolean>(false);

  // Add ref for message container to enable auto-scrolling
  const messagesEndRef = React.useRef<HTMLDivElement>(null);

  // Function to scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Auto-scroll when messages change or when a room is selected
  useEffect(() => {
    scrollToBottom();
  }, [currentMessages, selectedRoomId]);

  // Add this new useEffect to ensure scrolling on initial load
  useEffect(() => {
    // This will run after the component has mounted and the DOM is ready
    scrollToBottom();

    // Add a small delay to ensure content is fully rendered
    const timer = setTimeout(() => {
      scrollToBottom();
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Dark mode adaptive colors
  const bgSubtle = useColorModeValue("bg.subtle", "gray.800");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        dispatch(setLoading(true));
        const response = await axios.get("/api/chat/get_rooms");
        dispatch(setRooms(response.data));
      } catch (error) {
        console.error("Error fetching chat rooms:", error);
      } finally {
        dispatch(setLoading(false));
      }
    };

    if (session) {
      fetchRooms();
    }
  }, [session, dispatch]);

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedRoomId) {
      const newMessage: IMessage = {
        id: uuidv4(),
        room_id: selectedRoomId,
        sender: session?.user as User,
        content: messageInput,
        created_at: new Date().toISOString(),
        avatar: session?.user?.image || "",
      };

      dispatch({
        type: 'chat/sendMessage',
        payload: { message: newMessage }
      });

      if (messageInput.includes("@agent")) {
        triggerAgentAPI(messageInput, selectedRoomId);
      }

      setMessageInput("");
    }
  };

  // Add this new function to handle the agent API call
  const triggerAgentAPI = async (message: string, roomId: string) => {
    try {
      console.log("Agent mentioned, triggering API call");
      const url = `http://${window.location.hostname}:34430/api/agent/summon`;
      const response = await axios.post(url, { query: message, room_id: roomId, created_at: new Date().toISOString() });

      console.log("Agent API response:", response.data);
    }
    catch (error) {
      console.error("Error calling agent API:", error);
    }
  };

  const handleCreateRoom = async () => {
    if (newRoomName.trim()) {
      try {
        setIsCreatingRoomLoading(true);
        const roomName = newRoomName.trim();
        const response = await axios.post("/api/chat/create_room", {
          name: roomName,
          active_users: [],
          unread: 0,
        });
        const roomId = response.data.room_id;
        setNewRoomName("");
        setIsCreatingRoom(false);

        // join the new room
        dispatch(joinRoom(roomId));

        // Refresh rooms list
        const roomsResponse = await axios.get("/api/chat/get_rooms");
        dispatch(setRooms(roomsResponse.data));
      } catch (error) {
        console.error("Error creating room:", error);
      } finally {
        setIsCreatingRoomLoading(false);
      }
    }
  };

  // Group messages by sender for continuous messages
  const groupedMessages = selectedRoomId
    ? (messages[selectedRoomId]?.reduce(
      (
        acc: { sender: string; avatar: string; messages: IMessage[]; isCurrentUser: boolean }[],
        message,
        index
      ) => {
        const prevMessage = messages[selectedRoomId][index - 1];

        // Check if this message is from the current user
        const isCurrentUser = message.sender.email === session?.user?.email;

        // Check if this message is from the same sender as the previous one
        const isContinuation =
          prevMessage &&
          prevMessage.sender.email === message.sender.email;

        if (isContinuation) {
          // Add to the last group
          acc[acc.length - 1].messages.push(message);
        } else {
          // Create a new group
          acc.push({
            sender: message.sender.username,
            avatar: message.avatar,
            messages: [message],
            isCurrentUser: isCurrentUser
          });
        }

        return acc;
      },
      []
    ) || [])
    : [];

  // Update to use selectedRoomId from Redux
  const currentRoom = rooms.find((r) => r.id === selectedRoomId);

  // Fetch messages when selecting a room
  useEffect(() => {
    const fetchMessages = async () => {
      if (selectedRoomId) {
        // Check if we already have messages for this room and if they've been loaded from server
        const hasLoadedMessages = messagesLoaded[selectedRoomId];

        if (!hasLoadedMessages) {
          try {
            dispatch(setLoading(true));
            const response = await axios.get(`/api/chat/get_messages?roomId=${selectedRoomId}`);

            // Merge with any existing messages we might have
            const existingMessages = messages[selectedRoomId] || [];
            const serverMessages = response.data;

            // Create a map of existing messages by ID for quick lookup
            const existingMessageMap = new Map(
              existingMessages.map(msg => [msg.id, msg])
            );

            // Combine messages, avoiding duplicates
            const combinedMessages = [
              ...existingMessages,
              ...serverMessages.filter((msg: IMessage) => !existingMessageMap.has(msg.id))
            ];

            // Sort by created_at
            combinedMessages.sort((a, b) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
            );

            dispatch(setMessages({
              roomId: selectedRoomId,
              messages: combinedMessages
            }));

            dispatch(markRoomMessagesLoaded(selectedRoomId));
          } catch (error) {
            console.error("Error fetching messages:", error);
          } finally {
            dispatch(setLoading(false));
          }
        }
      }
    };

    fetchMessages();
  }, [selectedRoomId, dispatch, messages, messagesLoaded]);

  const handleFlipLayout = () => {
    setIsLayoutFlipped(!isLayoutFlipped);
  };

  if (!session) {
    return <Loading />;
  }

  if (isLoading) {
    return <Loading />;
  }

  return (
    <Container
      maxW="1400px"
      px={{ base: 4, md: 6, lg: 8 }}
      py={4}
      height="100%"
      position="relative"
      overflow="hidden"
    >
      <MotionBox
        width="100%"
        height="100%"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        <Heading size="lg" mb={6} display="flex" alignItems="center" color={textColorHeading}>
          <Icon as={FaComments} mr={3} color="blue.500" />
          {t("chat")}
        </Heading>

        <Flex
          width="100%"
          height="calc(100% - 60px)"
          position="relative"
          overflow="hidden"
          gap={4}
        >
          {/* Room List or Task Log Component with fixed width */}
          <MotionBox
            layout
            initial={false}
            animate={{
              left: isLayoutFlipped ? "calc(100% - 300px)" : 0,
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            position="absolute"
            width="300px"
            height="100%"
            zIndex={1}
            whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            <AnimatePresence mode="wait" initial={false}>
              {isLayoutFlipped ? (
                <motion.div
                  key="task-log"
                  initial={{
                    opacity: 0,
                    scale: 0.92,
                    filter: "blur(8px)",
                    x: -20
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(4px)",
                    x: 20
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                    opacity: { duration: 0.4 },
                    scale: { duration: 0.5 },
                    filter: { duration: 0.4 },
                    x: { duration: 0.4 }
                  }}
                  style={{ height: '100%' }}
                >
                  <TaskLog />
                </motion.div>
              ) : (
                <motion.div
                  key="chat-room-list"
                  initial={{
                    opacity: 0,
                    scale: 0.92,
                    filter: "blur(8px)",
                    x: -20
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    filter: "blur(0px)",
                    x: 0
                  }}
                  exit={{
                    opacity: 0,
                    scale: 0.95,
                    filter: "blur(4px)",
                    x: 20
                  }}
                  transition={{
                    duration: 0.5,
                    ease: "easeOut",
                    opacity: { duration: 0.4 },
                    scale: { duration: 0.5 },
                    filter: { duration: 0.4 },
                    x: { duration: 0.4 }
                  }}
                  style={{ height: '100%' }}
                >
                  <ChatRoomList
                    rooms={rooms}
                    selectedRoomId={selectedRoomId}
                    unreadCounts={unreadCounts}
                    onSelectRoom={(roomId) => dispatch(setSelectedRoom(roomId))}
                    onCreateRoomClick={() => setIsCreatingRoom(true)}
                    isCreatingRoomLoading={isCreatingRoomLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </MotionBox>

          {/* Chat Interface Component */}
          <MotionBox
            layout
            initial={false}
            animate={{
              left: isLayoutFlipped ? 0 : "300px",
              width: isLayoutFlipped ? "calc(100% - 300px - 1rem)" : "calc(100% - 300px - 1rem)",
              opacity: 1,
              scale: 1,
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 }
            }}
            position="absolute"
            height="100%"
            overflow="hidden"
            bg={bgSubtle}
            borderRadius="md"
            display="flex"
            flexDirection="column"
            borderWidth="1px"
            borderColor={borderColor}
            zIndex={2}
            left={isLayoutFlipped ? 0 : "300px"}
            width="calc(100% - 300px - 1rem)"
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
                      <Text fontSize="lg" fontWeight="bold" color={textColorHeading}>
                        {currentRoom?.name || t("select_room")}
                      </Text>
                      <Flex align="center">
                        <Icon
                          as={FaUsers}
                          color="blue.500"
                          boxSize={3}
                          mr={1}
                        />
                        <Text fontSize="xs" color={textColor}>
                          {t("active_users")}:{" "}
                          {currentRoom?.active_users?.length || 0}
                        </Text>
                      </Flex>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Layout toggle button with text - only show when not creating a room */}
              <AnimatePresence>
                {!isCreatingRoom && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                      position: "absolute",
                      right: "16px",
                      top: "50%",
                      transform: "translateY(-50%)"
                    }}
                  >
                    <Text
                      as="button"
                      color="blue.500"
                      fontWeight="medium"
                      cursor="pointer"
                      onClick={handleFlipLayout}
                      _hover={{ color: "blue.600", textDecoration: "underline" }}
                      transition="color 0.2s ease"
                    >
                      {isLayoutFlipped ? t("switch_to_room_view") : t("switch_to_task_view")}
                    </Text>
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>

            {/* Messages area */}
            <ChatMessageList
              messageGroups={groupedMessages}
              // @ts-ignore
              messagesEndRef={messagesEndRef}
            />

            {/* Input area */}
            <ChatInput
              messageInput={messageInput}
              setMessageInput={setMessageInput}
              handleSendMessage={handleSendMessage}
              selectedRoomId={selectedRoomId}
            />
          </MotionBox>
        </Flex>
      </MotionBox>
    </Container>
  );
}
