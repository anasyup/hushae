export interface ApiOptions {
  method?: string;
  body?: unknown;
  token?: string;
}
export function api(path: string, opts?: ApiOptions): Promise<any>;
