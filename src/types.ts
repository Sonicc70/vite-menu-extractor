export interface MenuEntry {
  title: string;
  price: string | null;
  description: string | null;
}

export interface MenuCategory {
  title: string;
  entries: MenuEntry[];
}

export type MenuData = MenuCategory[];

export type FileItemStatus = 'pending' | 'processing' | 'success' | 'error';

export interface FileItem {
  id: string;
  file: File;
  fileName: string;
  status: FileItemStatus;
  menu: MenuData | null;
  error: string | null;
}

export type AppStatus = 'idle' | 'ready' | 'processing' | 'done';

export interface AppState {
  status: AppStatus;
  files: FileItem[];
}
