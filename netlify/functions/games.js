import { blob } from '@netlify/blobs';

export default async (req, context) => {
  const store = blob('games.json', { consistency: 'strong' });
  if (req.method === 'GET') {
    const txt = await store.get();
    return new Response(txt || '[]', { headers:{'Content-Type':'application/json'} });
  }
  if (req.method === 'POST') {
    const body = await req.text();
    await store.set(body);
    return new Response(body, { headers:{'Content-Type':'application/json'} });
  }
  return new Response('Method Not Allowed', { status:405 });
};