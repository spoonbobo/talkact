import { AppDispatch } from '@/store/store';
import { updateMessage, setStreamingState, stopStreaming, startStreaming } from '@/store/features/assistantSlice';

interface StreamingOptions {
    messageId: string;
    query: string;
    conversationHistory: string;
    locale: string;
    dispatch: AppDispatch;
}

class AssistantEventSource {
    private eventSource: EventSource | null = null;
    private messageId: string;
    private dispatch: AppDispatch;
    private query: string;
    private conversationHistory: string;
    private locale: string;

    constructor({ messageId, query, conversationHistory, locale, dispatch }: StreamingOptions) {
        this.messageId = messageId;
        this.dispatch = dispatch;
        this.query = query;
        this.conversationHistory = conversationHistory;
        this.locale = locale;

        // Instead of initializing the EventSource directly, we'll use the Redux middleware
        this.startStreaming();
    }

    private startStreaming() {
        // Dispatch the startStreaming action to trigger the middleware
        this.dispatch(startStreaming({
            messageId: this.messageId,
            query: this.query,
            conversationHistory: this.conversationHistory,
            locale: this.locale
        }));
    }

    public close() {
        // Dispatch the stopStreaming action to trigger the middleware
        this.dispatch(stopStreaming());
    }
}

export const createAssistantEventSource = (options: StreamingOptions): AssistantEventSource => {
    return new AssistantEventSource(options);
};

export const closeAssistantEventSource = (eventSource: AssistantEventSource | null) => {
    if (eventSource) {
        eventSource.close();
    }
};
