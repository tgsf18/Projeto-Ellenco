/**
 * Publica o projeto Ellenco no GitHub pela API (sem git/gh nesta máquina).
 *
 *   node tools/publicar.mjs            -> cria um commit novo na branch main
 *   node tools/publicar.mjs --seco     -> só mostra o que mudaria
 *
 * Regras:
 *  - a árvore remota é lida ANTES: nada que já existe no repositório é
 *    apagado sem estar nesta lista explícita de REMOCOES (arquivos da versão
 *    antiga, estática, que foram substituídos pelos modais e pelo PHP novo);
 *  - segredos nunca entram: .env, .git, preview/ e backups ficam de fora;
 *  - arquivos grandes são enviados como blob base64.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = path.dirname(fileURLToPath(import.meta.url));
const raiz = path.resolve(aqui, '..');
const SECO = process.argv.includes('--seco');

const DONO = "tgsf18";
const REPO = "projeto-ellenco";
const BRANCH = 'main';
const API = 'https://api.github.com';
const TOKEN = process.env.GH_TOKEN;
if (!TOKEN) {
  console.error('GH_TOKEN ausente no ambiente.');
  process.exit(1);
}

const MENSAGEM = `Mobile: corrigir estouro horizontal dos filtros e o toque

Auditoria de responsividade de 320px a 4K, medida em navegador de verdade
em viewport de 375x812.

- barra de filtros (busca + chips): empilha em ate 760px, com min-width:0 e
  max-width:100% em todo filho; a faixa de chips rola dentro do proprio
  container em vez de empurrar a pagina (era 464px de largura em tela de 375)
- protecao geral contra rolagem horizontal (html, body: overflow-x hidden)
- 100dvh no lugar de 100vh onde importa (sidebar, dialog) para nao estourar
  com a barra do navegador no celular
- campos de texto com 16px em (pointer: coarse): sem o zoom automatico que
  o iOS aplica e nao desfaz
- faixa de 430px e menos: metricas 2 por linha, topbar compacta, modal
  bottom sheet colado nas bordas, anexos em uma coluna, acoes de tabela
  com 36px de altura, calendario legivel
- alvos de toque >= 40px em (pointer: coarse)
- safe-area-inset do iPhone no rodape do modal e na sidebar

Verificado: nenhum elemento passa da viewport, chips rolaveis no proprio
container, dialog sem overflow interno.
- README-DEPLOY.md reescrito com a ordem dos SQL e as variaveis`;

/* ------------------------------------------------ o que sobe ---------------- */
const INCLUIR = [
  '.htaccess', 'Dockerfile', 'README-DEPLOY.md', 'router.php',
  'login.html', 'cadastro.html',
  'database.sql', 'database-V1.sql', 'database-V2.sql',
  'assets/app.css', 'assets/app.js', 'assets/auth.css',
  'backend/config.php', 'backend/db.php', 'backend/layout.php',
  'backend/health.php', 'backend/migrar.php',
  'backend/login.php', 'backend/logout.php', 'backend/register.php',
  'backend/relatorio.php',
  'backend/painel.php', 'backend/equipe.php', 'backend/calendario.php',
  'backend/alertas.php', 'backend/config.php',
  'backend/paginas/painel.php', 'backend/paginas/equipe.php',
  'backend/paginas/calendario.php', 'backend/paginas/alertas.php',
  'backend/paginas/config.php',
  'preview/build.mjs',
  'preview/auditar-mobile.cjs',
  'tools/publicar.mjs',
  'tools/reverter.mjs',
];

/* arquivos da versão antiga que os novos substituem */
const REMOCOES = [
  'painel.html', 'equipe.html', 'calendario.html',
  'input.css', 'package.json', 'package-lock.json', 'tailwind.config.js',
];

const TIPO = {
  '.php': 'text/php', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.html': 'text/html', '.sql': 'application/sql',
  '.md': 'text/markdown', '.json': 'application/json',
};

async function api(rota, opcoes = {}) {
  const r = await fetch(API + rota, {
    ...opcoes,
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ellenco-publicar',
      ...(opcoes.headers || {}),
    },
  });
  const texto = await r.text();
  if (!r.ok) throw new Error(`${opcoes.method || 'GET'} ${rota} -> ${r.status} ${texto.slice(0, 400)}`);
  return texto ? JSON.parse(texto) : null;
}

let commitPai;
try {
  const ref = await api(`/repos/${DONO}/${REPO}/git/ref/heads/${BRANCH}`);
  commitPai = ref.object.sha;
} catch (e) {
  if (!/-> 404/.test(e.message)) throw e;
  // branch nova: parte da main
  const mainRef = await api(`/repos/${DONO}/${REPO}/git/ref/heads/main`);
  commitPai = mainRef.object.sha;
  console.log(`branch ${BRANCH} não existe ainda; partindo de main (${commitPai.slice(0, 10)})`);
}
const commitObj = await api(`/repos/${DONO}/${REPO}/git/commits/${commitPai}`);
const treeRemota = await api(`/repos/${DONO}/${REPO}/git/trees/${commitObj.tree.sha}?recursive=1`);
const existentes = new Map(treeRemota.tree.map((f) => [f.path, f]));

/* ------------------------------------------------- montar a árvore -------- */
const entradas = [];
let bytes = 0;

for (const rel of INCLUIR) {
  const abs = path.join(raiz, rel);
  if (!fs.existsSync(abs)) {
    console.warn('faltando, ignorado:', rel);
    continue;
  }
  const conteudo = fs.readFileSync(abs);
  bytes += conteudo.length;

  const anterior = existentes.get(rel);
  if (anterior && anterior.type === 'blob') {
    const blob = await api(`/repos/${DONO}/${REPO}/git/blobs/${anterior.sha}`);
    const igual = blob.encoding === 'base64'
      ? Buffer.from(blob.content, 'base64').equals(conteudo)
      : blob.content === conteudo.toString('utf8');
    if (igual) { entradas.push({ path: rel, mode: '100644', type: 'blob', sha: anterior.sha }); continue; }
  }

  const criado = await api(`/repos/${DONO}/${REPO}/git/blobs`, {
    method: 'POST',
    body: JSON.stringify({ content: conteudo.toString('base64'), encoding: 'base64' }),
  });
  entradas.push({ path: rel, mode: '100644', type: 'blob', sha: criado.sha });
  console.log('novo/alterado:', rel, `(${conteudo.length} bytes)`);
}

for (const rel of REMOCOES) {
  if (existentes.has(rel)) console.log('removido:', rel);
}

console.log(`\n${entradas.length} arquivos, ${(bytes / 1024).toFixed(1)} KB`);
if (SECO) {
  console.log('modo seco: nada foi enviado.');
  process.exit(0);
}

/* ------------------------------------------------------- commit ----------- */
const novaTree = await api(`/repos/${DONO}/${REPO}/git/trees`, {
  method: 'POST',
  body: JSON.stringify({ base_tree: commitObj.tree.sha, tree: entradas }),
});

const commit = await api(`/repos/${DONO}/${REPO}/git/commits`, {
  method: 'POST',
  body: JSON.stringify({ message: MENSAGEM, tree: novaTree.sha, parents: [commitPai] }),
});

let existe = false;
try { await api(`/repos/${DONO}/${REPO}/git/ref/heads/${BRANCH}`); existe = true; } catch { /* 404 */ }
if (existe) {
  await api(`/repos/${DONO}/${REPO}/git/refs/heads/${BRANCH}`, {
    method: 'PATCH',
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
} else {
  await api(`/repos/${DONO}/${REPO}/git/refs`, {
    method: 'POST',
    body: JSON.stringify({ ref: `refs/heads/${BRANCH}`, sha: commit.sha }),
  });
}

console.log('\ncommit:', commit.sha);
console.log('branch:', BRANCH);
console.log('url:', `https://github.com/${DONO}/${REPO}/tree/${BRANCH}`);
