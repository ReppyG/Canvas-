const proxyUrl = import.meta.env.VITE_PROXY_URL;

export async function apiFetch(targetUrl, options = {}) {
  const safeHeaders = {};
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (value) safeHeaders[key] = encodeURIComponent(value);
    }
  }

  const response = await fetch(`${proxyUrl}?url=${encodeURIComponent(targetUrl)}`, {
    method: options.method || "GET",
    headers: safeHeaders,
    body: options.method !== "GET" ? JSON.stringify(options.body) : undefined,
  });

  const text = await response.text();
  try { return JSON.parse(text); } catch { return text; }
}
