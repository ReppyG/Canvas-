export async function apiFetch(targetUrl, options = {}) {
  const proxyUrl = import.meta.env.VITE_PROXY_URL;

  const safeHeaders = {};
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (value) safeHeaders[key] = encodeURIComponent(value);
    }
  }

  import { apiFetch } from "./api"; // adjust path

const res = await apiFetch("https://api.example.com/data", { method: "GET" });

    headers: safeHeaders,
    body: options.method !== "GET" ? JSON.stringify(options.body) : undefined,
  });

  // Read body only once
  const text = await response.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
