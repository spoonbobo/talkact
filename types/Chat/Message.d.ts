import { IUser } from "@/types/User/User";
import { IFile } from "../File/File";
import type OpenAI from 'openai';

export interface IChatMessageToolCallFunction {
    name: string;
    arguments: string | Record<string, any>; // Allows string or parsed object for arguments
}

export interface IChatMessageToolCall {
    id: string;
    type: 'function';
    function: IChatMessageToolCallFunction;
    tool_description?: string;
    mcp_server?: string;
    status?: 'pending' | 'approved' | 'denied' | 'executed' | 'error' | string;
    result?: string | Record<string, any>;
    execution_time_seconds?: number;
}

export interface IChatMessage {
    id: string;
    created_at: string;
    sender: string;
    chat_id: string;
    reactions?: IReaction[];
    reply_to?: string;
    mentions?: string[];
    file_ids?: string; // JSON string of file IDs, not array
    files?: IFile[]; // Populated when retrieved from DB
    poll?: string;
    contact?: string;
    gif?: string;
    text: string;
    sent_at: string;
    updated_at?: string;
    status: string;
    sender_object?: IUser;
    tool_calls?: IChatMessageToolCall[];
    is_tool_response?: boolean;
    responding_to_tool_call_id?: string;
    tool_function_name?: string;
}

export interface IReaction {
    id: string;
    created_at: string;
    reaction: string;
    message_id: string;
    user_id: string;
}

