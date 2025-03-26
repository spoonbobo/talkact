"use client";

import {
  Box,
  Text,
  Flex,
  Icon,
  Container,
  Heading,
  Input,
  Avatar,
  VStack,
  Badge,
  AvatarGroup,
} from "@chakra-ui/react";
import { motion, AnimatePresence } from "framer-motion";
import { FaComments, FaPlus, FaPaperPlane, FaUsers } from "react-icons/fa";
import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import axios from "axios";
import { IMessage, IChatRoom, IChatRoomUpdate } from "@/types/chat";
import { User } from "@/types/user";
import { ChatBubble } from "@/components/chat/bubble";
import { useSession } from "next-auth/react";
import Loading from "@/components/loading";
import { useDispatch, useSelector } from 'react-redux';
import { RootState } from '@/store/store';
import { 
  setRooms, 
  setSelectedRoom, 
  setLoading,
  joinRoom
} from '@/store/features/chatSlice';
import { v4 as uuidv4 } from 'uuid';

const MotionBox = motion(Box);

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
    isSocketConnected 
  } = useSelector((state: RootState) => state.chat);
  
  const [messageInput, setMessageInput] = useState<string>("");
  const [isCreatingRoom, setIsCreatingRoom] = useState<boolean>(false);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [isCreatingRoomLoading, setIsCreatingRoomLoading] = useState<boolean>(false);

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

  // Sort rooms by last_updated timestamp (most recent first)
  const sortedRooms = [...rooms].sort((a, b) => {
    return (
      new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime()
    );
  });

  const handleSendMessage = () => {
    if (messageInput.trim() && selectedRoomId) {

      const newMessage: IMessage = {
        id: uuidv4(),
        room_id: selectedRoomId,
        sender: session?.user as User,
        content: messageInput,
        timestamp: new Date().toISOString(),
        avatar: session?.user?.image || "",
      };

      dispatch({ 
        type: 'chat/sendMessage', 
        payload: { message: newMessage } 
      });
      
      setMessageInput("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
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
        console.log("roomId", roomId);
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

  const handleKeyDownRoomName = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleCreateRoom();
    } else if (e.key === "Escape") {
      setIsCreatingRoom(false);
      setNewRoomName("");
    }
  };

  // Group messages by sender for continuous messages
  const groupedMessages = selectedRoomId 
    ? (messages[selectedRoomId]?.reduce(
        (
          acc: { sender: string; avatar: string; messages: IMessage[] }[],
          message,
          index
        ) => {
          const prevMessage = messages[selectedRoomId][index - 1];

          // Check if this message is from the same sender as the previous one
          const isContinuation =
            prevMessage && prevMessage.sender === message.sender;

          if (isContinuation) {
            // Add to the last group
            acc[acc.length - 1].messages.push(message);
          } else {
            // Create a new group
            acc.push({
              sender: message.sender.username,
              avatar: message.avatar,
              messages: [message],
            });
          }

          return acc;
        },
        []
      ) || [])
    : [];

  // Update to use selectedRoomId from Redux
  const currentRoom = rooms.find((r) => r.id === selectedRoomId);
  
  // Get messages for the selected room
  const currentMessages = selectedRoomId ? messages[selectedRoomId] || [] : [];

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
        transition={{ duration: 0.5 }}
        display="flex"
        flexDirection="column"
        overflow="hidden"
        position="relative"
      >
        <Heading size="lg" mb={6} display="flex" alignItems="center">
          <Icon as={FaComments} mr={3} color="blue.500" />
          {t("chat")}
        </Heading>

        <Flex
          width="100%"
          height="calc(100% - 60px)"
          position="relative"
          overflow="hidden"
        >
          {/* Left component - Room List */}
          <Box
            width="280px"
            height="100%"
            overflow="auto"
            pr={3}
            borderRightWidth="1px"
            borderColor="gray.200"
          >
            <Flex justifyContent="space-between" alignItems="center" mb={4}>
              <Text fontSize="xl" fontWeight="bold" textAlign="left">
                {t("rooms")}
              </Text>
              <Box
                as="button"
                py={2}
                px={3}
                borderRadius="md"
                bg="gray.100"
                color="gray.600"
                fontWeight="medium"
                fontSize="sm"
                _hover={{ bg: "gray.200" }}
                _active={{ bg: "gray.300" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                onClick={() => setIsCreatingRoom(true)}
                // @ts-ignore
                disabled={isCreatingRoomLoading}
              >
                <Flex align="center" justify="center">
                  <Icon as={FaPlus} mr={2} />
                  {t("new_room")}
                </Flex>
              </Box>
            </Flex>

            <VStack align="stretch">
              {sortedRooms.map((room: IChatRoom) => (
                <Flex
                  key={room.id}
                  p={3}
                  borderRadius="lg"
                  bg={selectedRoomId === room.id ? "blue.50" : "white"}
                  borderWidth="1px"
                  borderColor={
                    selectedRoomId === room.id ? "blue.300" : "gray.200"
                  }
                  _hover={{
                    bg: selectedRoomId === room.id ? "blue.50" : "gray.50",
                  }}
                  cursor="pointer"
                  onClick={() => dispatch(setSelectedRoom(room.id))}
                  align="center"
                  transition="all 0.2s"
                >
                  <Box flex="1">
                    <Flex justify="space-between" align="center" mb={1}>
                      <Text fontWeight="medium" fontSize="md">
                        {room.name}
                      </Text>
                      <AvatarGroup gap="0" size="xs">
                        {room.active_users.slice(0, 3).map((user, idx) => (
                          <Avatar.Root key={idx}>
                            <Avatar.Fallback name={user.username} />
                            <Avatar.Image src={user.avatar} />
                          </Avatar.Root>
                        ))}
                        {room.active_users.length > 3 && (
                          <Avatar.Root variant="solid">
                            <Avatar.Fallback>
                              +{room.active_users.length - 3}
                            </Avatar.Fallback>
                          </Avatar.Root>
                        )}
                      </AvatarGroup>
                    </Flex>

                    <Flex justify="space-between" align="center">
                      <Text fontSize="sm" color="gray.600" maxW="160px">
                        {new Date(room.last_updated).toLocaleString(undefined, {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                      {unreadCounts[room.id] > 0 && (
                        <Badge
                          borderRadius="full"
                          colorScheme="blue"
                          fontSize="xs"
                          px={2}
                        >
                          {unreadCounts[room.id]}
                        </Badge>
                      )}
                    </Flex>
                  </Box>
                </Flex>
              ))}
            </VStack>
          </Box>

          {/* Right component - Chat Interface */}
          <Box
            flex="1"
            height="100%"
            overflow="hidden"
            bg="white"
            borderRadius="md"
            display="flex"
            flexDirection="column"
          >
            {/* Chat header */}
            <Flex
              p={4}
              borderBottomWidth="1px"
              borderColor="gray.200"
              bg="white"
              align="center"
              minHeight="80px"
              width="100%"
            >
              <AnimatePresence mode="wait">
                {isCreatingRoom ? (
                  <motion.div
                    key="create-room"
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    style={{ width: "100%" }}
                  >
                    <Flex width="100%" align="center">
                      <Input
                        placeholder={t("enter_room_name")}
                        value={newRoomName}
                        onChange={(e) => setNewRoomName(e.target.value)}
                        onKeyDown={handleKeyDownRoomName}
                        autoFocus
                        mr={2}
                        flex="1"
                      />
                      <Box
                        as="button"
                        py={2}
                        px={4}
                        height="40px"
                        minWidth="80px"
                        borderRadius="md"
                        bg="blue.500"
                        color="white"
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: "blue.600" }}
                        _active={{ bg: "blue.700" }}
                        _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                        onClick={handleCreateRoom}
                        // @ts-ignore
                        disabled={!newRoomName.trim() || isCreatingRoomLoading}
                      >
                        {isCreatingRoomLoading ? t("creating") : t("create")}
                      </Box>
                      <Box
                        as="button"
                        py={2}
                        px={4}
                        ml={2}
                        height="40px"
                        minWidth="80px"
                        borderRadius="md"
                        bg="gray.200"
                        color="gray.600"
                        fontWeight="medium"
                        fontSize="sm"
                        _hover={{ bg: "gray.300" }}
                        _active={{ bg: "gray.400" }}
                        onClick={() => {
                          setIsCreatingRoom(false);
                          setNewRoomName("");
                        }}
                        // @ts-ignore
                        disabled={isCreatingRoomLoading}
                      >
                        {t("cancel")}
                      </Box>
                    </Flex>
                  </motion.div>
                ) : (
                  <motion.div
                    key="room-info"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Box ml={3}>
                      <Text fontSize="lg" fontWeight="bold">
                        {currentRoom?.name || t("select_room")}
                      </Text>
                      <Flex align="center">
                        <Icon
                          as={FaUsers}
                          color="blue.500"
                          boxSize={3}
                          mr={1}
                        />
                        <Text fontSize="xs" color="gray.500">
                          {t("active_users")}:{" "}
                          {currentRoom?.active_users?.length || 0}
                        </Text>
                      </Flex>
                    </Box>
                  </motion.div>
                )}
              </AnimatePresence>
            </Flex>

            {/* Messages area */}
            <Box
              flex="1"
              overflowY="auto"
              p={4}
              bg="white"
              display="flex"
              flexDirection="column"
              gap={4}
              css={{
                "&::-webkit-scrollbar": {
                  width: "8px",
                },
                "&::-webkit-scrollbar-track": {
                  background: "#f1f1f1",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb": {
                  background: "#c5c5c5",
                  borderRadius: "4px",
                },
                "&::-webkit-scrollbar-thumb:hover": {
                  background: "#a8a8a8",
                },
              }}
            >
              {groupedMessages.map((group, groupIndex) => (
                <Flex
                  key={groupIndex}
                  gap={2}
                  justifyContent={
                    group.sender === "User" ? "flex-end" : "flex-start"
                  }
                >
                  {group.sender !== "User" && (
                    <Avatar.Root size="sm">
                      <Avatar.Fallback name="AI Assistant" />
                      <Avatar.Image src="https://bit.ly/sage-adebayo" />
                    </Avatar.Root>
                  )}

                  <VStack
                    align={group.sender === "User" ? "flex-end" : "flex-start"}
                    maxWidth={group.sender === "User" ? "60%" : "70%"}
                  >
                    {/* User name display - only on first message */}
                    <Text
                      fontSize="xs"
                      fontWeight="bold"
                      color="gray.600"
                      ml={group.sender === "User" ? 0 : 1}
                      mr={group.sender === "User" ? 1 : 0}
                      mb={0}
                    >
                      {group.sender === "User" ? "You" : "AI Assistant"}
                    </Text>

                    {group.messages.map(
                      (message: IMessage, msgIndex: number) => (
                        <ChatBubble
                          key={message.id}
                          message={message}
                          isUser={group.sender === "User"}
                          isFirstInGroup={msgIndex === 0}
                        />
                      )
                    )}
                  </VStack>
                </Flex>
              ))}
            </Box>

            {/* Input area */}
            <Flex
              p={4}
              borderTopWidth="1px"
              borderColor="gray.200"
              bg="white"
              align="center"
            >
              <Input
                flex="1"
                placeholder={!selectedRoomId ? t("please_select_a_room") : t("type_message")}
                mr={2}
                value={messageInput}
                onChange={(e) => setMessageInput(e.target.value)}
                onKeyDown={handleKeyDown}
                borderRadius="full"
                size="md"
                disabled={!selectedRoomId}
              />

              <Box
                as="button"
                py={2}
                px={4}
                borderRadius="md"
                bg="blue.500"
                color="white"
                fontWeight="medium"
                fontSize="sm"
                _hover={{ bg: "blue.600" }}
                _active={{ bg: "blue.700" }}
                _disabled={{ opacity: 0.5, cursor: "not-allowed" }}
                onClick={handleSendMessage}
                // @ts-ignore
                disabled={!messageInput.trim() || !selectedRoomId}
              >
                <Flex align="center" justify="center">
                  <Icon as={FaPaperPlane} mr={2} />
                  {t("send")}
                </Flex>
              </Box>
            </Flex>
          </Box>
        </Flex>
      </MotionBox>
    </Container>
  );
}
