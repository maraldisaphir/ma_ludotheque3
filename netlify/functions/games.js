import { getStore } from '@netlify/blobs';

/**
 * Netlify Function v2 (ESM)
 * Routes:
 *  - GET    /.netlify/functions/games         -> returns array of games
 *  - POST   /.netlify/functions/games         -> replaces full array (expects JSON array)
 *  - OPTIONS (CORS preflight)
 */
export default async (request, context) => {
  const store = getStore('ludotheque');
  const key = 'games.json';

  // CORS headers
  const cors = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  };

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: cors });
  }

  try {
    if (request.method === 'GET') {
      const content = await store.get(key, { type: 'json' });
      const data = Array.isArray(content) ? content : [];
      return new Response(JSON.stringify(data), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    if (request.method === 'POST') {
      const body = await request.json().catch(() => null);
      if (!Array.isArray(body)) {
        return new Response(JSON.stringify({ error: 'Body must be an array of games' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }
      // Basic shallow validation on each game
      const valid = body.every(g => g && typeof g.id === 'string' && typeof g.nom === 'string');
      if (!valid) {
        return new Response(JSON.stringify({ error: 'Each game must include at least { id, nom }' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...cors }
        });
      }
      await store.set(key, JSON.stringify(body));
      return new Response(JSON.stringify({ ok: true, count: body.length }), {
        status: 200,
        headers: { 'Content-Type': 'application/json', ...cors }
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...cors }
    });
  }
};