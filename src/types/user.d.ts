import { IChatRoom } from "./chat";

export interface User {
    user_id: string;
    username: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    active_rooms: IChatRoom[];
    archived_rooms: IChatRoom[];
    avatar: string;
    role: string;
}
