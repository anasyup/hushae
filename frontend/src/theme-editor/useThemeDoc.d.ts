export function useThemeDoc(): {
  status: 'loading' | 'ready';
  doc: any | null;
  theme: Record<string, any>;
  themed: boolean;
};
export function invalidateThemeDoc(): void;
