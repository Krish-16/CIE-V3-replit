// src/hooks/useApi.js
import { useCallback, useEffect, useRef, useState } from "react";

// Lightweight fetch hook with caching and SSR-friendly guards; can integrate with Suspense later
export default function useApi(url, { method = "GET", body, headers = {}, deps = [], enabled = true, cacheKey } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(Boolean(enabled));
  const cacheRef = useRef(new Map());

  const fetcher = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const key = cacheKey || `${method}:${url}:${JSON.stringify(body)}`;
      if (cacheRef.current.has(key)) {
        setData(cacheRef.current.get(key));
        setLoading(false);
        return;
      }
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json", ...headers },
        body: body ? JSON.stringify(body) : undefined,
        credentials: "include",
      });
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      cacheRef.current.set(key, json);
      setData(json);
    } catch (e) {
      setError(e);
    } finally {
      setLoading(false);
    }
  }, [url, method, body, headers, enabled, cacheKey]);

  useEffect(() => {
    fetcher();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return { data, error, loading, refetch: fetcher };
}
