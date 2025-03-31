import { IChatRoom } from "./chat";

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
}
