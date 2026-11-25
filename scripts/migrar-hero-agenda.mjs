// Adiciona a configuração do topo da agenda ao Instituto, sem alterar dados existentes.
// Uso: node --env-file=.env.local scripts/migrar-hero-agenda.mjs
import { AppwriteException, Client, TablesDB } from "node-appwrite";

const { APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, APPWRITE_API_KEY } = process.env;
if (!APPWRITE_ENDPOINT || !APPWRITE_PROJECT_ID || !APPWRITE_API_KEY) {
  throw new Error("Configure APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID e APPWRITE_API_KEY.");
}

const client = new Client().setEndpoint(APPWRITE_ENDPOINT).setProject(APPWRITE_PROJECT_ID).setKey(APPWRITE_API_KEY);
const db = new TablesDB(client);
try {
  await db.createTextColumn({ databaseId: "ivas", tableId: "instituto", key: "config_hero_agenda", required: false });
  console.log("Coluna config_hero_agenda criada.");
} catch (erro) {
  if (erro instanceof AppwriteException && erro.code === 409) console.log("Coluna config_hero_agenda já existe.");
  else throw erro;
}
