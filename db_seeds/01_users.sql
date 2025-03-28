-- Create roles first
CREATE ROLE spoonbobo WITH LOGIN PASSWORD 'bobo1234';
GRANT ALL PRIVILEGES ON DATABASE postgres TO spoonbobo;

-- Then create the users table and insert data
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id TEXT NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT,
    active_rooms TEXT[],
    archived_rooms TEXT[],
    password TEXT
);
