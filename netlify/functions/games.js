import { getStore } from '@netlify/blobs';

export async function handler(event, context) {
  const store = getStore({ name: "ludotheque" });

  try {
    if (event.httpMethod === "GET") {
      const data = await store.get("games", { type: "json" });
      return {
        statusCode: 200,
        body: JSON.stringify(data || [])
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "[]");
      await store.set("games", body);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true })
      };
    }

    return { statusCode: 405, body: "Méthode non autorisée" };
  } catch (err) {
    return { statusCode: 500, body: "Erreur: " + err.message };
  }
}
