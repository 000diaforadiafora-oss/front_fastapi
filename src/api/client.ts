const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "https://countex.space";
const DEFAULT_TIMEOUT_MS = 60_000;

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeout = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function postForm<T = unknown>(path: string, formData: FormData, timeout?: number): Promise<T> {
  const response = await fetchWithTimeout(
    `${baseUrl}${path}`,
    {
      method: "POST",
      body: formData,
    },
    timeout
  );
  return handleResponse<T>(response);
}

export async function postFormBlob(path: string, formData: FormData, timeout?: number): Promise<Blob> {
  const response = await fetchWithTimeout(
    `${baseUrl}${path}`,
    {
      method: "POST",
      body: formData,
    },
    timeout
  );
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.blob();
}

export const apiBase = baseUrl;
