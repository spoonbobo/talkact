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
        self._message_ids_sent = set()  # Track message IDs that have been successfully sent
        self._heartbeat_task = None  # Add this line to track the heartbeat task
        
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
                for room_id in list(self.joined_rooms):  # Use a copy of the set to avoid modification during iteration
                    try:
                        await self.sio.emit("join_room", room_id)
                        logger.info(f"Rejoined room: {room_id}")
                    except Exception as e:
                        logger.error(f"Failed to rejoin room {room_id}: {e}")
                        # Don't remove from joined_rooms so we can try again later
                
                # Wait a bit to ensure room joining is complete
                await asyncio.sleep(1.0)
                
                # Resend any pending messages after rejoining rooms
                if self.pending_messages:
                    logger.info(f"Resending {len(self.pending_messages)} pending messages")
                    pending_copy = self.pending_messages.copy()
                    self.pending_messages = []  # Clear the list before resending to avoid duplicates
                    
                    for message_data in pending_copy:
                        try:
                            # Make sure we're in the room for this message
                            room_id = message_data.get('room_id')
                            message_id = message_data.get('id')
                            
                            # Skip if we've already sent this message successfully
                            if message_id and message_id in self._message_ids_sent:
                                logger.info(f"Skipping already sent message with ID: {message_id}")
                                continue
                                
                            if room_id and room_id not in self.joined_rooms:
                                await self.sio.emit("join_room", room_id)
                                logger.info(f"Joined room for pending message: {room_id}")
                                await asyncio.sleep(0.5)  # Give a moment for the join to take effect
                            
                            # Now send the message
                            await self.sio.emit("message", message_data)
                            logger.info(f"Resent pending message to room {room_id}, message ID: {message_id}")
                            
                            # Mark as sent
                            if message_id:
                                self._message_ids_sent.add(message_id)
                        except Exception as e:
                            logger.error(f"Failed to resend pending message: {e}")
                            # Put it back in the pending list
                            self.pending_messages.append(message_data)
        
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
        
        @self.sio.event
        async def pong(data):
            logger.debug(f"Received pong: {data}")
            # Optionally, update a last_pong timestamp here if you want to track latency or missed heartbeats
    
    async def _reconnect_loop(self):
        """Periodically attempt to reconnect until successful."""
        attempts = 0
        max_attempts = 10  # Limit the number of consecutive attempts
        
        while not self.connected and not self._shutdown_requested and attempts < max_attempts:
            attempts += 1
            logger.info(f"Attempting to reconnect (attempt {attempts}/{max_attempts}) in {self.reconnect_interval} seconds...")
            await asyncio.sleep(self.reconnect_interval)
            
            try:
                # Check if the socket.io client is in a bad state and recreate if needed
                if getattr(self.sio, '_closed', False) or (hasattr(self.sio, 'eio') and self.sio.eio and self.sio.eio.state != 'connected'):
                    logger.info("Recreating socket.io client before reconnection attempt")
                    self.sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0, logger=False) # type: ignore
                    self._setup_event_handlers()
                
                await self.connect()
                if self.connected:
                    logger.info("Reconnection successful")
                    attempts = 0  # Reset attempts counter on success
                    break
            except Exception as e:
                logger.error(f"Reconnection attempt {attempts} failed: {e}")
                
                # Increase delay for exponential backoff
                if attempts < max_attempts:
                    self.reconnect_interval = min(30, self.reconnect_interval * 1.5)  # Cap at 30 seconds
        
        if attempts >= max_attempts and not self.connected:
            logger.error(f"Failed to reconnect after {max_attempts} attempts. Will try again later.")
            # Reset reconnect interval for next time
            self.reconnect_interval = 5
    
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
                # Start the heartbeat task after successful connection
                if not self._heartbeat_task or self._heartbeat_task.done():
                    self._heartbeat_task = asyncio.create_task(self.start_heartbeat())
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
        
        # Cancel the heartbeat task if it's running
        if self._heartbeat_task and not self._heartbeat_task.done():
            self._heartbeat_task.cancel()
            self._heartbeat_task = None
        
        # Clear tracking sets
        self._message_ids_sent.clear()
        
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
                    try:
                        await self.sio.disconnect()
                    except Exception as e:
                        logger.warning(f"Error during disconnect in check_connection: {e}")
                    await asyncio.sleep(0.5)
                
                # Check if the socket.io client is in a bad state
                is_bad_state = False
                try:
                    # Try to access eio state - this will fail if the client is in a bad state
                    if hasattr(self.sio, 'eio') and self.sio.eio:
                        eio_state = self.sio.eio.state
                        if eio_state != 'connected':
                            is_bad_state = True
                            logger.warning(f"Socket.io engine in bad state: {eio_state}")
                    else:
                        is_bad_state = True
                except Exception:
                    is_bad_state = True
                
                # Recreate the client if it's been closed or is in a bad state
                if getattr(self.sio, '_closed', False) or is_bad_state:
                    logger.info("Socket client was closed or in bad state. Creating a new client instance.")
                    self.sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0, logger=False) # type: ignore
                    self._setup_event_handlers()
                
                # Start the reconnection process
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
        
        # Get message ID for tracking
        message_id = message_data.get('id')
        
        # Check if we've already sent this message successfully
        if message_id and message_id in self._message_ids_sent:
            logger.info(f"Message with ID {message_id} already sent successfully, skipping")
            return
            
        if not self.connected:
            # Store the message to be sent after reconnection
            logger.info(f"Not connected. Storing message to room {message_data.get('room_id')} for later delivery")
            # Check if this message is already in pending messages to avoid duplicates
            if not any(m.get('id') == message_id for m in self.pending_messages if message_id and m.get('id')):
                self.pending_messages.append(message_data)
            raise ConnectionError("Not connected to socket server")
        
        # Check connection health with a ping before sending the actual message
        try:
            # Send a lightweight ping to check if the connection is healthy
            # Don't use timeout parameter as it's not supported
            await self.sio.emit("ping", {"timestamp": "health_check"})
            logger.debug("Connection health check passed")
        except Exception as e:
            logger.warning(f"Connection health check failed: {e}")
            # Connection is not healthy, force reconnection
            self.connected = False
            
            # Store the message for later delivery if not already there
            if not any(m.get('id') == message_id for m in self.pending_messages if message_id and m.get('id')):
                self.pending_messages.append(message_data)
            
            # Reconnect and make sure we rejoin rooms
            await self.check_connection()
            
            # If we're now connected, make sure we've rejoined the room for this message
            if self.connected and 'room_id' in message_data:
                room_id = message_data.get('room_id')
                if room_id and room_id not in self.joined_rooms:
                    await self.join_room(room_id)
                    # Give a moment for the room join to take effect
                    await asyncio.sleep(0.5)
            
            raise ConnectionError("Socket connection failed health check")
        
        # Make sure we've joined the room for this message
        if 'room_id' in message_data:
            room_id = message_data.get('room_id')
            if room_id and room_id not in self.joined_rooms:
                await self.join_room(room_id)
                # Give a moment for the room join to take effect
                await asyncio.sleep(0.5)
        
        try:
            # If we got here, the connection passed the health check
            await self.sio.emit("message", message_data)
            logger.info(f"Sent message to room {message_data.get('room_id')}, message ID: {message_id}")
            
            # Mark this message as successfully sent
            if message_id:
                self._message_ids_sent.add(message_id)
            
            # Remove from pending messages if it was there
            self.pending_messages = [m for m in self.pending_messages if not (message_id and m.get('id') == message_id)]
            
        except Exception as e:
            logger.error(f"Error sending message: {e}")
            if "packet queue is empty" in str(e):
                logger.warning("Packet queue empty error detected. Attempting to reconnect...")
                self.connected = False
                
                # Store the message for later delivery if not already there
                if not any(m.get('id') == message_id for m in self.pending_messages if message_id and m.get('id')):
                    self.pending_messages.append(message_data)
                
                # Force recreation of the socket.io client
                self.sio = socketio.AsyncClient(reconnection=True, reconnection_attempts=0, logger=False) # type: ignore
                self._setup_event_handlers()
                
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

    async def start_heartbeat(self, interval=30):
        """
        Periodically send a ping to the server to check connection health.
        """
        import time
        while self.connected and not self._shutdown_requested:
            try:
                await self.sio.emit("ping", {"timestamp": time.time()})
                logger.debug("Sent ping to server")
                await asyncio.sleep(interval)
            except Exception as e:
                logger.warning(f"Heartbeat failed: {e}")
                self.connected = False
                await self.check_connection()
                break

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
