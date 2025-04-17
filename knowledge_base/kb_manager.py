from typing import Dict, AsyncGenerator, List, Optional
import os
import uuid
import json
import asyncio
import time
import pickle
import hashlib
import multiprocessing as mp
import concurrent.futures
from functools import partial

from qdrant_client import QdrantClient # type: ignore   
from loguru import logger
from llama_index.core import VectorStoreIndex, StorageContext # type: ignore
from llama_index.vector_stores.qdrant import QdrantVectorStore # type: ignore
from llama_index.embeddings.ollama import OllamaEmbedding # type: ignore
from llama_index.core.llms import ChatMessage # type: ignore
from llama_index.llms.deepseek import DeepSeek # type: ignore
from redis import RedisCluster # type: ignore

from schemas.document import Folder, DataSource, KnowledgeBaseRegistration
from schemas.document import QueryRequest
from readers.base_reader import BaseReader
from readers.local_store_reader import LocalStoreReader

class RedisEmbeddingCache:
    """Manages a shared cache of embeddings across processes using Redis"""
    
    def __init__(self, redis_client, ttl=86400):  # Default 24 hour TTL
        self.redis = redis_client
        self.ttl = ttl
        self.prefix = "embedding_cache:"
    
    def get_cache_key(self, text):
        """Generate a deterministic cache key"""
        # Use MD5 for consistent keys across processes
        hash_object = hashlib.md5(text.encode())
        return f"{self.prefix}{hash_object.hexdigest()}"
    
    def get_embedding(self, text):
        """Get embedding from cache if available"""
        if not self.redis:
            return None
            
        cache_key = self.get_cache_key(text)
        try:
            cached = self.redis.get(cache_key)
            if cached:
                return pickle.loads(cached)
        except Exception as e:
            logger.error(f"Error getting embedding from cache: {str(e)}")
        return None
    
    def store_embedding(self, text, embedding):
        """Store embedding in cache"""
        if not self.redis:
            return False
            
        cache_key = self.get_cache_key(text)
        try:
            binary_data = pickle.dumps(embedding)
            self.redis.setex(cache_key, self.ttl, binary_data)
            return True
        except Exception as e:
            logger.error(f"Error storing embedding: {str(e)}")
            return False

class CachedOllamaEmbedding(OllamaEmbedding):
    """OllamaEmbedding with Redis cache support"""
    
    def __init__(
        self,
        model_name: str | None = "",
        base_url: str | None = "",
        redis_client=None,
        cache_ttl=86400
    ):
        if model_name is None:
            model_name = "nomic-embed-text"
        if base_url is None:
            base_url = ""
        super().__init__(model_name=model_name, base_url=base_url)
        # Use private attribute to avoid Pydantic validation
        self._redis_cache = RedisEmbeddingCache(redis_client, cache_ttl) if redis_client else None
        
    async def _get_text_embedding_async(self, text):
        """Get embedding with caching"""
        if self._redis_cache:
            cached = self._redis_cache.get_embedding(text)
            if cached is not None:
                return cached
                
        # Not in cache, get from base model
        embedding = await super()._get_text_embedding_async(text)
        
        # Store in cache
        if self._redis_cache:
            self._redis_cache.store_embedding(text, embedding)
            
        return embedding
    
    def get_text_embedding(self, text):
        """Synchronous version with caching"""
        # Check cache synchronously first
        if self._redis_cache:
            cached = self._redis_cache.get_embedding(text)
            if cached is not None:
                return cached
        
        # Use base implementation
        embedding = super().get_text_embedding(text)
        
        # Store in cache
        if self._redis_cache:
            self._redis_cache.store_embedding(text, embedding)
            
        return embedding

class KBManager:
    """
    Manages configurable data sources
    Communicates with qdrant
    Uses Redis for shared state between processes
    """
    lng_map = {
        "zh-HK": "廣東話",
        "ja": "日本語",
        "en": "English",
        "ko": "한국어",
        "zh-CN": "简体中文",
        "th-TH": "ภาษาไทย",
        "vi-VN": "Tiếng Việt",
    }
    
    lng_prompt = {
        "zh-HK": """
        用 {preferred_language} 回應user既問題.
        儘可能以友好既態度滿足user的問題
        如果你系對話既背景完全找不到相關諮詢, 你可以話你不懂回答
        
        {conversation_history}
        
        以下系對話既背景:
        {context}
        
        用戶既問題: {query}
        
        你回答:
        """,
        "ja": """
        {preferred_language}でユーザーの質問に回答してください。
        できる限り友好的な態度でユーザーの質問に答えるよう努めてください。
        もし会話の背景から関連情報が全く見つからない場合は、回答できないとお伝えください。
        
        {conversation_history}
        
        以下が会話の背景です：
        {context}
        
        ユーザーの質問: {query}
        
        あなたの回答:
        """,
        "en": """
        Please respond to the user's question in {preferred_language}.
        Try to answer the user's question in a friendly manner.
        If you cannot find relevant information in the conversation context, you can state that you don't know the answer.
        
        {conversation_history}
        
        Here is the context for the conversation:
        {context}
        
        User's question: {query}
        
        Your answer:
        """,
        "ko": """
        {preferred_language}로 사용자의 질문에 답변해 주세요.
        가능한 한 친절한 태도로 사용자의 질문에 답변하도록 노력하세요.
        대화 배경에서 관련 정보를 전혀 찾을 수 없는 경우, 답변할 수 없다고 말할 수 있습니다.
        
        {conversation_history}
        
        다음은 대화의 배경입니다:
        {context}
        
        사용자의 질문: {query}
        
        당신의 답변:
        """,
        "zh-CN": """
        请用{preferred_language}回答用户的问题。
        尽量以友好的态度回答用户的问题。
        如果在对话背景中完全找不到相关信息，你可以表示你不知道答案。
        
        {conversation_history}
        
        以下是对话的背景：
        {context}
        
        用户的问题: {query}
        
        你的回答:
        """,
        "th-TH": """
        กรุณาตอบคำถามของผู้ใช้เป็น{preferred_language}
        พยายามตอบคำถามของผู้ใช้ด้วยท่าทีที่เป็นมิตร
        หากคุณไม่พบข้อมูลที่เกี่ยวข้องในบริบทของการสนทนา คุณสามารถระบุว่าคุณไม่ทราบคำตอบได้
        
        {conversation_history}
        
        นี่คือบริบทสำหรับการสนทนา:
        {context}
        
        คำถามของผู้ใช้: {query}
        
        คำตอบของคุณ:
        """,
        "vi-VN": """
        Vui lòng trả lời câu hỏi của người dùng bằng {preferred_language}.
        Cố gắng trả lời câu hỏi của người dùng một cách thân thiện.
        Nếu bạn không tìm thấy thông tin liên quan trong ngữ cảnh cuộc trò chuyện, bạn có thể nói rằng bạn không biết câu trả lời.
        
        {conversation_history}
        
        Đây là ngữ cảnh cho cuộc trò chuyện:
        {context}
        
        Câu hỏi của người dùng: {query}
        
        Câu trả lời của bạn:
        """
    }

    sources: Dict[str, type[BaseReader]] = {
        "local_store": LocalStoreReader
        # Other sources are disabled for now
    }

    def __init__(
        self,
        qdrant_client: QdrantClient
    ):
        self.qdrant_client = qdrant_client
        self.documents = {}
        self.folder_structure = {}
        self.readers = {}
        self.indices = {}
        
        # Initialize Redis connection
        self._setup_redis_connection()
        
        # Initialize embedding model with caching
        self.embed_model = CachedOllamaEmbedding(
            model_name=os.getenv("EMBED_MODEL"),
            base_url=os.getenv("OLLAMA_API_BASE_URL"),
            redis_client=self.redis_binary
        )
        
        self.llm = DeepSeek(
            model=os.getenv("OPENAI_MODEL"),
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Add message store for streaming resumption
        self._message_store = {}
        
        # Load KB status from Redis
        self._load_kb_status_from_redis()
        
        # Start the background task for processing KB registrations
        asyncio.create_task(self._process_kb_queue())
        
        # Add query queue
        self._query_queue = asyncio.Queue()
        asyncio.create_task(self._process_query_queue())
    
    def _setup_redis_connection(self):
        """Setup Redis connection with fallback options"""
        # redis_host = os.getenv("REDIS_HOST", "redis-node-0")
        redis_host = "redis-node-5"
        redis_port = int(os.getenv("REDIS_PORT", "6379"))
        redis_password = os.getenv("REDIS_PASSWORD", "bitnami")
        logger.info(f"Connecting to Redis at {redis_host}:{redis_port} with password {redis_password}")
        
        # Only try standalone Redis since RedisCluster is not available
        try:
            # Configure for Redis Cluster but using standard client with special handling
            self.redis_client = RedisCluster(
                host=redis_host,
                port=redis_port,
                password=redis_password,
                decode_responses=True,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
            # Test the connection
            self.redis_client.ping()
            logger.info(f"Successfully connected to Redis at {redis_host}:{redis_port}")
            
            # Binary client
            self.redis_binary = RedisCluster(
                host=redis_host, 
                port=redis_port,
                password=redis_password,
                decode_responses=False,
                socket_timeout=5.0,
                socket_connect_timeout=5.0,
                retry_on_timeout=True,
                health_check_interval=30
            )
            
        except Exception as e:
            logger.error(f"Failed to connect to Redis: {str(e)}")
            logger.warning("Using in-memory storage only (no process synchronization)")
            self.redis_client = None
            self.redis_binary = None
    
    # ... Other Redis helper methods remain unchanged ...
    
    def _redis_set(self, key, value):
        """Safely set a value in Redis with fallback to in-memory"""
        if self.redis_client:
            try:
                return self.redis_client.set(key, value)
            except Exception as e:
                logger.error(f"Redis set error: {str(e)}")
        return False
        
    def _redis_get(self, key):
        """Safely get a value from Redis with fallback"""
        if self.redis_client:
            try:
                return self.redis_client.get(key)
            except Exception as e:
                logger.error(f"Redis get error: {str(e)}")
        return None
        
    def _redis_delete(self, key):
        """Safely delete a key from Redis"""
        if self.redis_client:
            try:
                return self.redis_client.delete(key)
            except Exception as e:
                logger.error(f"Redis delete error: {str(e)}")
        return False
        
    def _redis_keys(self, pattern):
        """Safely get keys matching pattern from Redis"""
        if self.redis_client:
            try:
                return self.redis_client.keys(pattern)
            except Exception as e:
                logger.error(f"Redis keys error: {str(e)}")
        return []
    
    def _redis_expire(self, key, seconds):
        """Safely set expiration on a key"""
        if self.redis_client:
            try:
                return self.redis_client.expire(key, seconds)
            except Exception as e:
                logger.error(f"Redis expire error: {str(e)}")
        return False
    
    def _load_kb_status_from_redis(self):
        """Load KB status information from Redis"""
        try:
            # Initialize _kb_status dictionary
            self._kb_status = {}
            
            if self.redis_client:
                # Get all KB status keys
                kb_status_keys = self._redis_keys("kb_status:*")
                
                for key in kb_status_keys:
                    kb_id = key.split(":")[-1]
                    status = self._redis_get(key)
                    if status:
                        self._kb_status[kb_id] = status
                        
                # Load KB names
                self.kb_names = {}
                kb_name_keys = self._redis_keys("kb_name:*")
                for key in kb_name_keys:
                    kb_id = key.split(":")[-1]
                    name = self._redis_get(key)
                    if name:
                        self.kb_names[kb_id] = name
                        
                logger.info(f"Loaded KB status for {len(self._kb_status)} knowledge bases from Redis")
            else:
                logger.warning("Redis not available, using in-memory storage only")
                self.kb_names = {}
        except Exception as e:
            logger.error(f"Error loading KB status from Redis: {str(e)}")
            self._kb_status = {}
            self.kb_names = {}
            
        # Initialize queue
        self._kb_queue = asyncio.Queue()
    
    async def _process_kb_queue(self):
        """Background task to process knowledge base registrations"""
        while True:
            try:
                kb_item = await self._kb_queue.get()
                logger.info(f"Processing KB registration: {kb_item.id}")
                
                # Update status to initializing
                self._kb_status[kb_item.id] = "initializing"
                self._redis_set(f"kb_status:{kb_item.id}", "initializing")
                
                # Configure the reader based on the source type
                if kb_item.source_type not in self.sources:
                    logger.error(f"Unknown source type: {kb_item.source_type}")
                    self._kb_status[kb_item.id] = "error"
                    self._redis_set(f"kb_status:{kb_item.id}", "error")
                    continue
                
                # Create a config for this specific KB
                kb_config = {}
                
                # Handle different source types
                if kb_item.source_type == "local_store":
                    # Ensure the path exists and is accessible
                    if not kb_item.url:
                        logger.error(f"No path provided for local_store KB {kb_item.id}")
                        self._kb_status[kb_item.id] = "error"
                        self._redis_set(f"kb_status:{kb_item.id}", "error")
                        continue
                    
                    # Normalize path
                    path = os.path.normpath(kb_item.url)
                    if not os.path.exists(path):
                        logger.error(f"Path does not exist: {path} for KB {kb_item.id}")
                        self._kb_status[kb_item.id] = "error"
                        self._redis_set(f"kb_status:{kb_item.id}", "error")
                        continue
                    
                    kb_config["path"] = path
                else:
                    # Handle other source types
                    kb_config["url"] = kb_item.url
                
                # Initialize the reader
                try:
                    reader = self.sources[kb_item.source_type]()
                    reader.configure(kb_config)
                    
                    # Load documents
                    docs = reader.load_documents()
                    self.readers[kb_item.id] = reader
                    self.documents[kb_item.id] = docs
                    
                    # Store reader config in Redis
                    self._redis_set(f"kb_config:{kb_item.id}", json.dumps({
                        "source_type": kb_item.source_type,
                        "config": kb_config
                    }))
                    
                    # Build folder structure
                    folder_structure = self._build_folder_structure(docs)
                    self.folder_structure[kb_item.id] = folder_structure
                    
                    # Store folder structure in Redis
                    self._redis_set(f"kb_folder_structure:{kb_item.id}", json.dumps(folder_structure))
                    
                    # Create index for this KB using distributed processing
                    await asyncio.to_thread(self.create_indices_distributed, kb_item.id)
                    
                    # Update status to running
                    self._kb_status[kb_item.id] = "running"
                    self._redis_set(f"kb_status:{kb_item.id}", "running")
                    logger.info(f"KB {kb_item.id} is now running")
                except Exception as e:
                    logger.error(f"Error processing KB {kb_item.id}: {str(e)}")
                    self._kb_status[kb_item.id] = "error"
                    self._redis_set(f"kb_status:{kb_item.id}", "error")
            except Exception as e:
                logger.error(f"Error in KB queue processing: {str(e)}")
                await asyncio.sleep(5)  # Wait before retrying
    
    def create_index_worker(src_name, worker_config):
        """Worker process function to create index for a specific source"""
        try:
            # Setup Redis connection for worker
            redis_client = RedisCluster(
                host=worker_config["redis_host"],
                port=worker_config["redis_port"],
                password=worker_config["redis_password"],
                decode_responses=False
            )
            
            # Get documents from Redis
            docs_binary = redis_client.get(f"kb_documents_binary:{src_name}")
            if not docs_binary:
                return {"status": "error", "message": "Documents not found"}
                
            original_docs = pickle.loads(docs_binary)
            
            # Create embedding model with cache
            embed_model = CachedOllamaEmbedding(
                model_name=worker_config["embed_model"],
                base_url=worker_config["ollama_url"],
                redis_client=redis_client
            )
            
            # Setup Qdrant client
            qdrant_client = QdrantClient(
                url=worker_config["qdrant_url"],
                api_key=worker_config["qdrant_api_key"]
            )
            
            # Create Qdrant vector store
            collection_name = f"kb_{src_name}"
            vector_store = QdrantVectorStore(
                client=qdrant_client,
                collection_name=collection_name
            )
            
            # Create storage context
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            
            # Create index with embedding model
            index = VectorStoreIndex.from_documents(
                original_docs,
                storage_context=storage_context,
                embed_model=embed_model
            )
            
            # Signal completion in Redis
            redis_client = RedisCluster(
                host=worker_config["redis_host"],
                port=worker_config["redis_port"],
                password=worker_config["redis_password"],
                decode_responses=True
            )
            redis_client.set(f"kb_index_available:{src_name}", "true")
            
            return {"status": "success", "source": src_name}
        except Exception as e:
            return {"status": "error", "source": src_name, "error": str(e)}

    def create_indices_distributed(self, source_name=None):
        """Create indices using distributed worker processes"""
        sources_to_index = [source_name] if source_name else self.documents.keys()
        
        # First, store all document data in Redis for workers to access
        for src_name in sources_to_index:
            if src_name not in self.documents:
                continue
                
            docs = self.documents[src_name]
            # Extract original llama_index documents and ensure they're serializable
            original_docs = []
            for doc in docs:
                if hasattr(doc, 'original_doc'):
                    # Make a copy of the document without thread locks or unserializable objects
                    try:
                        # Try to directly serialize to detect any issues
                        pickle.dumps(doc.original_doc)
                        original_docs.append(doc.original_doc)
                    except Exception as e:
                        logger.warning(f"Could not serialize document directly: {str(e)}")
                        # Create a clean version of the document
                        # This depends on the document structure, but a simple approach is:
                        if hasattr(doc.original_doc, 'text') and hasattr(doc.original_doc, 'metadata'):
                            from llama_index.core import Document as LlamaDocument # type: ignore
                            clean_doc = LlamaDocument(
                                text=doc.original_doc.text,
                                metadata=doc.original_doc.metadata.copy() if doc.original_doc.metadata else {}
                            )
                            original_docs.append(clean_doc)
            
            if not original_docs:
                logger.warning(f"No original documents found for {src_name}")
                continue
                
            # Store documents in Redis (binary)
            if self.redis_binary:
                try:
                    docs_binary = pickle.dumps(original_docs)
                    self.redis_binary.set(f"kb_documents_binary:{src_name}", docs_binary)
                    logger.info(f"Stored documents for {src_name} in Redis")
                except Exception as e:
                    logger.error(f"Error storing documents in Redis: {str(e)}")
                    # Fall back to non-distributed indexing
                    logger.info(f"Falling back to standard indexing for {src_name}")
                    self.create_indices(src_name)
                    continue
        
        # Configuration for workers
        worker_config = {
            "redis_host": os.getenv("REDIS_HOST", "redis-node-5"),
            "redis_port": int(os.getenv("REDIS_PORT", "6379")),
            "redis_password": os.getenv("REDIS_PASSWORD", "bitnami"),
            "qdrant_url": os.getenv("QDRANT_URL"),
            "qdrant_api_key": os.getenv("QDRANT_API_KEY"),
            "embed_model": os.getenv("EMBED_MODEL"),
            "ollama_url": os.getenv("OLLAMA_API_BASE_URL")
        }
        
        try:
            # Create a pool with limited number of processes
            num_processes = min(mp.cpu_count(), len(sources_to_index))
            with mp.Pool(processes=num_processes) as pool:
                # Create a partial function with the configuration
                work_func = partial(self.create_index_worker, worker_config=worker_config)
                
                # Apply the function to each source
                results = pool.map(work_func, sources_to_index)
            
            # Process results
            for result in results:
                if result["status"] == "success":
                    logger.info(f"Successfully created index for {result['source']} in worker process")
                else:
                    logger.error(f"Error creating index for {result.get('source', 'unknown')}: {result.get('error')}")
                    # Fall back to standard indexing
                    if "source" in result:
                        self.create_indices(result["source"])
        except Exception as e:
            logger.error(f"Error in distributed indexing: {str(e)}")
            # Fall back to standard indexing for all sources
            logger.info(f"Falling back to standard indexing for all sources due to: {str(e)}")
            return self.create_indices(source_name)
        
        return self.indices
    
    def create_indices(self, source_name=None):
        """
        Create vector indices for document sources and store in Qdrant
        
        Args:
            source_name: Optional specific source to create index for (or create all if None)
        
        Returns:
            Dictionary of created indices
        """
        sources_to_index = [source_name] if source_name else self.documents.keys()
        
        for src_name in sources_to_index:
            if src_name not in self.documents:
                # Try to load documents from other workers via Redis
                self._load_documents_from_redis(src_name)
                
                if src_name not in self.documents:
                    logger.warning(f"Source {src_name} not found in documents")
                    continue
                
            docs = self.documents[src_name]
            logger.info(f"Creating index for {src_name} with {len(docs)} documents")
            
            # Extract original llama_index documents
            original_docs = [doc.original_doc for doc in docs if hasattr(doc, 'original_doc')]
            
            if not original_docs:
                logger.warning(f"No original documents found for {src_name}")
                continue
                
            # Create Qdrant vector store
            collection_name = f"kb_{src_name}"
            vector_store = QdrantVectorStore(
                client=self.qdrant_client,
                collection_name=collection_name
            )
            
            # Create storage context
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            
            # Create index with cached embedding model
            index = VectorStoreIndex.from_documents(
                original_docs,
                storage_context=storage_context,
                embed_model=self.embed_model
            )
            
            self.indices[src_name] = index
            
            # Signal in Redis that this index is available
            self._redis_set(f"kb_index_available:{src_name}", "true")
            
            logger.info(f"Successfully created index for {src_name} in Qdrant collection '{collection_name}'")
        
        return self.indices
    
    async def query_knowledge_base_parallel(self, query_text, knowledge_bases=None, top_k=5):
        """Query multiple knowledge bases in parallel using asyncio"""
        results = []
        
        # Determine which knowledge bases to query
        if knowledge_bases and len(knowledge_bases) > 0:
            # Filter to only include running knowledge bases from the provided list
            sources_to_query = []
            for kb_id in knowledge_bases:
                # Check status in Redis first
                status = self._redis_get(f"kb_status:{kb_id}")
                if status == "running":
                    sources_to_query.append(kb_id)
                elif kb_id in self._kb_status and self._kb_status[kb_id] == "running":
                    sources_to_query.append(kb_id)
            
            # Log if any requested knowledge bases are not running
            not_running = [kb_id for kb_id in knowledge_bases if kb_id not in sources_to_query]
            if not_running:
                logger.warning(f"Some requested knowledge bases are not running: {not_running}")
        else:
            # If no specific knowledge bases are requested, query all running ones
            sources_to_query = []
            # Check all known KBs in Redis
            kb_status_keys = self._redis_keys("kb_status:*")
            for key in kb_status_keys:
                kb_id = key.split(":")[-1]
                status = self._redis_get(key)
                if status == "running":
                    sources_to_query.append(kb_id)
        
        logger.info(f"Querying knowledge bases in parallel: {sources_to_query}")
        
        # Create tasks for each knowledge base
        async def query_single_kb(source):
            try:
                # Create index on demand if it doesn't exist
                if source not in self.indices:
                    if self._redis_get(f"kb_index_available:{source}") == "true":
                        # Try to load documents first
                        logger.info(f"Loading documents for {source} from Redis")
                        if source not in self.documents:
                            self._load_documents_from_redis(source)
                        
                        # Now try to create the index
                        if source in self.documents:
                            logger.info(f"Creating index for {source} loaded from another process")
                            self.create_indices(source)
                    elif source in self.documents:
                        logger.info(f"Creating index for {source} on demand")
                        self.create_indices(source)
                
                if source not in self.indices:
                    logger.warning(f"Source {source} not found in indices")
                    return []
                
                # Use a ThreadPoolExecutor to run the query in a background thread
                with concurrent.futures.ThreadPoolExecutor() as executor:
                    query_engine = self.indices[source].as_query_engine(
                        similarity_top_k=top_k,
                        llm=self.llm
                    )
                    
                    # Execute query in thread pool to avoid blocking the event loop
                    response = await asyncio.get_event_loop().run_in_executor(
                        executor, 
                        query_engine.query, 
                        query_text
                    )
            
                # Extract nodes/documents from response
                kb_results = []
                if hasattr(response, 'source_nodes'):
                    for node in response.source_nodes:
                        kb_results.append({
                            "source": source,
                            "text": node.node.text,
                            "score": node.score,
                            "metadata": node.node.metadata
                        })
                
                return kb_results
            except Exception as e:
                logger.error(f"Error querying {source}: {str(e)}")
                return []
        
        # Run all queries in parallel
        query_tasks = [query_single_kb(source) for source in sources_to_query]
        kb_results_list = await asyncio.gather(*query_tasks)
        
        # Combine all results
        for kb_results in kb_results_list:
            results.extend(kb_results)
        
        # Sort by relevance score
        results.sort(key=lambda x: x["score"], reverse=True)
        return results[:top_k]
    
    def query_knowledge_base(self, query_text: str, knowledge_bases: Optional[List[str]] = None, top_k: int = 5):
        """
        Query the knowledge base and return relevant documents (synchronous version)
        
        Args:
            query_text: The query string
            knowledge_bases: List of knowledge base IDs to query (optional)
            top_k: Number of results to return
        
        Returns:
            List of retrieved documents with their scores
        """
        # Run the async version in an event loop
        loop = asyncio.get_event_loop()
        return loop.run_until_complete(self.query_knowledge_base_parallel(query_text, knowledge_bases, top_k))

    async def generate_context_parallel(self, query_text: str, knowledge_bases: Optional[List[str]] = None, top_k: int = 5):
        """
        Generate context from knowledge base using parallel querying
        
        Args:
            query_text: The query string
            knowledge_bases: List of knowledge base IDs to query (optional)
            top_k: Number of results to return
        
        Returns:
            Formatted context string
        """
        results = await self.query_knowledge_base_parallel(query_text, knowledge_bases, top_k)
        
        context = "Relevant information:\n\n"
        logger.info(f"Results: {len(results)}")
        for i, result in enumerate(results):
            context += f"[Document {i+1}] {result['text']}\n\n"
         
        return context

    def generate_context(self, query_text: str, knowledge_bases: Optional[List[str]] = None, top_k: int = 5):
       """
       Generate context from knowledge base for LLM augmentation
       
       Args:
           query_text: The query string
           knowledge_bases: List of knowledge base IDs to query (optional)
           top_k: Number of results to return
       
       Returns:
           Formatted context string
       """
       results = self.query_knowledge_base(query_text, knowledge_bases, top_k)
       
       context = "Relevant information:\n\n"
       logger.info(f"Results: {len(results)}")
       for i, result in enumerate(results):
           context += f"[Document {i+1}] {result['text']}\n\n"
        
       return context

    async def stream_answer_with_context(self, query: QueryRequest):
        """
        Stream an answer using RAG with async support and parallel querying
        """
        # Handle both string and list inputs
        query_text = query.query[-1] if isinstance(query.query, list) else query.query
        
        # Generate context based on the latest query and knowledge bases
        context = await self.generate_context_parallel(query_text, query.knowledge_bases, query.top_k)
        
        prompt_template = self.lng_prompt[query.preferred_language]
        prompt = prompt_template.format(
            preferred_language=self.lng_map[query.preferred_language],
            context=context,
            conversation_history=query.conversation_history,
            query=query_text
        )
        
        # Stream tokens from the LLM
        return await self.llm.astream_complete(prompt)
    
    # Methods for message persistence - unchanged
    def store_message(self, message_id: str, message_data: dict):
        """Store message data for potential resumption"""
        self._message_store[message_id] = message_data
        
        # Also store in Redis for other processes
        self._redis_set(f"kb_message:{message_id}", json.dumps(message_data))
        
        # Set expiration (optional) - remove after 30 minutes
        self._redis_expire(f"kb_message:{message_id}", 1800)
        
        # Local expiration
        asyncio.create_task(self._expire_message(message_id, 1800))
    
    async def _expire_message(self, message_id: str, delay_seconds: int):
        """Remove message after delay"""
        await asyncio.sleep(delay_seconds)
        self.remove_message(message_id)
    
    def get_message_by_id(self, message_id: str):
        """Retrieve stored message data"""
        # Check local store first
        if message_id in self._message_store:
            return self._message_store[message_id]
            
        # If not in local store, check Redis
        message_json = self._redis_get(f"kb_message:{message_id}")
        if message_json:
            try:
                message_data = json.loads(message_json)
                # Update local store
                self._message_store[message_id] = message_data
                return message_data
            except Exception as e:
                logger.error(f"Error parsing message data from Redis: {str(e)}")
                
        return None
    
    def update_message_content(self, message_id: str, content: str):
        """Update the content of a stored message"""
        if message_id in self._message_store:
            self._message_store[message_id]["current_content"] = content
            # Also update in Redis
            message_data = self._message_store[message_id]
            self._redis_set(f"kb_message:{message_id}", json.dumps(message_data))
    
    def remove_message(self, message_id: str):
        """Remove a message from storage"""
        if message_id in self._message_store:
            del self._message_store[message_id]
        # Also remove from Redis
        self._redis_delete(f"kb_message:{message_id}")

    # Other methods remain unchanged
    def _build_folder_structure(self, documents):
        """Build a hierarchical folder structure from document paths"""
        folders = {}
        root_folders = []
        
        # First pass: identify all unique folders
        for doc in documents:
            folder_id = doc.get("folderId", "") if isinstance(doc, dict) else doc.folderId
            if not folder_id:
                continue
                
            parts = folder_id.split('/')
            current_path = ""
            
            for i, part in enumerate(parts):
                if not part:
                    continue
                    
                parent_path = current_path
                current_path = os.path.join(current_path, part) if current_path else part
                
                if current_path not in folders:
                    folder = Folder(
                        id=current_path,
                        name=part,
                        folders=[],
                        files=[],
                        isOpen=False
                    )
                    folders[current_path] = folder
                    
                    if parent_path:
                        if parent_path in folders:
                            if folder not in folders[parent_path].folders:
                                folders[parent_path].folders.append(folder)
                    else:
                        if folder not in root_folders:
                            root_folders.append(folder)
        
        # Second pass: add files to their respective folders
        for doc in documents:
            doc_id = doc.get("id", "") if isinstance(doc, dict) else doc.id
            folder_id = doc.get("folderId", "") if isinstance(doc, dict) else doc.folderId
            if folder_id in folders:
                folders[folder_id].files.append(doc_id)
        
        return [folder.dict() for folder in root_folders]

    async def _process_query_queue(self):
        """Background task to process knowledge base queries"""
        while True:
            try:
                query_wrapper = await self._query_queue.get()
                query_item = query_wrapper["query_request"]
                session_id = query_wrapper["session_id"]
                response_queue = query_wrapper["response_queue"]
                
                logger.info(f"Processing query: {session_id}")
                
                try:
                    # Generate streaming response using parallel processing
                    generator = await self.stream_answer_with_context(query_item)
                    
                    # Put the generator in the response queue
                    await response_queue.put({"status": "success", "generator": generator})
                except Exception as e:
                    logger.error(f"Error generating answer: {str(e)}")
                    # Send error to the response queue
                    await response_queue.put({"status": "error", "error": str(e)})
            except Exception as e:
                logger.error(f"Error in query processing: {str(e)}")
                await asyncio.sleep(5)  # Wait before retrying

    def get_kb_status(self, kb_id: str):
        """Get the status of a knowledge base from Redis"""
        # Check local cache first
        if kb_id in self._kb_status:
            return self._kb_status[kb_id]
        
        # If not in local cache, check Redis
        status = self._redis_get(f"kb_status:{kb_id}")
        if status:
            # Update local cache
            self._kb_status[kb_id] = status
            return status
        
        return "not_found"

    async def queue_query(self, query: QueryRequest, session_id: str):
        """
        Queue a query for processing by the background task
        
        Args:
            query: The query request
            session_id: Unique session ID for streaming
            
        Returns:
            Queue for retrieving the response
        """
        # Create a response queue for this specific query
        response_queue = asyncio.Queue()
        
        # Create a query wrapper with the ID and response queue
        query_wrapper = {
            "query_request": query,
            "session_id": session_id,
            "response_queue": response_queue
        }
        
        # Add to the query queue
        await self._query_queue.put(query_wrapper)
        
        return response_queue

    def _load_documents_from_redis(self, source_name):
        """Try to load documents and configuration for a knowledge base from Redis"""
        try:
            # Check if the source has been configured by another process
            kb_config_json = self._redis_get(f"kb_config:{source_name}")
            if not kb_config_json:
                return False
            
            kb_config = json.loads(kb_config_json)
            source_type = kb_config.get("source_type")
            config = kb_config.get("config", {})
            
            if source_type not in self.sources:
                logger.warning(f"Unknown source type in Redis: {source_type}")
                return False
            
            # Initialize the reader
            reader = self.sources[source_type]()
            reader.configure(config)
            
            # Load documents
            docs = reader.load_documents()
            self.readers[source_name] = reader
            self.documents[source_name] = docs
            
            # Load folder structure
            folder_structure_json = self._redis_get(f"kb_folder_structure:{source_name}")
            if folder_structure_json:
                self.folder_structure[source_name] = json.loads(folder_structure_json)
            else:
                self.folder_structure[source_name] = self._build_folder_structure(docs)
            
            return True
        except Exception as e:
            logger.error(f"Error loading documents from Redis for {source_name}: {str(e)}")
            return False

    def get_folder_structure(self, source_id):
        """Return the folder structure for a specific source"""
        # Check local cache first
        if source_id in self.folder_structure:
            return self.folder_structure[source_id]
        
        # If not in local cache, check Redis
        folder_structure_json = self._redis_get(f"kb_folder_structure:{source_id}")
        if folder_structure_json:
            try:
                folder_structure = json.loads(folder_structure_json)
                # Update local cache
                self.folder_structure[source_id] = folder_structure
                return folder_structure
            except Exception as e:
                logger.error(f"Error parsing folder structure from Redis: {str(e)}")
            
        return []

    def get_documents(self, source_id):
        """Return all documents for a specific source"""
        # Check local cache first
        if source_id in self.documents:
            docs = self.documents[source_id]
            return [doc.dict() if hasattr(doc, 'dict') else doc for doc in docs]
        
        # If not in local cache, try to load from Redis via reader config
        if self._load_documents_from_redis(source_id):
            docs = self.documents[source_id]
            return [doc.dict() if hasattr(doc, 'dict') else doc for doc in docs]
            
        return []

    def update_kb_status(self, kb_id: str, enabled: bool):
        """Update the status of a knowledge base (enable/disable)"""
        # Check if knowledge base exists in Redis
        redis_status = self._redis_get(f"kb_status:{kb_id}")
        if not redis_status:
            logger.warning(f"Knowledge base {kb_id} not found in Redis")
            return {"status": "error", "message": "Knowledge base not found"}
        
        # Update in Redis
        if enabled:
            # Only change to running if it was previously disabled (not in error state)
            if redis_status == "disabled":
                self._redis_set(f"kb_status:{kb_id}", "running")
                logger.info(f"Knowledge base {kb_id} enabled in Redis")
                # Also update local status
                self._kb_status[kb_id] = "running"
        else:
            # Disable the knowledge base
            if redis_status == "running":
                self._redis_set(f"kb_status:{kb_id}", "disabled")
                logger.info(f"Knowledge base {kb_id} disabled in Redis")
                # Also update local status
                self._kb_status[kb_id] = "disabled"
        
        return {"status": "success", "id": kb_id, "enabled": enabled}

    def delete_knowledge_base(self, kb_id: str):
        """Delete a knowledge base completely"""
        # Check if knowledge base exists in Redis
        redis_status = self._redis_get(f"kb_status:{kb_id}")
        if not redis_status:
            logger.warning(f"Knowledge base {kb_id} not found in Redis")
            return {"status": "error", "message": "Knowledge base not found"}
        
        try:
            # Remove from Redis
            self._redis_delete(f"kb_status:{kb_id}")
            self._redis_delete(f"kb_name:{kb_id}")
            self._redis_delete(f"kb_config:{kb_id}")
            self._redis_delete(f"kb_folder_structure:{kb_id}")
            self._redis_delete(f"kb_index_available:{kb_id}")
            
            # Remove from local status tracking
            if kb_id in self._kb_status:
                del self._kb_status[kb_id]
            
            # Remove from readers
            if kb_id in self.readers:
                del self.readers[kb_id]
            
            # Remove from documents
            if kb_id in self.documents:
                del self.documents[kb_id]
            
            # Remove from folder structure
            if kb_id in self.folder_structure:
                del self.folder_structure[kb_id]
            
            # Remove from indices and delete collection
            if kb_id in self.indices:
                # Delete the Qdrant collection
                collection_name = f"kb_{kb_id}"
                try:
                    self.qdrant_client.delete_collection(collection_name)
                    logger.info(f"Deleted Qdrant collection {collection_name}")
                except Exception as e:
                    logger.error(f"Error deleting Qdrant collection {collection_name}: {str(e)}")
            
            # Remove from indices
            self._redis_delete(f"kb_index_available:{kb_id}")
        
            logger.info(f"Knowledge base {kb_id} deleted")
            return {"status": "success", "message": f"Knowledge base {kb_id} deleted"}
        except Exception as e:
            logger.error(f"Error deleting knowledge base {kb_id}: {str(e)}")
            return {"status": "error", "message": str(e)}

    def get_data_sources(self):
        """Return information about available data sources"""
        sources = []
        
        try:
            # Get in-memory knowledge bases
            for source_name, status in self._kb_status.items():
                if status == "running":
                    # Get document count
                    doc_count = 0
                    if source_name in self.documents:
                        doc_count = len(self.documents[source_name])
                    
                    # Get display name
                    display_name = source_name
                    # Try Redis first
                    kb_name = self._redis_get(f"kb_name:{source_name}")
                    if kb_name:
                        display_name = kb_name
                    # Then try in-memory
                    elif hasattr(self, 'kb_names') and source_name in self.kb_names:
                        display_name = self.kb_names[source_name]
                    # Last resort, use ID prefix
                    elif "-" in source_name:
                        display_name = f"{source_name.split('-')[0]} KB"
                    
                    logger.info(f"Adding data source from memory: {source_name} ({display_name}) with {doc_count} documents")
                    
                    source_info = DataSource(
                        id=source_name,
                        name=display_name,
                        icon="database",
                        count=doc_count
                    )
                    sources.append(source_info.dict())
            
            # Also check Redis for any knowledge bases not yet loaded in memory
            kb_status_keys = self._redis_keys("kb_status:*")
            for key in kb_status_keys:
                source_name = key.split(":")[-1]
                # Skip if already processed from in-memory
                if source_name in self._kb_status:
                    continue
                
                status = self._redis_get(key)
                if status == "running":
                    # Try to load documents if not already loaded
                    doc_count = 0
                    if source_name in self.documents:
                        doc_count = len(self.documents[source_name])
                    else:
                        loaded = self._load_documents_from_redis(source_name)
                        if loaded and source_name in self.documents:
                            doc_count = len(self.documents[source_name])
                    
                    # Get display name
                    display_name = source_name
                    kb_name = self._redis_get(f"kb_name:{source_name}")
                    if kb_name:
                        display_name = kb_name
                    elif "-" in source_name:
                        display_name = f"{source_name.split('-')[0]} KB"
                    
                    logger.info(f"Adding data source from Redis: {source_name} ({display_name}) with {doc_count} documents")
                    
                    source_info = DataSource(
                        id=source_name,
                        name=display_name,
                        icon="database",
                        count=doc_count
                    )
                    sources.append(source_info.dict())
            
            logger.info(f"Total data sources found: {len(sources)}")
            return sources
        except Exception as e:
            logger.error(f"Error in get_data_sources: {str(e)}")
            import traceback
            logger.error(traceback.format_exc())
            return sources

    def register_knowledge_base(self, kb_item: KnowledgeBaseRegistration):
        """Register a new knowledge base and queue it for processing"""
        # Set initial status as disabled
        self._kb_status[kb_item.id] = "disabled"
        self._redis_set(f"kb_status:{kb_item.id}", "disabled")
        
        # Store the KB name for display purposes
        if not hasattr(self, 'kb_names'):
            self.kb_names = {}
        self.kb_names[kb_item.id] = kb_item.name or kb_item.id
        self._redis_set(f"kb_name:{kb_item.id}", kb_item.name or kb_item.id)
        
        # Add to processing queue
        asyncio.create_task(self._kb_queue.put(kb_item))
        
        return {"status": "queued", "id": kb_item.id}