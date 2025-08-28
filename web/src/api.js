const API = import.meta.env.VITE_API_URL;
const KEY = import.meta.env.VITE_API_KEY;
function withKey(p){const q=p.includes('?')?'&':'?';return `${API}${p}${q}IZI-API-KEY=${encodeURIComponent(KEY)}`}
export async function apiGet(path){const r=await fetch(withKey(path)); if(!r.ok) throw new Error(`API ${r.status}`); return r.json()}