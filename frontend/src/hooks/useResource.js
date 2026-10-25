import { useEffect, useRef, useState, useCallback } from "react";

// Results are tagged by key so switching athletes never flashes another user's data.
export function useResource(key, fetcher, enabled = true) {
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({
    key: null,
    data: null,
    error: null,
    loading: enabled,
  });
  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    setState({ key, data: null, error: null, loading: true });
    Promise.resolve()
      .then(() => fetcherRef.current(controller.signal))
      .then(
        (data) => {
          if (!controller.signal.aborted)
            setState({ key, data, error: null, loading: false });
        },
        (error) => {
          if (!controller.signal.aborted)
            setState({ key, data: null, error, loading: false });
        },
      );
    return () => controller.abort();
  }, [key, enabled, attempt]);
  if (!enabled) return { data: null, error: null, loading: false, reload };
  return {
    ...(state.key === key ? state : { data: null, error: null, loading: true }),
    reload,
  };
}
