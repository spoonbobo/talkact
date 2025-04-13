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
    layout: {
        containerWidth: number | null;
        sidebarWidth: number;
        viewMode: 'kanban' | 'calendar';
    };
    planOrders: Record<PlanStatus, string[]>;
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
    layout: {
        containerWidth: null,
        sidebarWidth: 300,
        viewMode: 'kanban'
    },
    planOrders: {
        pending: [],
        running: [],
        success: [],
        failure: [],
        terminated: []
    }
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
    async (planId: string, { rejectWithValue, signal, dispatch }) => {
        try {
            console.log(`[planSlice] Starting fetchTasks for plan ${planId}`);
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

            console.log(`[planSlice] Got response for plan ${planId}: status ${response.status}`);

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`[planSlice] Error fetching tasks: ${response.status} - ${errorText}`);
                throw new Error(`Server error (${response.status}): ${errorText}`);
            }

            const text = await response.text();
            console.log(`[planSlice] Got response text for plan ${planId}, length: ${text.length}`);

            let data;
            try {
                data = JSON.parse(text);
                console.log(`[planSlice] Successfully parsed JSON for plan ${planId}, found ${data.length} tasks`);
            } catch (e: any) {
                console.error(`[planSlice] Response text:`, text.substring(0, 200) + '...');
                throw new Error(`JSON parse error: ${e.message}`);
            }

            // Process dates as strings for proper serialization
            const processedTasks = data.map((task: any) => {
                // Process tool data - ensure it's properly parsed if it's a string
                let toolData = task.tool;
                if (typeof toolData === 'string' && toolData) {
                    try {
                        toolData = JSON.parse(toolData);
                    } catch (e) {
                        toolData = null;
                    }
                }

                // Process logs data - ensure it's properly parsed if it's a string
                let logsData = task.logs;
                if (typeof logsData === 'string' && logsData) {
                    try {
                        logsData = JSON.parse(logsData);
                    } catch (e) {
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

            console.log(`[planSlice] Completed processing tasks for plan ${planId}`);
            return processedTasks;
        } catch (error: any) {
            console.error(`[planSlice] Task fetch error for plan ${planId}:`, error);

            // Force reset loading state after a short delay to ensure UI doesn't get stuck
            setTimeout(() => {
                dispatch(forceResetTasksLoading());
            }, 500);

            if (error.name === 'AbortError') {
                return rejectWithValue('Fetch aborted');
            }
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred fetching tasks');
        }
    },
    {
        // Modify condition to be more permissive
        condition: (planId, { getState }) => {
            const state = getState() as { plan: PlanState };
            const { loading } = state.plan;

            // Only skip if we're already loading tasks
            if (loading.tasks) {
                console.log(`[planSlice] Skipping fetchTasks for plan ${planId} - already loading`);
                return false;
            }
            return true;
        }
    }
);

export const updatePlanStatus = createAsyncThunk(
    'plan/updateStatus',
    async ({ planId, status }: { planId: string, status: PlanStatus }, { rejectWithValue, getState }) => {
        const state = getState() as { plan: PlanState };
        const planInStore = state.plan.plans.find(p => p.plan_id === planId || p.id === planId);
        const idToUse = planInStore?.plan_id || planId;

        try {
            const response = await fetch(`/api/plan/update_plan`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan_id: idToUse, status }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                return rejectWithValue(`Failed to update plan status: ${response.statusText} - ${errorText}`);
            }

            let updatedPlanData = null;
            try {
                const text = await response.text();
                if (text) {
                    updatedPlanData = JSON.parse(text).plan;
                }
            } catch (parseError) {
                // Continue even if parsing fails
            }

            window.dispatchEvent(new CustomEvent('plan-update', {
                detail: { planId: planId }
            }));

            return { planId: planId, status: status, updatedPlan: updatedPlanData };

        } catch (error) {
            return rejectWithValue(error instanceof Error ? error.message : 'An unknown error occurred');
        }
    }
);

// Add a new action to update plan orders
export const updatePlanOrders = createAsyncThunk(
    'plan/updatePlanOrders',
    async (planOrders: Record<PlanStatus, string[]>, { dispatch }) => {
        // This is just to persist the state - no API call needed
        return planOrders;
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
            state.plans = state.plans.map((plan) =>
                plan.plan_id === action.payload.plan_id
                    ? { ...plan, status: 'running' }
                    : plan
            );
        },
        updateContainerWidth: (state, action: PayloadAction<number | null>) => {
            state.layout.containerWidth = action.payload;
        },
        updateSidebarWidth: (state, action: PayloadAction<number>) => {
            state.layout.sidebarWidth = action.payload;
        },
        updateViewMode: (state, action: PayloadAction<'kanban' | 'calendar'>) => {
            state.layout.viewMode = action.payload;
        },
        // Add a new reducer to update plan orders
        setPlanOrders: (state, action: PayloadAction<Record<PlanStatus, string[]>>) => {
            state.planOrders = action.payload;
        },
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
        builder.addCase(fetchTasks.pending, (state, action) => {
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

        // Handle updatePlanStatus
        builder.addCase(updatePlanStatus.pending, (state, action) => {
            // Pending state handling without logs
        });
        builder.addCase(updatePlanStatus.fulfilled, (state, action) => {
            // Payload might be undefined if the thunk logic has issues, guard against it
            if (!action.payload) {
                return;
            }
            const { planId, status } = action.payload;

            const planIndex = state.plans.findIndex(p => p.plan_id === planId || p.id === planId);

            if (planIndex !== -1) {
                const oldStatus = state.plans[planIndex].status;
                // Update the plan status
                state.plans[planIndex] = { ...state.plans[planIndex], status: status };

                // Update plan orders if status actually changed
                if (oldStatus !== status) {
                    // Remove from old status order
                    if (state.planOrders[oldStatus]) {
                        state.planOrders[oldStatus] = state.planOrders[oldStatus].filter(id => id !== planId);
                    }
                    // Add to new status order (ensure array exists)
                    if (!state.planOrders[status]) {
                        state.planOrders[status] = [];
                    }
                    // Avoid duplicates if already present
                    if (!state.planOrders[status].includes(planId)) {
                        state.planOrders[status].push(planId);
                    }
                }
            }
        });
        builder.addCase(updatePlanStatus.rejected, (state, action) => {
            // Error handling without logs
        });

        // Handle updatePlanOrders
        builder.addCase(updatePlanOrders.fulfilled, (state, action) => {
            state.planOrders = action.payload;
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
    approvePlan,
    updateContainerWidth,
    updateSidebarWidth,
    updateViewMode,
    setPlanOrders,
} = planSlice.actions;

export default planSlice.reducer;
