import { QueryClient, QueryFunction } from "@tanstack/react-query";

async function throwIfResNotOk(res: Response) {
  if (!res.ok) {
    let errorMessage = res.statusText;
    let errorDetails = null;
    
    try {
      // Clone the response so we can read it multiple times
      const clonedRes = res.clone();
      const text = await clonedRes.text();
      
      if (text) {
        try {
          const json = JSON.parse(text);
          errorMessage = json.message || json.error || text;
          if (json.details) {
            errorDetails = json.details;
          }
        } catch {
          errorMessage = text;
        }
      }
    } catch (e) {
      // If we can't read the response, use status text
      console.warn('Could not read error response:', e);
    }
    
    const error = new Error(`${res.status}: ${errorMessage}`);
    console.error(`API Error [${res.status}]:`, errorMessage);
    if (errorDetails) {
      console.error('Error Details:', errorDetails);
      console.error('Full Error:', JSON.stringify(errorDetails, null, 2));
    }
    console.error('Response URL:', res.url);
    throw error;
  }
}

export async function apiRequest(
  method: string,
  url: string,
  data?: unknown | undefined,
): Promise<Response> {
  const res = await fetch(url, {
    method,
    headers: data ? { "Content-Type": "application/json" } : {},
    body: data ? JSON.stringify(data) : undefined,
    credentials: "include",
  });

  await throwIfResNotOk(res);
  return res;
}

type UnauthorizedBehavior = "returnNull" | "throw";
export const getQueryFn: <T>(options: {
  on401: UnauthorizedBehavior;
}) => QueryFunction<T> =
  ({ on401: unauthorizedBehavior }) =>
  async ({ queryKey }) => {
    // Handle query params: queryKey can be [url] or [url, {params}]
    let url: string;
    if (queryKey.length === 1) {
      url = queryKey[0] as string;
    } else if (queryKey.length === 2 && typeof queryKey[1] === 'object' && queryKey[1] !== null) {
      const baseUrl = queryKey[0] as string;
      const params = queryKey[1] as Record<string, string>;
      const queryParams = new URLSearchParams(params);
      const queryString = queryParams.toString();
      url = queryString ? `${baseUrl}?${queryString}` : baseUrl;
    } else {
      url = queryKey.join("/") as string;
    }

    const res = await fetch(url, {
      credentials: "include",
    });

    if (unauthorizedBehavior === "returnNull" && res.status === 401) {
      return null;
    }

    await throwIfResNotOk(res);
    return await res.json();
  };

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: getQueryFn({ on401: "throw" }),
      refetchInterval: false,
      refetchOnWindowFocus: true,
      staleTime: 0,
      retry: false,
    },
    mutations: {
      retry: false,
    },
  },
});
