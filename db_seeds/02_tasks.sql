-- Create the task table
CREATE TABLE IF NOT EXISTS task (
    id SERIAL PRIMARY KEY,
    task_id TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    task_summarization TEXT NOT NULL,
    room_id TEXT,
    context JSONB,
    tools_called JSONB,
    status TEXT, -- denied/pending/running/success/failure
    result TEXT -- success/failure
);
