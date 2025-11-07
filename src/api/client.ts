const baseUrl = import.meta.env.VITE_API_BASE_URL ?? "https://countex.space";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.json() as Promise<T>;
}

export async function postForm<T = unknown>(path: string, formData: FormData): Promise<T> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<T>(response);
}

export async function postFormBlob(path: string, formData: FormData): Promise<Blob> {
  const response = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    body: formData,
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || response.statusText);
  }
  return response.blob();
}

export const apiBase = baseUrl;
