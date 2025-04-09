from typing import Dict, AsyncGenerator
import os
import uuid
import json
import asyncio

from qdrant_client import QdrantClient
from loguru import logger
from llama_index.core import VectorStoreIndex, StorageContext
from llama_index.vector_stores.qdrant import QdrantVectorStore # type: ignore
from llama_index.embeddings.ollama import OllamaEmbedding # type: ignore
from llama_index.core.llms import ChatMessage
from llama_index.llms.deepseek import DeepSeek


from schemas.document import Folder, DataSource
from schemas.document import QueryRequest
from readers.base_reader import BaseReader
from readers.local_store_reader import LocalStoreReader

class KBManager:
    """
    Manages configurable data sources
    Communicates with qdrant
    """
    lng_map = {
        "zh-HK": "廣東話",
        "ja": "日本語",
        "en": "English",
        "ko": "한국어",
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
        """
    }

    sources: Dict[str, type[BaseReader]] = {
        "local_store": LocalStoreReader
    }

    def __init__(
        self, config: dict,
        qdrant_client: QdrantClient
    ):
        self.config = config
        self.qdrant_client = qdrant_client
        self.documents = {}
        self.folder_structure = {}
        self.readers = {}
        self.indices = {}
        self.embed_model = OllamaEmbedding(
            model_name=os.getenv("EMBED_MODEL"),
            base_url=os.getenv("OLLAMA_API_BASE_URL")
        )
        self.llm = DeepSeek(
            model=os.getenv("OPENAI_MODEL"),
            api_key=os.getenv("OPENAI_API_KEY")
        )
        
        # Add message store for streaming resumption
        self._message_store = {}
    
    def load_documents(self):
        """Load documents from all sources"""
        for source_name, source_config in self.config.items():
            reader = self.sources[source_name]()
            reader.configure(source_config)
            docs = reader.load_documents()
            self.readers[source_name] = reader
            self.documents[source_name] = docs
            self.folder_structure[source_name] = self._build_folder_structure(docs)
        
        return self.documents
    
    def create_indices(self):
        """Create vector indices for all document sources and store in Qdrant"""
        self.indices = {}
        for source_name, docs in self.documents.items():
            logger.info(f"Creating index for {source_name} with {len(docs)} documents")
            
            # Extract original llama_index documents
            original_docs = [doc.original_doc for doc in docs if hasattr(doc, 'original_doc')]
            
            if not original_docs:
                logger.warning(f"No original documents found for {source_name}")
                continue
                
            # Create Qdrant vector store
            collection_name = f"kb_{source_name}"
            vector_store = QdrantVectorStore(
                client=self.qdrant_client,
                collection_name=collection_name
            )
            
            # Create storage context
            storage_context = StorageContext.from_defaults(vector_store=vector_store)
            
            # Create index with Ollama embedding model
            index = VectorStoreIndex.from_documents(
                original_docs,
                storage_context=storage_context,
                embed_model=self.embed_model
            )
            
            self.indices[source_name] = index
            logger.info(f"Successfully created index for {source_name} in Qdrant collection '{collection_name}'")
            
        return self.indices

    def generate_context(self, query_text: str, source_id: str, top_k: int = 5):
       """
       Generate context from knowledge base for LLM augmentation
       
       Returns:
           Formatted context string
       """
       results = self.query_knowledge_base(query_text, source_id, top_k)
       
       context = "Relevant information:\n\n"
       logger.info(f"Results: {len(results)}")
       for i, result in enumerate(results):
           context += f"[Document {i+1}] {result['text']}\n\n"
        
       return context

    def query_knowledge_base(self, query_text: str, source_id: str, top_k: int = 5):
       """
       Query the knowledge base and return relevant documents
       
       Args:
           query_text: The query string
           source_id: Optional specific source to query (or query all if None)
           top_k: Number of results to return
       
       Returns:
           List of retrieved documents with their scores
       """
       results = []
       sources_to_query = [source_id] if source_id else self.indices.keys()
       
       for source in sources_to_query:
           if source not in self.indices:
               continue
               
           query_engine = self.indices[source].as_query_engine(
               similarity_top_k=top_k,
               llm=self.llm
           )
           response = query_engine.query(query_text)
           
           # Extract nodes/documents from response
           if hasattr(response, 'source_nodes'):
               for node in response.source_nodes:
                   results.append({
                       "source": source,
                       "text": node.node.text,
                       "score": node.score,
                       "metadata": node.node.metadata
                   })
       
       # Sort by relevance score
       results.sort(key=lambda x: x["score"], reverse=True)
       return results[:top_k]

    async def stream_answer_with_context(self, query: QueryRequest):
        """
        Stream an answer using RAG with async support
        """
        # Handle both string and list inputs
        query_text = query.query[-1] if isinstance(query.query, list) else query.query
        
        # Generate context based on the latest query
        context = self.generate_context(query_text, query.source_id, query.top_k)
        
        prompt_template = self.lng_prompt[query.preferred_language]
        prompt = prompt_template.format(
            preferred_language=self.lng_map[query.preferred_language],
            context=context,
            conversation_history=query.conversation_history,
            query=query_text
        )
        
        # Stream tokens from the LLM
        for chunk in self.llm.stream_complete(prompt):
            # Extract the text from the CompletionResponse object
            if hasattr(chunk, 'delta'):
                token = chunk.delta
            elif hasattr(chunk, 'text'):
                token = chunk.text
            elif isinstance(chunk, dict) and 'text' in chunk:
                token = chunk['text']
            elif isinstance(chunk, str):
                token = chunk
            else:
                # Log the unexpected type for debugging
                logger.warning(f"Unexpected token type: {type(chunk)}, value: {chunk}")
                token = str(chunk)
            
            yield token
            await asyncio.sleep(0.01) 

    # Methods for message persistence
    def store_message(self, message_id: str, message_data: dict):
        """Store message data for potential resumption"""
        self._message_store[message_id] = message_data
        
        # Set expiration (optional) - remove after 30 minutes
        asyncio.create_task(self._expire_message(message_id, 1800))
    
    async def _expire_message(self, message_id: str, delay_seconds: int):
        """Remove message after delay"""
        await asyncio.sleep(delay_seconds)
        self.remove_message(message_id)
    
    def get_message_by_id(self, message_id: str):
        """Retrieve stored message data"""
        return self._message_store.get(message_id)
    
    def update_message_content(self, message_id: str, content: str):
        """Update the content of a stored message"""
        if message_id in self._message_store:
            self._message_store[message_id]["current_content"] = content
    
    def remove_message(self, message_id: str):
        """Remove a message from storage"""
        if message_id in self._message_store:
            del self._message_store[message_id]

    def answer_with_context(self, query: QueryRequest):
        """
        Generate an answer using RAG
        """
        # Handle both string and list inputs
        query_text = query.query[-1] if isinstance(query.query, list) else query.query
        
        # Generate context based on the latest query
        context = self.generate_context(query_text, query.source_id, query.top_k)
        
        prompt_template = self.lng_prompt[query.preferred_language]
        prompt = prompt_template.format(
            preferred_language=self.lng_map[query.preferred_language],
            context=context,
            conversation_history=query.conversation_history,
            query=query_text
        )
                
        if query.streaming:
            # Return generator for streaming
            return self.llm.stream_complete(prompt)
        else:
            answer = self.llm.complete(prompt)
            return answer

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
    
    def get_data_sources(self):
        """Return information about available data sources"""
        sources = []
        for source_name, docs in self.documents.items():
            source_info = DataSource(
                id=source_name,
                name=source_name.replace("_", " ").title(),
                icon="database",
                count=len(docs)
            )
            sources.append(source_info.dict())
        return sources
    
    def get_folder_structure(self, source_id):
        """Return the folder structure for a specific source"""
        return self.folder_structure.get(source_id, [])
    
    def get_documents(self, source_id):
        """Return all documents for a specific source"""
        docs = self.documents.get(source_id, [])
        return [doc.dict() if hasattr(doc, 'dict') else doc for doc in docs]
