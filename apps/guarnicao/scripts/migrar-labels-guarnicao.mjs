import { Client, Query, Users } from "node-appwrite";

for (const nome of ["APPWRITE_ENDPOINT", "APPWRITE_PROJECT_ID", "APPWRITE_API_KEY"]) {
  if (!process.env[nome]) throw new Error(`Variável ausente: ${nome}`);
}

const aplicar = process.argv.includes("--apply");
const users = new Users(new Client()
  .setEndpoint(process.env.APPWRITE_ENDPOINT)
  .setProject(process.env.APPWRITE_PROJECT_ID)
  .setKey(process.env.APPWRITE_API_KEY));

const resumo = { contas: 0, guardioes: 0, mestres: 0, conflitos: 0 };
for (let offset = 0; ; offset += 100) {
  const pagina = await users.list({ queries: [Query.limit(100), Query.offset(offset)] });
  for (const conta of pagina.users) {
    resumo.contas++;
    const prefs = conta.prefs ?? {};
    const cargo = prefs.funcao_ritual;
    if (!conta.status || prefs.guarnicao_cargo_removido === true || (cargo !== "guardiao" && cargo !== "mestre")) continue;
    const labels = conta.labels ?? [];
    if (labels.includes(cargo)) continue;
    if (labels.includes(cargo === "guardiao" ? "mestre" : "guardiao")) {
      resumo.conflitos++;
      continue;
    }
    resumo[cargo === "guardiao" ? "guardioes" : "mestres"]++;
    if (aplicar) await users.updateLabels({ userId: conta.$id, labels: [...labels, cargo] });
  }
  if (pagina.users.length < 100) break;
}

console.log(`${aplicar ? "Atualizadas" : "A atualizar"}: ${resumo.guardioes} contas de guardião e ${resumo.mestres} de mestre; ${resumo.conflitos} conflitos ignorados; ${resumo.contas} contas analisadas.`);
