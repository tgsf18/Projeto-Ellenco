/**
 * Reverte o commit f2a85bf em tgsf18/projeto-ellenco.
 *
 * O endpoint /git/reverts da API devolveu 404 (não disponível para este
 * token), então a reversão é montada à mão:
 *   1. lê a árvore do commit PAI (47cc19bb) — é o estado anterior;
 *   2. lê a árvore do commit a reverter (f2a85bf);
 *   3. monta a lista de mudanças que devolve cada path ao estado do pai
 *      (blobs que existiam voltam com o sha antigo, blobs que não existiam
 *      são removidos com sha:null);
 *   4. cria tree + commit + atualiza a ref, sem force.
 *
 * O resultado é idêntico a um `git revert`, só que sem git local.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const DONO = 'tgsf18';
const REPO = 'projeto-ellenco';
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN = process.env.GH_TOKEN;
const REVERTER = 'f2a85bf5253bf587c555880962bf23e8ac32a58a';
const SECO = process.argv.includes('--seco');

if (!TOKEN) { console.error('GH_TOKEN ausente.'); process.exit(1); }

async function api(rota, opcoes = {}) {
  const r = await fetch(API + rota, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ellenco-reverter',
      ...(opcoes.headers || {}),
    },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${opcoes.method || 'GET'} ${rota} -> ${r.status} ${texto.slice(0, 400)}`);
  return texto ? JSON.parse(texto) : null;
}

// /git/commits/{sha} devolve tree e parents, mas não a mensagem; ela vem
// do endpoint /commits/{sha} (mesmo sha, formato diferente).
const alvoGit = await api(`/repos/${DONO}/${REPO}/git/commits/${REVERTER}`);
const alvo = { ...alvoGit, commit: (await api(`/repos/${DONO}/${REPO}/commits/${REVERTER}`)).commit };
const paiGit = await api(`/repos/${DONO}/${REPO}/git/commits/${alvoGit.parents[0].sha}`);
const pai = { ...paiGit, commit: (await api(`/repos/${DONO}/${REPO}/commits/${paiGit.sha}`)).commit };

const arvorePai = await api(`/repos/${DONO}/${REPO}/git/trees/${pai.tree.sha}?recursive=1`);
const arvoreAlvo = await api(`/repos/${DONO}/${REPO}/git/trees/${alvo.tree.sha}?recursive=1`);

const mapaPai = new Map(arvorePai.tree.filter((f) => f.type === 'blob').map((f) => [f.path, f]));
const mapaAlvo = new Map(arvoreAlvo.tree.filter((f) => f.type === 'blob').map((f) => [f.path, f]));

console.log(`commit a reverter: ${alvo.sha.slice(0, 10)} — ${alvo.commit.message.split('\n')[0]}`);
console.log(`voltar ao estado de: ${pai.sha.slice(0, 10)} — ${pai.commit.message.split('\n')[0]}\n`);

const entradas = [];

// o que o commit criou ou alterou -> volta ao sha do pai, ou sai se não existia
for (const [caminho, arquivo] of mapaAlvo) {
  const anterior = mapaPai.get(caminho);
  if (!anterior) {
    entradas.push({ path: caminho, mode: '100644', type: 'blob', sha: null });
    console.log('remover  :', caminho);
  } else if (anterior.sha !== arquivo.sha) {
    entradas.push({ path: caminho, mode: anterior.mode || '100644', type: 'blob', sha: anterior.sha });
    console.log('restaurar:', caminho);
  }
}

// o que o commit apagou -> volta
for (const [caminho, arquivo] of mapaPai) {
  if (!mapaAlvo.has(caminho)) {
    entradas.push({ path: caminho, mode: arquivo.mode || '100644', type: 'blob', sha: arquivo.sha });
    console.log('voltar   :', caminho);
  }
}

console.log(`\n${entradas.length} mudanças para desfazer`);
if (SECO) { console.log('modo seco: nada enviado.'); process.exit(0); }

const novaTree = await api(`/repos/${DONO}/${REPO}/git/trees`, {
  method: 'POST',
  body: JSON.stringify({ base_tree: alvo.tree.sha, tree: entradas }),
});

const mensagem = `Revert "Painel de metas, equipe, calendário e configurações reconstruídos"

Este revert desfaz o commit ${alvo.sha.slice(0, 7)}.

Reverte ${REVERTER}.

O projeto correto é anapivamedeiros/projeto-ellenco (fork:
tgsf18/projeto-ellenco-1, PR #1). Este repositório tem backend Java/Spring
Boot e frontend React, e não é onde a reconstrução PHP deveria entrar.`;

const commit = await api(`/repos/${DONO}/${REPO}/git/commits`, {
  method: 'POST',
  body: JSON.stringify({ message: mensagem, tree: novaTree.sha, parents: [alvo.sha] }),
});

await api(`/repos/${DONO}/${REPO}/git/refs/heads/${BRANCH}`, {
  method: 'PATCH',
  body: JSON.stringify({ sha: commit.sha, force: false }),
});

console.log('\ncommit do revert:', commit.sha);
console.log('url:', `https://github.com/${DONO}/${REPO}/commit/${commit.sha}`);
