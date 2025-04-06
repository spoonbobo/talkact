import { User } from "./user";
import { IMessage } from "./chat";

export interface ITool {
    tool_name?: string;
    mcp_server?: string;
    description?: string;
    type?: string;
    args?: Record<string, any>;
}

export interface IContextItem {
    sender: User;
    message: IMessage;
}

export type PlanStatus = 'pending' | 'running' | 'success' | 'failure' | 'terminated';
export type TaskStatus = 'pending' | 'running' | 'success' | 'failure' | 'denied' | 'not_started';

export interface IPlan {
    id: string;
    plan_id: string;
    created_at: Date;
    updated_at: Date;
    completed_at: Date | null;
    plan_name: string;
    plan_overview: string;
    status: PlanStatus;
    progress: number;
    room_id: string;
    assigner: string;
    assignee: string;
    reviewer: string | null;
    logs: any;
    context: IContextItem[];
}

export interface ITask {
    id: string;
    task_id: string;
    plan_id: string;
    step_number: number;
    task_name: string;
    created_at: Date;
    start_time: Date | null;
    completed_at: Date | null;
    task_explanation: string;
    expected_result: string | null;
    mcp_server: string | null;
    tool: ITool | null;
    status: TaskStatus;
    result: string | null;
    logs: any;
} 