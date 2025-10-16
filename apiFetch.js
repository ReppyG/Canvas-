export async function apiFetch(targetUrl, options = {}) {
  const proxyUrl = import.meta.env.VITE_PROXY_URL;

  // Encode headers safely
  const safeHeaders = {};
  if (options.headers) {
    for (const [key, value] of Object.entries(options.headers)) {
      if (value) safeHeaders[key] = encodeURIComponent(value);
    }
  }

  import { apiFetch } from "./apiFetch"; // adjust path if needed

const res = await apiFetch("https://api.example.com/data", {
  method: "GET",
  headers: { "Authorization": `Bearer ${token}` }
});


  const contentType = response.headers.get("content-type");
if (contentType?.includes("application/json")) {
  const text = await response.text();   // read once
  return JSON.parse(text);               // parse manually
} else {
  return await response.text();
}

