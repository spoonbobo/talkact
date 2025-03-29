-- Create the task table
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    assigner UUID NOT NULL,
    assignee UUID NOT NULL,
    reviewer UUID,
    task_summarization TEXT NOT NULL,
    room_id UUID,
    context JSONB,
    tools_called JSONB,
    status TEXT, -- denied/pending/running/success/failure
    result TEXT, -- success/failure
    logs JSONB
);
