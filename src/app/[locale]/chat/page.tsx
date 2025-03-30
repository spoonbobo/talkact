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
  setLoadingRooms,
  setLoadingMessages,
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
import { ChatModeProvider, useChatMode } from "@/components/chat/chat_mode_context";
import { ChatModeMessageList } from "@/components/chat/chat_mode_message_list";
import { ChatModeInput } from "@/components/chat/chat_mode_input";
import { toaster } from "@/components/ui/toaster";


const MotionBox = motion.create(Box);

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

// Wrap the main component with the ChatModeProvider
export default function ChatPage() {
  const { data: session } = useSession();
  const { currentUser } = useSelector((state: RootState) => state.user);

  if (!session) {
    return <Loading />;
  }

  return (
    <ChatModeProvider currentUser={currentUser}>
      <ChatPageContent />
    </ChatModeProvider>
  );
}

// The existing ChatPageContent component remains as is
const ChatPageContent = () => {
  const t = useTranslations("Chat");
  const { data: session } = useSession();
  const dispatch = useDispatch();

  // Get chat state from Redux
  const {
    rooms,
    selectedRoomId,
    messages,
    unreadCounts,
    isLoadingRooms,
    isLoadingMessages,
    messagesLoaded
  } = useSelector((state: RootState) => state.chat);

  const { currentUser, isOwner } = useSelector((state: RootState) => state.user);

  // UAT flag to check if user is not an owner
  const UAT = !isOwner;

  // Get messages for the selected room
  const currentMessages = selectedRoomId ? messages[selectedRoomId] || [] : [];

  const [messageInput, setMessageInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState<boolean>(false);
  const [isLayoutFlipped, setIsLayoutFlipped] = useState<boolean>(false);
  // Force chat mode for non-owners in UAT
  const [isTaskMode, setIsTaskMode] = useState<boolean>(!UAT);
  const [users, setUsers] = useState<User[]>([]);
  const [agents, setAgents] = useState<User[]>([]);

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
  const bgSubtle = useColorModeValue("rgba(249, 250, 251, 0.8)", "rgba(26, 32, 44, 0.8)");
  const textColor = useColorModeValue("gray.600", "gray.400");
  const textColorHeading = useColorModeValue("gray.800", "gray.100");
  const borderColor = useColorModeValue("gray.200", "gray.700");

  // Add these new color variables for chat mode - making them less green and more subtle
  const chatModeBg = useColorModeValue("rgba(245, 250, 248, 0.3)", "rgba(30, 40, 38, 0.3)");
  const chatModeBorder = useColorModeValue("gray.300", "gray.600");
  const chatModeHeading = useColorModeValue("teal.600", "teal.400");

  // Add this new state to track if event source is active
  const [isEventSourceActive, setIsEventSourceActive] = useState<boolean>(false);

  // Add this ref to store the event source instance
  const eventSourceRef = React.useRef<EventSource | null>(null);

  // Fetch rooms
  useEffect(() => {
    const fetchRooms = async () => {
      try {
        dispatch(setLoadingRooms(true));
        const response = await axios.get("/api/chat/get_rooms");
        dispatch(setRooms(response.data));
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

        // Fetch agents specifically
        const agentsResponse = await axios.get("/api/user/get_users?role=agent");
        setAgents(agentsResponse.data.users);
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

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedRoomId && isTaskMode) {
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
      toaster.create({
        title: t("agent_mentioned"),
        description: t("agent_mentioned_description"),
        type: "info"
      });

      // Extract the mentioned agent username
      let assigneeId = null;
      const mentionMatch = message.match(/@([a-zA-Z0-9_]+)/);

      if (mentionMatch && mentionMatch[1]) {
        const mentionedUsername = mentionMatch[1];

        // Only look for specific agents if we have agents available
        if (agents.length > 0) {
          // If it's the default "agent" mention, use the first available agent
          if (mentionedUsername === "agent") {
            assigneeId = agents[0].user_id;
          } else {
            // Find the specific agent that was mentioned
            const mentionedAgent = agents.find(agent => agent.username === mentionedUsername);
            if (mentionedAgent) {
              assigneeId = mentionedAgent.user_id;
            }
          }
        }
      }

      const url = `/api/mcp/summon`;
      const payload = {
        summoner: currentUser?.email,
        query: message,
        room_id: roomId,
        assigner: currentUser?.user_id,
        assignee: assigneeId,
        created_at: new Date().toISOString()
      };
      console.log("Payload:", payload);

      // Only add assignee to the payload if we found a valid assignee
      if (assigneeId) {
        // @ts-ignore
        payload.assignee = assigneeId;
      }

      await axios.post(url, payload);
    }
    catch (error) {
      toaster.create({
        title: t("error"),
        description: t("error_calling_agent_api"),
        type: "error"
      });
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

        toaster.create({
          title: t("room_created"),
          description: t("room_created_description"),
          type: "success"
        });
      } catch (error) {
        toaster.create({
          title: t("error"),
          description: t("error_creating_room"),
          type: "error"
        });
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
            dispatch(setLoadingMessages(true));
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
            toaster.create({
              title: t("error"),
              description: t("error_fetching_messages"),
              type: "error"
            });
          } finally {
            dispatch(setLoadingMessages(false));
          }
        }
      }
    };

    fetchMessages();
  }, [selectedRoomId, dispatch, messages, messagesLoaded]);

  const handleFlipLayout = () => {
    setIsLayoutFlipped(!isLayoutFlipped);
  };

  // Modify the handleTaskModeToggle function to prevent non-owners from switching to task mode
  const handleTaskModeToggle = () => {
    // If user is not an owner in UAT, don't allow switching to task mode
    if (UAT && isTaskMode === false) {
      return;
    }

    // If switching to task mode while event source is active
    if (isTaskMode === false && isEventSourceActive) {
      // Don't immediately clear messages, just pause the UI updates
      chatModeContext.setPauseUpdates(true);
    } else if (isTaskMode === true && isEventSourceActive) {
      // Resuming updates when switching back to chat mode
      chatModeContext.setPauseUpdates(false);
    }

    setIsTaskMode(!isTaskMode);
  };

  // Add this effect to clean up event source when component unmounts
  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
        setIsEventSourceActive(false);
      }
    };
  }, []);

  // Get the chat mode context
  const chatModeContext = useChatMode();

  // Use a ref to track if we're in task mode to avoid dependency cycles
  const isTaskModeRef = React.useRef(isTaskMode);
  isTaskModeRef.current = isTaskMode;

  // Effect to clear chat mode messages when switching back to task mode
  useEffect(() => {
    if (isTaskMode && !isTaskModeRef.current) {
      chatModeContext.clearChatModeMessages();
    }
    isTaskModeRef.current = isTaskMode;
  }, [isTaskMode, chatModeContext]);

  // Force chat mode for non-owners when component mounts
  useEffect(() => {
    if (UAT) {
      setIsTaskMode(false);
    }
  }, [UAT]);

  if (isLoadingRooms || isLoadingMessages || !session) {
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
        <Heading
          size="lg"
          mb={6}
          display="flex"
          alignItems="center"
          color={isTaskMode ? textColorHeading : "green.600"}
        >
          <Icon as={FaComments} mr={3} color={isTaskMode ? "blue.500" : "green.500"} />
          {t("chat")}
          {!isTaskMode && (
            <motion.span
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.3 }}
              style={{ marginLeft: '8px', color: 'green.500' }}
            >
              ({t("chat_mode")})
            </motion.span>
          )}
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
              opacity: isTaskMode ? 1 : 0,
              scale: isTaskMode ? 1 : 0.9,
              width: isTaskMode ? "300px" : "0px",
              pointerEvents: isTaskMode ? "auto" : "none",
            }}
            transition={{
              duration: 0.5,
              ease: "easeInOut",
              opacity: { duration: 0.3 },
              scale: { duration: 0.3 },
              width: { duration: 0.5 }
            }}
            position="absolute"
            height="100%"
            zIndex={1}
            whileHover={{ boxShadow: isTaskMode ? "0 4px 12px rgba(0,0,0,0.1)" : "none" }}
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
              left: !isTaskMode ? 0 : (isLayoutFlipped ? 0 : "300px"),
              width: !isTaskMode ? "100%" : (isLayoutFlipped ? "calc(100% - 300px - 1rem)" : "calc(100% - 300px - 1rem)"),
              opacity: 1,
              scale: 1,
            }}
            style={{
              backgroundColor: isTaskMode ? bgSubtle : chatModeBg,
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
            borderRadius="md"
            display="flex"
            flexDirection="column"
            borderWidth="1px"
            borderColor={isTaskMode ? borderColor : chatModeBorder}
            zIndex={2}
            whileHover={{ boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
          >
            {/* Chat header */}
            <Flex
              p={4}
              borderBottomWidth="1px"
              borderColor={isTaskMode ? borderColor : chatModeBorder}
              bg={isTaskMode ? bgSubtle : chatModeBg}
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
                      <Text
                        fontSize="lg"
                        fontWeight="bold"
                        color={isTaskMode ? textColorHeading : chatModeHeading}
                      >
                        {currentRoom?.name || t("select_room")}
                      </Text>
                      <AnimatePresence>
                        {isTaskMode && currentRoom && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                          >
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
                          </motion.div>
                        )}
                      </AnimatePresence>
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
                      transform: "translateY(-50%)",
                      display: "flex",
                      alignItems: "center",
                      gap: "12px"
                    }}
                  >
                    {/* Task mode toggle - disabled for non-owners in UAT */}
                    <Text
                      as="button"
                      color={isTaskMode ? "blue.500" : "green.500"}
                      fontWeight="medium"
                      cursor={UAT && !isTaskMode ? "not-allowed" : "pointer"}
                      onClick={handleTaskModeToggle}
                      opacity={UAT && !isTaskMode ? 0.6 : 1}
                      _hover={{
                        color: UAT && !isTaskMode ? (isTaskMode ? "blue.500" : "green.500") : (isTaskMode ? "blue.600" : "green.600"),
                        textDecoration: UAT && !isTaskMode ? "none" : "underline"
                      }}
                      transition="color 0.2s ease"
                    >
                      {isTaskMode
                        ? t("switch_to_chat_mode")
                        : UAT
                          ? `${t("switch_to_task_mode")} (${t("disabled_task_view_due_to_uat")})`
                          : t("switch_to_task_mode")
                      }
                    </Text>

                    {/* Reset chat button - only show in chat mode */}
                    {!isTaskMode && (
                      <Text
                        as="button"
                        color="green.500"
                        fontWeight="medium"
                        cursor="pointer"
                        onClick={() => chatModeContext.clearChatModeMessages()}
                        _hover={{ color: "green.600", textDecoration: "underline" }}
                        transition="color 0.2s ease"
                        ml={4}
                      >
                        {t("reset_chat_mode") || "Reset Chat"}
                      </Text>
                    )}

                    {/* Layout toggle - only show in task mode and for owners */}
                    {isTaskMode && !UAT && (
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
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>

            {/* Messages area - conditionally render based on mode */}
            {isTaskMode ? (
              <ChatMessageList
                messageGroups={groupedMessages}
                messagesEndRef={messagesEndRef}
                isTaskMode={isTaskMode}
              />
            ) : (
              <ChatModeMessageList messagesEndRef={messagesEndRef} />
            )}

            {/* Input area - conditionally render based on mode */}
            {isTaskMode ? (
              <ChatInput
                messageInput={messageInput}
                setMessageInput={setMessageInput}
                handleSendMessage={handleSendMessage}
                selectedRoomId={selectedRoomId}
                users={users}
                agents={agents}
                currentUser={currentUser}
                isTaskMode={isTaskMode}
              />
            ) : (
              <ChatModeInput
                currentUser={currentUser}
                setIsEventSourceActive={setIsEventSourceActive}
                eventSourceRef={eventSourceRef}
              />
            )}
          </MotionBox>
        </Flex>
      </MotionBox>
    </Container>
  );
};

