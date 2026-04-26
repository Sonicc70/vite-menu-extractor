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

export type AppStatus =
  | 'idle'
  | 'processing'
  | 'success'
  | 'error';

export interface AppState {
  status: AppStatus;
  menu: MenuData | null;
  error: string | null;
  fileName: string | null;
}
