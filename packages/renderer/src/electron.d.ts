export {};

export type UpdateEvent =
  | 'checking-for-update'
  | 'update-available'
  | 'update-not-available'
  | 'download-progress'
  | 'update-downloaded'
  | 'error';

export interface UpdateStatus {
  event: UpdateEvent;
  version?: string;
  percent?: number;
  message?: string;
}

declare global {
  interface Window {
    electronAPI?: {
      savePDF: (html: string, fileName: string) => Promise<{ success: boolean; message: string }>;
      printDocument: (html: string) => Promise<{ success: boolean; message: string }>;
      printFile: (url: string) => Promise<{ success: boolean; message: string }>;
      openFile: (url: string, title: string) => Promise<{ success: boolean; message: string }>;
      checkForUpdates: () => Promise<{ success: boolean; updateAvailable?: boolean; message?: string }>;
      installUpdate: () => Promise<void>;
      onUpdateStatus: (callback: (status: UpdateStatus) => void) => () => void;
    };
  }
}
