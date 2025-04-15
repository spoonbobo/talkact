-- Create roles first
CREATE ROLE spoonbobo WITH LOGIN PASSWORD 'bobo1234';
GRANT ALL PRIVILEGES ON DATABASE postgres TO spoonbobo;

-- Then create the users table and insert data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    role TEXT NOT NULL DEFAULT 'user', -- user, admin, owner
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT,
    active_rooms UUID[],
    archived_rooms UUID[],
    settings JSONB
);

INSERT INTO users (user_id, username, email, role, settings) VALUES ('00000000-0000-0000-0000-000000000000', 'agent', 'agent@agent.com', 'agent', '{"theme": "light"}');
