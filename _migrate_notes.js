const base = 'https://eqkcyfkhnihdchmcfdcw.supabase.co/rest/v1/comments';
const headers = {
  apikey: 'sb_publishable_4Y_S9gtbbOoa99cPZsKEbg_gaIw1GPW',
  Authorization: 'Bearer sb_publishable_4Y_S9gtbbOoa99cPZsKEbg_gaIw1GPW',
  'Content-Type': 'application/json',
  Prefer: 'return=representation'
};
async function req(url, options = {}) {
  const res = await fetch(url, { ...options, headers: { ...headers, ...(options.headers || {}) } });
  const text = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${text}`);
  return text ? JSON.parse(text) : null;
}
(async () => {
  const existing = await req(`${base}?select=id&scope=eq.notes`);
  if (existing.length) {
    for (const row of existing) {
      await req(`${base}?id=eq.${row.id}`, { method: 'DELETE' });
    }
  }
  const rows = [
    { scope: 'notes', thread_key: 'notes', parent_id: null, content: '刚结束旅行回到日常，先踏实上课、按时健身，生活慢慢变稳。', website: null, name: 'anonymous' },
    { scope: 'notes', thread_key: 'notes', parent_id: null, content: '期末周开始以后，作息有点乱，熬夜看书、刷手机，甚至有一次熬了通宵。', website: null, name: 'anonymous' },
    { scope: 'notes', thread_key: 'notes', parent_id: null, content: '这个月认识了一个新朋友，也和老朋友依旧很亲密，关系里有熟悉也有新鲜。', website: null, name: 'anonymous' },
    { scope: 'notes', thread_key: 'notes', parent_id: null, content: '嵌入式实训开始了，单片机更熟了；算法学了 5 个，确实有成就感。', website: null, name: 'anonymous' },
    { scope: 'notes', thread_key: 'notes', parent_id: null, content: 'agent 开发和 Python 后端还卡着，但方向是清楚的，后面继续补。', website: null, name: 'anonymous' },
    { scope: 'notes', thread_key: 'notes', parent_id: null, content: '感情上有期待，也有失落，六月的感觉就是：这种感觉好奇妙，这到底是奖励还是惩罚。', website: null, name: 'anonymous' }
  ];
  const inserted = await req(base, { method: 'POST', body: JSON.stringify(rows) });
  console.log(JSON.stringify(inserted, null, 2));
})().catch(err => { console.error(err.message); process.exit(1); });
