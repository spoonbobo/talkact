// File and directory structure interfaces
export interface FileNode {
    name: string;
    type: 'file' | 'directory';
    path: string;
    extension?: string;
    children?: FileNode[];
}

// Interface for breadcrumb navigation
export interface Breadcrumb {
    name: string;
    path: string;
}

// Interface for file content response
export interface FileContentResponse {
    content: string;
    extension: string;
}
