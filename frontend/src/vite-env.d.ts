/// <reference types="vite/client" />

declare module '*.css';
declare module '*.svg';
declare module '*.png';
declare module '*.jpg';

/** Untyped JS modules shared with the legacy storefront. */
declare module '../../api/client' {
  export function api(path: string, opts?: { method?: string; body?: unknown; token?: string }): Promise<any>;
}
declare module '../api/client' {
  export function api(path: string, opts?: { method?: string; body?: unknown; token?: string }): Promise<any>;
}
declare module '../../store/AppContext' {
  export function useApp(): any;
  export function AppProvider(props: { children: React.ReactNode }): JSX.Element;
}
declare module '../store/AppContext' {
  export function useApp(): any;
  export function AppProvider(props: { children: React.ReactNode }): JSX.Element;
}
declare module '../../components/MediaPicker' {
  const MediaPicker: React.ComponentType<{
    value?: string;
    onChange?: (url: string) => void;
    onAdd?: (url: string) => void;
    multiple?: boolean;
    accept?: string;
    hideUrl?: boolean;
    buttonText?: string;
  }>;
  export default MediaPicker;
}
