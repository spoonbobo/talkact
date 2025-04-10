import os
import asyncio
import traceback
from dotenv import load_dotenv

load_dotenv()
import socketio
import requests
from loguru import logger
from typing import Dict, Any, Optional, List, Callable

# from schemas.mcp impor
class SocketClient:
    def __init__(self, server_url: str, user_id: str):
        """
        Initialize the socket client.
        
        Args:
            server_url: URL of the socket.io server
            user_id: User ID for authentication
        """
        self.server_url = server_url
        self.user_id = user_id
        self.sio = socketio.AsyncClient() # type: ignore
        self.connected = False
        self.message_handlers = []
        self.notification_handlers = []
        
        # Set up event handlers
        self._setup_event_handlers()
    
    def _setup_event_handlers(self):
        """Set up the socket.io event handlers."""
        @self.sio.event
        async def connect():
            logger.info(f"Connected to socket server: {self.server_url}")
            self.connected = True
        
        @self.sio.event
        async def disconnect():
            logger.info("Disconnected from socket server")
            self.connected = False
        
        @self.sio.event
        async def message(data):
            logger.debug(f"Received message: {data}")
            for handler in self.message_handlers:
                try:
                    await handler(data)
                except Exception as e:
                    logger.error(f"Error in message handler: {e}")
                    logger.error(traceback.format_exc())
        
        @self.sio.event
        async def notification(data):
            logger.debug(f"Received notification: {data}")
            for handler in self.notification_handlers:
                try:
                    await handler(data)
                except Exception as e:
                    logger.error(f"Error in notification handler: {e}")
                    logger.error(traceback.format_exc())
    
    async def connect(self):
        """Connect to the socket server with authentication."""
        if not self.connected:
            try:
                # Connect with authentication data
                await self.sio.connect(
                    self.server_url,
                    auth={"user": {"user_id": self.user_id}}
                )
                logger.info(f"Connected to socket server as user {self.user_id}")
            except Exception as e:
                logger.error(f"Failed to connect to socket server: {e}")
                logger.error(traceback.format_exc())
    
    async def disconnect(self):
        """Disconnect from the socket server."""
        if self.connected:
            await self.sio.disconnect()
            logger.info("Disconnected from socket server")
    
    async def join_room(self, room_id: str):
        """
        Join a chat room.
        
        Args:
            room_id: ID of the room to join
        """
        if self.connected:
            await self.sio.emit("join_room", room_id)
            logger.info(f"Joined room: {room_id}")
    
    async def quit_room(self, room_id: str):
        """
        Leave a chat room.
        
        Args:
            room_id: ID of the room to leave
        """
        if self.connected:
            await self.sio.emit("quit_room", room_id)
            logger.info(f"Left room: {room_id}")
    
    async def invite_to_room(self, room_id: str, user_ids: List[str]):
        """
        Invite users to a room.
        
        Args:
            room_id: ID of the room
            user_ids: List of user IDs to invite
        """
        if self.connected:
            data = {
                "roomId": room_id,
                "userIds": user_ids
            }
            await self.sio.emit("invite_to_room", data)
            logger.info(f"Invited users {user_ids} to room {room_id}")
    
    async def send_message(self, message_data: Dict[str, Any]):
        """
        Send a message to a room.
        
        Args:
            message_data: Message data including room_id and content
        """
        if self.connected:
            await self.sio.emit("message", message_data)
            logger.info(f"Sent message to room {message_data.get('room_id')}")
    
    async def send_notification(self, notification_data: Dict[str, Any]):
        """
        Send a notification.
        
        Args:
            notification_data: Notification data including receivers and content
        """
        if self.connected:
            await self.sio.emit("notification", notification_data)
            # logger.info(f"Sent notification to {notification_data.get('receivers', [])} or room {notification_data.get('room_id')}")
            logger.info(f"sent notification to {notification_data}")

    def add_message_handler(self, handler: Callable):
        """
        Add a handler function for incoming messages.
        
        Args:
            handler: Async function that takes a message data dict as parameter
        """
        self.message_handlers.append(handler)
    
    def add_notification_handler(self, handler: Callable):
        """
        Add a handler function for incoming notifications.
        
        Args:
            handler: Async function that takes a notification data dict as parameter
        """
        self.notification_handlers.append(handler)

if __name__ == "__main__":
    print(os.environ)
    print(os.getenv("SOCKET_SERVER_URL"))
    client = SocketClient(
        server_url=os.getenv("SOCKET_SERVER_URL") or "",
        user_id="00000000-0000-0000-0000-000000000000"
    )
    asyncio.run(client.connect())
    asyncio.run(client.disconnect())
