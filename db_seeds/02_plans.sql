-- create the plan table
CREATE TABLE IF NOT EXISTS plan (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    plan_name TEXT,
    plan_overview TEXT,
    assigner UUID NOT NULL,
    assignee UUID NOT NULL,
    reviewer UUID,
    status TEXT, -- running/pending/success/failureterminated
    room_id UUID,
    progress INTEGER,
    logs JSONB,
    context JSONB
);

-- Create the task table
CREATE TABLE IF NOT EXISTS task (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    task_id UUID NOT NULL,
    plan_id UUID NOT NULL REFERENCES plan(id),
    step_number INTEGER NOT NULL, -- to track the order of tasks in a plan
    task_name TEXT NOT NULL, -- from the "name" field in your JSON
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    start_time TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    task_explanation TEXT NOT NULL, -- from the "explanation" field in your JSON
    expected_result TEXT, -- from the "expected_result" field in your JSON
    mcp_server TEXT,
    skills JSONB,
    status TEXT, -- pending/running/success/failure
    result TEXT,
    logs JSONB
);
