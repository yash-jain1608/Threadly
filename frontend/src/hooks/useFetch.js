import { useEffect, useState } from 'react'; import api, { errMsg } from '../api.js';
export default function useFetch(url) {
  const [s, set] = useState({ data: null, loading: !!url, error: null }); const [n, setN] = useState(0);
  useEffect(() => {
    if (!url) return; let live = true; set((x) => ({ ...x, loading: true, error: null }));
    api.get(url).then((r) => live && set({ data: r.data, loading: false, error: null })).catch((e) => live && set({ data: null, loading: false, error: errMsg(e) }));
    return () => { live = false; };
  }, [url, n]);
  return { ...s, reload: () => setN((x) => x + 1) };
}
