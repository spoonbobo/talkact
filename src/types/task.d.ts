import { User } from "./user";
import { IMessage } from "./chat";

export interface ITool {
    tool_name: string;
    mcp_server: string;
    args: Record<string, any>;
}

export interface IContextItem {
    sender: User;
    message: IMessage;
}

export interface ITask {
    id: string;
    task_id: string;
    created_at: string;
    start_time: string;
    end_time: string;
    assigner: UUID;
    assignee: UUID;
    task_summarization: string;
    room_id: string;
    context: IContextItem[];
    tools_called: ITool[];
    status: string;
    result: string;
}