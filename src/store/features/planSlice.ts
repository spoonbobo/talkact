import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { IPlan, ITask, PlanStatus } from '@/types/plan';

// Define the state interface with string dates instead of Date objects
interface PlanState {
    plans: Array<Omit<IPlan, 'created_at' | 'updated_at' | 'completed_at'> & {
        created_at: string;
        updated_at: string;
        completed_at: string | null;
    }>;
    selectedPlanId: string | null;
    selectedTimelineItem: number | null;
    currentTaskId: number | null;
    tasks: Array<Omit<ITask, 'created_at' | 'start_time' | 'completed_at'> & {
        created_at: string | null;
        start_time: string | null;
        completed_at: string | null;
    }>;
    timelineData: Array<Omit<ITask, 'created_at' | 'start_time' | 'completed_at'> & {
        created_at: string | null;
        start_time: string | null;
        completed_at: string | null;
    }>;
    loading: {
        plans: boolean;
        tasks: boolean;
    };
    error: {
        plans: string | null;
        tasks: string | null;
    };
    statusFilter: PlanStatus | null;
    searchQuery: string;
}

// Initial state
const initialState: PlanState = {
    plans: [],
    selectedPlanId: null,
    selectedTimelineItem: null,
    currentTaskId: null,
    tasks: [],
    timelineData: [],
    loading: {
        plans: false,
        tasks: false,
    },
    error: {
        plans: null,
        tasks: null,
    },
    statusFilter: null,
    searchQuery: '',
};

// Async thunks for API calls
export const fetchPlans = createAsyncThunk(
    'plan/fetchPlans',
    async (_, { rejectWithValue }) => {
        try {
            const response = await fetch('/api/plan/get_plans', {
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`Server error (${response.status}): ${response.statusText}`);
            }

            const data = await response.json();

            // Process dates as strings for proper serialization
            const processedData = data.map((plan: any) => ({
                ...plan,
                created_at: plan.created_at ? new Date(plan.created_at).toISOString() : new Date().toISOString(),
                updated_at: plan.updated_at ? new Date(plan.updated_at).toISOString() : new Date().toISOString(),
                completed_at: plan.completed_at ? new Date(plan.completed_at).toISOString() : null,
                plan_id: plan.plan_id || plan.id,
                room_id: plan.room_id || null,
                status: plan.status || 'pending',
                progress: typeof plan.progress === 'number' ? plan.progress : 0
            }));

            return processedData;
        } catch (error) {
            console.error('Error fetching plans:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }
);

export const fetchTasks = createAsyncThunk(
    'plan/fetchTasks',
    async (planId: string, { rejectWithValue, signal }) => {
        try {
            const controller = new AbortController();
            signal.addEventListener('abort', () => controller.abort());

            const response = await fetch(`/api/plan/get_tasks?planId=${planId}`, {
                signal: controller.signal,
                headers: {
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                    'Pragma': 'no-cache',
                    'Expires': '0'
                }
            });

            if (!response.ok) {
                throw new Error(`Error fetching tasks: ${response.statusText}`);
            }

            const data = await response.json();
            console.log('data', data);

            // Process dates as strings for proper serialization
            const processedTasks = data.map((task: any) => {
                // Process tool data - ensure it's properly parsed if it's a string
                let toolData = task.tool;
                if (typeof toolData === 'string' && toolData) {
                    try {
                        toolData = JSON.parse(toolData);
                    } catch (e) {
                        console.error('Error parsing tool data:', e);
                        toolData = null;
                    }
                }

                // Process logs data - ensure it's properly parsed if it's a string
                let logsData = task.logs;
                if (typeof logsData === 'string' && logsData) {
                    try {
                        logsData = JSON.parse(logsData);
                    } catch (e) {
                        console.error('Error parsing logs data:', e);
                        logsData = {};
                    }
                }

                return {
                    ...task,
                    created_at: task.created_at ? new Date(task.created_at).toISOString() : null,
                    start_time: task.start_time ? new Date(task.start_time).toISOString() : null,
                    completed_at: task.completed_at ? new Date(task.completed_at).toISOString() : null,
                    tool: toolData,
                    logs: logsData
                };
            });

            console.log('Processed tasks with tool data:', processedTasks);
            return processedTasks;
        } catch (error) {
            // Don't reject if the request was aborted
            if (error instanceof DOMException && error.name === 'AbortError') {
                console.log('Fetch aborted');
                return [];
            }

            console.error('Error fetching tasks:', error);
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    },
    {
        // Add condition to prevent duplicate requests
        condition: (planId, { getState }) => {
            const state = getState() as { plan: PlanState };
            const { loading, selectedPlanId } = state.plan;

            // Skip if we're already loading tasks for this plan
            if (loading.tasks && selectedPlanId === planId) {
                return false;
            }
            return true;
        }
    }
);

// Create the slice
const planSlice = createSlice({
    name: 'plan',
    initialState,
    reducers: {
        selectPlan: (state, action: PayloadAction<string | null>) => {
            state.selectedPlanId = action.payload;
            state.selectedTimelineItem = null;
        },
        selectTimelineItem: (state, action: PayloadAction<number | null>) => {
            state.selectedTimelineItem = action.payload;
        },
        setSearchQuery: (state, action: PayloadAction<string>) => {
            state.searchQuery = action.payload;
        },
        setStatusFilter: (state, action: PayloadAction<PlanStatus | null>) => {
            state.statusFilter = action.payload;
        },
        clearTasksError: (state) => {
            state.error.tasks = null;
        },
        clearPlansError: (state) => {
            state.error.plans = null;
        },
        forceResetTasksLoading: (state) => {
            state.loading.tasks = false;
        },
        setCurrentTaskId: (state, action: PayloadAction<number | null>) => {
            state.currentTaskId = action.payload;
        },
        approvePlan: (state, action: PayloadAction<IPlan>) => {
            console.log('approvePlan reducer', action.payload);
            state.plans = state.plans.map((plan) =>
                plan.plan_id === action.payload.plan_id
                    ? { ...plan, status: 'running' }
                    : plan
            );
        }
    },
    extraReducers: (builder) => {
        // Handle fetchPlans
        builder.addCase(fetchPlans.pending, (state) => {
            state.loading.plans = true;
            state.error.plans = null;
        });
        builder.addCase(fetchPlans.fulfilled, (state, action) => {
            state.plans = action.payload;
            state.loading.plans = false;
        });
        builder.addCase(fetchPlans.rejected, (state, action) => {
            state.loading.plans = false;
            state.error.plans = action.payload as string;
        });

        // Handle fetchTasks
        builder.addCase(fetchTasks.pending, (state) => {
            state.loading.tasks = true;
            state.error.tasks = null;
        });
        builder.addCase(fetchTasks.fulfilled, (state, action) => {
            state.tasks = action.payload;
            state.timelineData = action.payload;

            // Calculate the current task ID (first non-completed task)
            const firstNonCompletedIndex = action.payload.findIndex((task: ITask) => !task.completed_at);
            state.currentTaskId = firstNonCompletedIndex >= 0 ? firstNonCompletedIndex : null;

            state.loading.tasks = false;
        });
        builder.addCase(fetchTasks.rejected, (state, action) => {
            state.loading.tasks = false;
            state.error.tasks = action.payload as string;
        });
    }
});

// Export actions and reducer
export const {
    selectPlan,
    selectTimelineItem,
    setSearchQuery,
    setStatusFilter,
    clearTasksError,
    clearPlansError,
    forceResetTasksLoading,
    setCurrentTaskId,
    approvePlan
} = planSlice.actions;

export default planSlice.reducer;
