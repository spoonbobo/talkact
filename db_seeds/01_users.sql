-- Create roles first
CREATE ROLE spoonbobo WITH LOGIN PASSWORD 'bobo1234';
GRANT ALL PRIVILEGES ON DATABASE postgres TO spoonbobo;

-- Then create the users table and insert data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
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

INSERT INTO users (username, email, role, settings, avatar) VALUES ('agent', 'agent@agent.com', 'agent', '{"theme": "light"}', 'https://static.vecteezy.com/system/resources/thumbnails/046/435/654/small/illustration-of-a-cute-little-girl-with-a-smile-on-her-face-png.png');
INSERT INTO users (username, email, role, settings, avatar) VALUES ('deepseek', 'deepseek@llm.com', 'user', '{"theme": "light"}', 'https://diplo-media.s3.eu-central-1.amazonaws.com/2025/01/deepseek-italy-ban-garante.png');
