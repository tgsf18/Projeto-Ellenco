/**
 * Auditoria de responsividade — 320px a 4K.
 *
 * Percorre assets/app.css e procura padrões que quebram em tela pequena:
 * largura fixa maior que o viewport, 100vw (barra de rolagem), 100vh (barra
 * do navegador no celular), alvo de toque pequeno, fonte abaixo de 16px em
 * campo de texto (o Safari do iPhone dá zoom e não volta), texto que não
 * quebra e elemento que estoura o container.
 *
 *   node preview/auditar-mobile.cjs
 */
const fs = require('fs');
const path = require('path');

const raiz = path.resolve(__dirname, '..');
const css = fs.readFileSync(path.join(raiz, 'assets/app.css'), 'utf8');
const linhas = css.split('\n');

const problemas = [];
const avisos = [];
const ok = [];

function relato(nivel, linha, regra, detalhe) {
  const alvo = { nivel, linha, regra: regra.trim().slice(0, 90), detalhe };
  (nivel === 'PROBLEMA' ? problemas : avisos).push(alvo);
}

/* separa em blocos @media para saber onde cada regra está */
let profundidade = 0;
let emMediaMobile = false;
let mediaAtual = null;

linhas.forEach((texto, i) => {
  const l = texto.trim();
  const n = i + 1;

  if (/^@media/.test(l)) {
    mediaAtual = l;
    emMediaMobile = /max-width:\s*(4\d\d|5\d\d|6\d\d|7\d\d|8\d\d)px/.test(l);
  }
  const abre = (l.match(/\{/g) || []).length;
  const fecha = (l.match(/\}/g) || []).length;
  profundidade += abre - fecha;
  if (profundidade <= 0) { mediaAtual = null; emMediaMobile = false; }

  if (!l || l.startsWith('/*') || l.startsWith('*') || l.startsWith('@media')) return;

  /* 1. largura fixa grande (px) fora de media query mobile */
  const larguraFixa = l.match(/(?:^|[^-\w])width:\s*(\d{3,4})px/);
  if (larguraFixa && !emMediaMobile && Number(larguraFixa[1]) > 320) {
    relato('PROBLEMA', n, l, `width:${larguraFixa[1]}px — estoura em telas menores que ${larguraFixa[1]}px`);
  }

  /* 2. min-width fixa grande */
  const minFixa = l.match(/min-width:\s*(\d{3,4})px/);
  if (minFixa && !emMediaMobile && Number(minFixa[1]) > 320) {
    relato('PROBLEMA', n, l, `min-width:${minFixa[1]}px — impede encolher abaixo disso`);
  }

  /* 3. 100vw / 100vh */
  if (/\b100vw\b/.test(l) && !/calc\(100vw - /.test(l)) {
    relato('AVISO', n, l, '100vw inclui a barra de rolagem → rolagem horizontal no desktop');
  }
  if (/\b100vh\b/.test(l)) {
    relato('AVISO', n, l, '100vh estoura no celular (barra do navegador); prefira dvh');
  }

  /* 4. font-size abaixo de 16px em campo de texto → zoom automático no iOS */
  const campoTexto = /input\[type="(text|email|password|number|date|datetime-local|search)"\]|^select\b|^textarea\b/.test(l);
  if (campoTexto && /font-size:\s*(1[0-5]|9)(\.\d+)?px/.test(l)) {
    // aceitável só se o bloco (pointer: coarse) elevou para 16px no celular
    relato('AVISO', n, l, 'campo com fonte < 16px no desktop — confirme a regra de 16px em (pointer: coarse)');
  }

  /* 5. alvo de toque pequeno */
  const altura = l.match(/min-height:\s*(\d{1,2})px/);
  if (altura && !emMediaMobile && Number(altura[1]) < 32 && /btn|chip|icon-btn|nav-item|anexo|lista-menu/.test(l)) {
    relato('AVISO', n, l, `alvo de toque com ${altura[1]}px de altura (recomendado ≥ 40px)`);
  }

  /* 6. texto que não quebra + largura pode estourar */
  if (/white-space:\s*nowrap/.test(l) && /title|h1|h2|nome|titulo/.test(l)) {
    relato('AVISO', n, l, 'texto longo com nowrap pode invadir o vizinho ou criar rolagem');
  }

  /* 7. overflow texto em nome de arquivo / link longo */
  if (/overflow-wrap|word-break|text-overflow/.test(l)) ok.push(`linha ${n}: quebra de texto tratada`);

  /* 8. position fixed/sticky — precisa de contexto mobile */
  if (/position:\s*(fixed|sticky)/.test(l) && !emMediaMobile) {
    relato('AVISO', n, l, 'fixo/sticky fora de media query: confira o comportamento no celular');
  }
});

/* 9. @media presentes e faixas */
const faixas = [...css.matchAll(/@media[^{]+/g)].map((m) => m[0].trim());
const tem320 = faixas.some((f) => /max-width:\s*(320|360|380|400|4[0-4]\d)px/.test(f));
const tem760 = faixas.some((f) => /max-width:\s*(7[0-9]\d)px/.test(f));
const tem860 = faixas.some((f) => /max-width:\s*(8[0-9]\d)px/.test(f));

console.log('=== media queries encontradas ===');
faixas.forEach((f) => console.log(' ', f));
console.log();
console.log('320px coberto:', tem320 ? 'sim' : 'NÃO — falta uma faixa para celular pequeno');
console.log('760px coberto:', tem760 ? 'sim' : 'não');
console.log('860px coberto:', tem860 ? 'sim' : 'não');

console.log('\n=== PROBLEMAS (' + problemas.length + ') ===');
problemas.forEach((p) => console.log(`  L${p.linha}  ${p.detalhe}\n        ${p.regra}`));

console.log('\n=== AVISOS (' + avisos.length + ') ===');
avisos.forEach((p) => console.log(`  L${p.linha}  ${p.detalhe}\n        ${p.regra}`));

console.log('\n=== tokens de cor literais em componentes ===');
const literais = [];
linhas.forEach((texto, i) => {
  const l = texto.trim();
  if (/^\s*--/.test(l)) return;              // definição de token, pode ter hex
  const m = l.match(/#[0-9a-fA-F]{3,8}\b/);
  if (m) literais.push(`L${i + 1}  ${m[0]}  ${l.slice(0, 70)}`);
});
console.log(literais.length ? literais.join('\n') : '  nenhum (bom)');

process.exit(problemas.length ? 1 : 0);
