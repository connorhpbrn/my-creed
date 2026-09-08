/** Bind a request to its document, independently of navigation in other tabs. */
export function fetchForCreed(creedId: string | undefined, input: string, init: RequestInit = {}) {
  if (!creedId) return Promise.reject(new Error("A Creed must be selected."));
  const headers = new Headers(init.headers);
  headers.set("x-creed-id", creedId);
  return fetch(input, { ...init, headers });
}
