// Import Field type from MCPDialog
import { Field } from "@/renderer/components/Dialog/MCP/MCPDialog";
import { ReactNode } from "react";

export interface IBaseServerConfig {
    enabled: boolean;
    configured: boolean;
    config: any;
}

export interface IServerModule<TConfig = any> {
    // Configuration
    defaultConfig: TConfig;

    // Validation
    isConfigured: (config: TConfig) => boolean;

    // Client initialization
    createClientConfig: (config: TConfig, homedir: string) => {
        enabled: boolean;
        command: string;
        args: string[];
        env?: Record<string, string>;
        clientName: string;
        clientVersion: string;
    };

    // Store actions
    setEnabled: (enabled: boolean) => Promise<void>;
    setConfig: (config: Partial<TConfig>) => void;
    setAutoApproved: (autoApproved: boolean) => void;

    // State getters
    getEnabled: () => boolean;
    getConfig: () => TConfig;
    getConfigured: () => boolean;
    getAutoApproved: () => boolean;
}

// Enhanced server metadata interface
export interface IServerMetadata {
    id: string;
    title: string;
    description: string;
    version: string;
    icon?: string; // Icon name or component
    sourceUrl?: string;
    platforms?: ('windows' | 'macos' | 'linux')[];
    category?:
    | 'communication'
    | 'weather'
    | 'location'
    | 'research'
    | 'productivity'
    | 'delivery'
    | 'development'
    | 'accommodation'
    | 'learning'
    | 'other';
}

// Enhanced server module interface
export interface IEnhancedServerModule<TConfig = any> extends IServerModule<TConfig> {
    metadata: IServerMetadata;

    // UI Configuration - make getDialogFields optional since we might use DialogComponent
    getDialogFields?: () => Field[];
    validateConfig?: (config: TConfig) => { isValid: boolean; errors?: Record<string, string> };

    // Optional custom components
    customServerCard?: React.ComponentType<ICustomServerCardProps>;
    customDialog?: React.ComponentType<ICustomDialogProps>;

    // New: Embedded dialog component
    DialogComponent?: React.ComponentType<ICustomDialogProps>;
}

// Registry for server modules
export interface IServerRegistry {
    [serverKey: string]: IEnhancedServerModule;
}

// UI Component Props Interfaces
export interface IServerCardProps {
    title: string;
    description: string;
    version: string;
    isEnabled: boolean;
    isConfigured: boolean;
    isAutoApproved: boolean;
    onToggle: (enabled: boolean) => void;
    onAutoApprovalToggle: (autoApproved: boolean) => void;
    onConfigure: () => void;
    onReset?: () => void;
    icon?: ReactNode;
    sourceUrl?: string;
}

export interface ICustomServerCardProps {
    serverModule: IEnhancedServerModule;
    isEnabled: boolean;
    isConfigured: boolean;
    isAutoApproved: boolean;
    onToggle: (enabled: boolean) => void;
    onAutoApprovalToggle: (autoApproved: boolean) => void;
    onConfigure: () => void;
    onReset?: () => void;
}

export interface ICustomDialogProps {
    open: boolean;
    initialData?: Record<string, any>;
    onClose: () => void;
    onSave: (data: Record<string, any>) => void;
}

export interface IServiceItem {
    serverKey: string;
    type: string;
    enabledFlag: boolean;
    config: any;
    humanName: string;
    category: string;
    isRegistered: boolean;
    metadata?: any;
}

export interface IServersProps {
    services: IServiceItem[];
    configureHandlers: Record<string, () => void>;
}

export interface IGenericServerProps {
    serverKey: string;
    onReset?: () => void;
    isAutoApproved?: boolean;
    onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

export interface IConfigurableComponentProps {
    onConfigure?: () => void;
    serverKey?: string;
}

export interface IEnhancedComponentProps extends IConfigurableComponentProps {
    onReset?: () => void;
    isAutoApproved?: boolean;
    onAutoApprovalToggle?: (autoApproved: boolean) => void;
}

// Server Configuration Interfaces
export interface ITavilyConfig {
    apiKey: string;
}

export interface IWeatherConfig {
    apiKey: string;
    endpoint: string;
    units: string;
}

export interface ILocationConfig {
    path: string;
}

export interface IWeatherForecastConfig {
    apiKey: string;
    path: string;
}

export interface INearbySearchConfig {
    apiKey: string;
    endpoint: string;
    defaultRadius: number;
}

export interface IWeb3ResearchConfig {
    apiKey: string;
    endpoint: string;
}

export interface IDoorDashConfig {
    apiKey: string;
    endpoint: string;
    region: string;
}

export interface IWhatsAppConfig {
    path: string;
}

export interface IGitHubConfig {
    accessToken: string;
}

export interface IIPLocationConfig {
    apiKey: string;
}

export interface IAirbnbConfig {
    // No required config for Airbnb
}

export interface ILinkedInConfig {
    email: string;
    password: string;
}

export interface IMS365Config {
    readOnly?: boolean;
}

export interface ILaraConfig {
    accessKeyId: string;
    accessKeySecret: string;
}

export interface IOTRSConfig {
    baseUrl: string;
    username: string;
    password: string;
    verifySSL: boolean;
    defaultQueue: string;
    defaultState: string;
    defaultPriority: string;
    defaultType: string;
}

// Updated Moodle Config
export interface IMoodleConfig {
    path: string;
    baseUrl: string;
    token: string;
}

// Server State Interfaces (for backward compatibility)
export interface ITavilyState {
    tavilyEnabled: boolean;
    tavilyConfig: ITavilyConfig;
}

export interface IWeatherState {
    weatherEnabled: boolean;
    weatherConfig: IWeatherConfig;
}

export interface ILocationState {
    locationEnabled: boolean;
    locationConfig: ILocationConfig;
}

export interface IWeatherForecastState {
    weatherForecastEnabled: boolean;
    weatherForecastConfig: IWeatherForecastConfig;
}

export interface INearbySearchState {
    nearbySearchEnabled: boolean;
    nearbySearchConfig: INearbySearchConfig;
}

export interface IWeb3ResearchState {
    web3ResearchEnabled: boolean;
    web3ResearchConfig: IWeb3ResearchConfig;
}

export interface IDoorDashState {
    doorDashEnabled: boolean;
    doorDashConfig: IDoorDashConfig;
}

export interface IWhatsAppState {
    whatsAppEnabled: boolean;
    whatsAppConfig: IWhatsAppConfig;
}

export interface IGitHubState {
    gitHubEnabled: boolean;
    gitHubConfig: IGitHubConfig;
}

export interface IIPLocationState {
    ipLocationEnabled: boolean;
    ipLocationConfig: IIPLocationConfig;
}

export interface IAirbnbState {
    airbnbEnabled: boolean;
    airbnbConfig: IAirbnbState;
}

export interface ILinkedInState {
    linkedInEnabled: boolean;
    linkedInConfig: ILinkedInConfig;
}

export interface IMS365State {
    ms365Enabled: boolean;
    ms365Config: IMS365Config;
    ms365AutoApproved?: boolean;
}

export interface ILaraState {
    laraEnabled: boolean;
    laraConfig: ILaraConfig;
    laraAutoApproved?: boolean;
}

export interface IOTRSState {
    otrsEnabled: boolean;
    otrsConfig: IOTRSConfig;
    otrsAutoApproved?: boolean;
}

// Added Moodle State
export interface IMoodleState {
    moodleEnabled: boolean;
    moodleConfig: IMoodleConfig;
    moodleAutoApproved?: boolean;
}

// Added MS Teams Config and State
export interface IMSTeamsConfig {
    appId: string;
    appPassword: string;
    appType: "SingleTenant" | "MultiTenant";
    tenantId?: string;
    teamId: string;
    channelId: string;
}

export interface IMSTeamsState {
    msTeamsEnabled?: boolean;
    msTeamsConfig?: IMSTeamsConfig;
    msTeamsAutoApproved?: boolean;
}

// Added Google Calendar Config and State
export interface IGoogleCalendarConfig {
    indexPath: string; // Path to the server's index.js file
}

export interface IGoogleCalendarState {
    googleCalendarEnabled?: boolean;
    googleCalendarConfig?: IGoogleCalendarConfig;
    googleCalendarAutoApproved?: boolean;
}

export interface IChessConfig {
    // Chess server doesn't require any configuration
}

export interface IChessState {
    chessEnabled: boolean;
    chessConfig: IChessConfig;
    chessAutoApproved?: boolean;
}

// Added Google Gmail Config and State (Auto-Auth version)
export interface IGoogleGmailConfig {
    // No configuration required for auto-auth Gmail server
}

export interface IGoogleGmailState {
    googleGmailEnabled?: boolean;
    googleGmailConfig?: IGoogleGmailConfig;
    googleGmailAutoApproved?: boolean;
}

// Added N8n Config
export interface IN8nConfig {
    apiUrl: string;
    apiKey: string;
    webhookUsername?: string;
    webhookPassword?: string;
}

// Added N8n State
export interface IN8nState {
    n8nEnabled: boolean;
    n8nConfig: IN8nConfig;
    n8nAutoApproved?: boolean;
}

// Added Playwright Config
export interface IPlaywrightConfig {
    // Playwright MCP server doesn't require any configuration
}

// Added Playwright State
export interface IPlaywrightState {
    playwrightEnabled: boolean;
    playwrightConfig: IPlaywrightConfig;
    playwrightAutoApproved?: boolean;
}

// Added Atlassian Config
export interface IAtlassianConfig {
    jiraUrl: string;
    confluenceUrl: string;
    authType: 'cloud' | 'server';
    // For Cloud (OAuth 2.0)
    oauthClientId?: string;
    oauthClientSecret?: string;
    oauthRedirectUri?: string;
    oauthScope?: string;
    cloudId?: string;
    // For Server/Data Center (PAT or Basic Auth)
    username?: string;
    apiToken?: string;
    personalAccessToken?: string;
    // Optional settings
    sslVerify?: boolean;
    readOnlyMode?: boolean;
    enabledTools?: string;
}

// Added Atlassian State
export interface IAtlassianState {
    atlassianEnabled: boolean;
    atlassianConfig: IAtlassianConfig;
    atlassianAutoApproved?: boolean;
}

// Added OnlysaidKB Config
export interface IOnlysaidKBConfig {
    baseUrl: string;
    timeout?: number;
    path: string;
}

// Added OnlysaidKB State
export interface IOnlysaidKBState {
    onlysaidKBEnabled: boolean;
    onlysaidKBConfig: IOnlysaidKBConfig;
    onlysaidKBAutoApproved?: boolean;
}
