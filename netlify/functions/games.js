import { getStore } from '@netlify/blobs';

export async function handler(event, context) {
  console.log("➡️ Function games appelée, méthode:", event.httpMethod);
  const store = getStore({ name: "ludotheque" });

  try {
    if (event.httpMethod === "GET") {
      const data = await store.get("games", { type: "json" });
      console.log("➡️ Lecture depuis Blobs:", data);
      return {
        statusCode: 200,
        body: JSON.stringify(data || [])
      };
    }

    if (event.httpMethod === "POST") {
      const body = JSON.parse(event.body || "[]");
      console.log("➡️ Sauvegarde vers Blobs, nombre de jeux:", body.length);
      await store.set("games", body);
      return {
        statusCode: 200,
        body: JSON.stringify({ ok: true })
      };
    }

    return { statusCode: 405, body: "Méthode non autorisée" };
  } catch (err) {
    console.error("❌ Erreur dans la function games:", err);
    return { statusCode: 500, body: "Erreur: " + err.message };
  }
}
