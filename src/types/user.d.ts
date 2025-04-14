// Define the UserSettings interface
export interface GeneralSettings {
    theme: string;
    language?: string;
}

export interface KnowledgeBaseSettings {
    source?: string;
    enableKnowledgeBase?: boolean;
    apiKey?: string;
    apiUrl?: string;
}

export interface MCPSettings {
    defaultModel?: string;
    temperature?: number;
    enableStreaming?: boolean;
    responseStyle?: string;
    apiKey?: string;
    apiUrl?: string;
}

export interface UserSettings {
    general?: GeneralSettings;
    knowledgeBase?: KnowledgeBaseSettings;
    mcp?: MCPSettings;
    // Add an index signature to allow string indexing
    [key: string]: any;
}

export interface User {
    id?: string;
    user_id: string;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
    active_rooms: string[];
    archived_rooms: string[];
    avatar?: string;
    role: string;
    settings: UserSettings;
}
