import { IChatRoom } from "./chat";

export interface User {
    id?: string;
    user_id: string;
    username: string;
    email: string;
    created_at: string;
    updated_at: string;
    active_rooms: IChatRoom[];
    archived_rooms: IChatRoom[];
    avatar?: string;
    role: string;
}
