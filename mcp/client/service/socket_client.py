import os
import asyncio
import traceback
import functools
from dotenv import load_dotenv

load_dotenv()
import socketio
import requests
from loguru import logger
from typing import Dict, Any, Optional, List, Callable

def with_retry_and_reconnect(max_retries=3, retry_delay=1):
    """
    Decorator for socket client methods that need retry logic and connection checking.
    
    Args:
        max_retries: Maximum number of retry attempts
        retry_delay: Delay between retries in seconds
    """
    def decorator(func):
        @functools.wraps(func)
        async def wrapper(self, *args, **kwargs):
            retries = 0
            while retries <= max_retries:
                # Check connection and reconnect if needed
                if not self.connected:
                    logger.info(f"Not connected. Attempting to reconnect before {func.__name__}...")
                    try:
                        await self.check_connection()
                        # Wait a bit for connection to stabilize
                        await asyncio.sleep(0.5)
                    except Exception as e:
                        logger.error(f"Reconnection failed: {e}")
                
                # If connected, try to execute the function
                if self.connected:
                    try:
                        return await func(self, *args, **kwargs)
                    except Exception as e:
                        logger.error(f"Error in {func.__name__}: {e}")
                        logger.error(traceback.format_exc())
                        if retries >= max_retries:
                            logger.error(f"Max retries ({max_retries}) reached for {func.__name__}")
                            raise
                
                # Increment retry counter and wait before next attempt
                retries += 1
                if retries <= max_retries:
                    logger.info(f"Retrying {func.__name__} ({retries}/{max_retries}) in {retry_delay}s...")
                    await asyncio.sleep(retry_delay)
            
            raise RuntimeError(f"Failed to execute {func.__name__} after {max_retries} retries")
        return wrapper
    return decorator

class SocketClient:
    def __init__(self, server_url: str, user_id: str, reconnect_interval: int = 5):
        """
        Initialize the socket client.
        
        Args:
            server_url: URL of the socket.io server
            user_id: User ID for authentication
            reconnect_interval: Seconds between reconnection attempts
        """
        self.server_url = server_url
        self.user_id = user_id
        self.sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0, logger=False) # type: ignore
        self.connected = False
        self.message_handlers = []
        self.notification_handlers = []
        self.reconnect_interval = reconnect_interval
        self.reconnect_task = None
        self.joined_rooms = set()  # Track joined rooms for reconnection
        self.pending_messages = []  # Store messages that need to be sent after reconnection
        self._shutdown_requested = False  # Flag to indicate graceful shutdown
        
        # Set up event handlers
        self._setup_event_handlers()
    
    def _setup_event_handlers(self):
        """Set up the socket.io event handlers."""
        @self.sio.event
        async def connect():
            logger.info(f"Connected to socket server: {self.server_url}")
            self.connected = True
            # Cancel any reconnect task if it's running
            if self.reconnect_task and not self.reconnect_task.done():
                self.reconnect_task.cancel()
                self.reconnect_task = None
            
            # Rejoin rooms after reconnection
            if self.joined_rooms:
                logger.info(f"Rejoining {len(self.joined_rooms)} rooms after reconnection")
                for room_id in self.joined_rooms:
                    await self.join_room(room_id)
                
                # Resend any pending messages after rejoining rooms
                if self.pending_messages:
                    logger.info(f"Resending {len(self.pending_messages)} pending messages")
                    # Wait a bit to ensure room joining is complete
                    await asyncio.sleep(0.5)
                    for message_data in self.pending_messages:
                        await self.send_message(message_data)
                    self.pending_messages = []  # Clear the pending messages after sending
        
        @self.sio.event
        async def disconnect():
            logger.info("Disconnected from socket server")
            self.connected = False
            # Start reconnect task if not already running
            if not self.reconnect_task or self.reconnect_task.done():
                self.reconnect_task = asyncio.create_task(self._reconnect_loop())
        
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
    
    async def _reconnect_loop(self):
        """Periodically attempt to reconnect until successful."""
        while not self.connected and not self._shutdown_requested:
            logger.info(f"Attempting to reconnect in {self.reconnect_interval} seconds...")
            await asyncio.sleep(self.reconnect_interval)
            try:
                await self.connect()
                if self.connected:
                    logger.info("Reconnection successful")
                    break
            except Exception as e:
                logger.error(f"Reconnection attempt failed: {e}")
    
    async def connect(self):
        """Connect to the socket server with authentication."""
        if not self.connected and not self._shutdown_requested:
            try:
                # Connect with authentication data
                await self.sio.connect(
                    self.server_url,
                    auth={"user": {"id": self.user_id}},
                    wait_timeout=10,  # Add timeout parameter
                    transports=['websocket']  # Prefer websocket transport
                )
                logger.info(f"Connected to socket server as user {self.user_id}")
            except Exception as e:
                logger.error(f"Failed to connect to socket server: {e}")
                logger.error(traceback.format_exc())
                raise  # Re-raise the exception to handle it at a higher level
    
    async def disconnect(self):
        """Disconnect from the socket server."""
        self._shutdown_requested = True  # Mark as shutdown requested
        
        # Cancel any reconnect task if it's running
        if self.reconnect_task and not self.reconnect_task.done():
            self.reconnect_task.cancel()
            self.reconnect_task = None
        
        if self.connected or self.sio.connected:
            try:
                await self.sio.disconnect()
                logger.info("Disconnected from socket server")
            except Exception as e:
                logger.error(f"Error during disconnect: {e}")
        
        self.connected = False
    
    async def check_connection(self):
        """Check connection status and reconnect if necessary."""
        if not self.connected and (not self.reconnect_task or self.reconnect_task.done()):
            logger.info("Connection check: Not connected. Starting reconnection...")
            try:
                # First try to disconnect properly if the client is in a bad state
                if self.sio.connected:
                    await self.sio.disconnect()
                    await asyncio.sleep(0.5)
                
                # Recreate the client if it's been closed
                if getattr(self.sio, '_closed', False):
                    logger.info("Socket client was closed. Creating a new client instance.")
                    self.sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0) # type: ignore
                    self._setup_event_handlers()
                
                self.reconnect_task = asyncio.create_task(self._reconnect_loop())
            except Exception as e:
                logger.error(f"Error during connection check: {e}")
                logger.error(traceback.format_exc())
        return self.connected
    
    async def join_room(self, room_id: str):
        """
        Join a chat room.
        
        Args:
            room_id: ID of the room to join
        """
        if self.connected:
            await self.sio.emit("join_room", room_id)
            logger.info(f"Joined room: {room_id}")
            self.joined_rooms.add(room_id)  # Track the joined room
    
    async def quit_room(self, room_id: str):
        """
        Leave a chat room.
        
        Args:
            room_id: ID of the room to leave
        """
        if self.connected:
            await self.sio.emit("quit_room", room_id)
            logger.info(f"Left room: {room_id}")
            if room_id in self.joined_rooms:
                self.joined_rooms.remove(room_id)  # Remove from tracked rooms
    
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
    
    @with_retry_and_reconnect(max_retries=3, retry_delay=1)
    async def send_message(self, message_data: Dict[str, Any]):
        """
        Send a message to a room with retry logic.
        
        Args:
            message_data: Message data including room_id and content
        """
        if self._shutdown_requested:
            logger.warning("Shutdown requested, not sending message")
            return
            
        if not self.connected:
            # Store the message to be sent after reconnection
            logger.info(f"Not connected. Storing message to room {message_data.get('room_id')} for later delivery")
            self.pending_messages.append(message_data)
            raise ConnectionError("Not connected to socket server")
        
        # Check if client is closed before sending
        if getattr(self.sio, '_closed', False):
            logger.warning("Socket client is closed. Attempting to recreate and reconnect.")
            self.sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0, logger=False) # type: ignore
            self._setup_event_handlers()
            await self.connect()
        
        try:
            await self.sio.emit("message", message_data)
            logger.info(f"Sent message to room {message_data.get('room_id')}")
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            if "packet queue is empty" in str(e):
                logger.warning("Packet queue empty error detected. Attempting to reconnect...")
                self.connected = False
                await self.check_connection()
                raise ConnectionError("Socket connection was in an invalid state")
            raise
    
    @with_retry_and_reconnect(max_retries=3, retry_delay=1)
    async def send_notification(self, notification_data: Dict[str, Any]):
        """
        Send a notification with retry logic.
        
        Args:
            notification_data: Notification data including receivers and content
        """
        if not self.connected:
            raise ConnectionError("Not connected to socket server")
            
        await self.sio.emit("notification", notification_data)
        logger.info(f"Sent notification: {notification_data}")

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
    
    async def main():
        client = SocketClient(
            server_url=os.getenv("SOCKET_SERVER_URL") or "",
            user_id="00000000-0000-0000-0000-000000000000"
        )
        try:
            await client.connect()
            # Test sending a message with retry logic
            await client.send_message({"room_id": "test", "content": "Test message"})
            # Add a small delay to keep the connection open for a moment
            await asyncio.sleep(2)
            await client.disconnect()
        except Exception as e:
            print(f"Error in main: {e}")
    
    asyncio.run(main())
