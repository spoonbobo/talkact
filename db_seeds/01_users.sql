-- Create roles first
CREATE ROLE spoonbobo WITH LOGIN PASSWORD 'bobo1234';
GRANT ALL PRIVILEGES ON DATABASE postgres TO spoonbobo;

-- Then create the users table and insert data
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    username TEXT NOT NULL UNIQUE,
    email TEXT NOT NULL UNIQUE,
    avatar TEXT,
    active_rooms UUID[],
    archived_rooms UUID[],
    password TEXT
);

INSERT INTO users (username, email, password) VALUES
('admin', 'admin@example.com', 'admin1234'),
('spoonbobo', 'spoonbobo@example.com', 'bobo1234');
