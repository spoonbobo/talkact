import { IChatRoom } from "./chat";

export interface User {
    id: number;
    username: string;
    email: string;
    // password: string;
    created_at: Date;
    updated_at: Date;
    active_rooms: IChatRoom[];
    archived_rooms: IChatRoom[];
    avatar: string;
}
