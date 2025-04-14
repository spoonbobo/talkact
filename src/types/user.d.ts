import { IChatRoom } from "./chat";

// Define the UserSettings interface
export interface UserSettings {
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
    user_settings: UserSettings;
}
