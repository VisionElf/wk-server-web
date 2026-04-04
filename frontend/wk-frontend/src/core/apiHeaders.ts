/**
 * Optional API key for backends that enable WkApi:ApiKey (sent as X-Api-Key).
 * Shared by sub-app API clients.
 */
const apiKey = import.meta.env.VITE_WK_API_KEY as string | undefined;

export function apiHeaders(extra?: HeadersInit): HeadersInit {
  const h = new Headers(extra);
  if (apiKey) {
    h.set("X-Api-Key", apiKey);
  }
  return h;
}
