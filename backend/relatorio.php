<?php
/**
 * Relatório em PDF — usa FPDF (fpdf/fpdf no Composer) quando instalado.
 *
 * Se a biblioteca não estiver presente, cai para HTML imprimível com
 * @media print, em vez de quebrar. Assim a funcionalidade nunca "some".
 *
 * Permissão: RELATORIO_GERAR (admin e gestor).
 */
require_once __DIR__ . '/layout.php';

$user = require_login();
require_permission($user, 'RELATORIO_GERAR');

$pdo = db();

/* período: mês corrente por padrão */
$inicio = $_GET['inicio'] ?? date('Y-m-01');
$fim    = $_GET['fim']    ?? date('Y-m-t');

if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $inicio)) $inicio = date('Y-m-01');
if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $fim))    $fim    = date('Y-m-t');

$linhas = [];
$erro = '';
try {
    // agregado por pessoa — o banco faz a conta, não o PHP
    $stmt = $pdo->prepare(
        "SELECT u.nome,
                f.nome AS funcao,
                COUNT(a.id) AS metas,
                COUNT(a.id) FILTER (WHERE a.status = 'concluida') AS concluidas,
                COALESCE(ROUND(AVG(a.progresso)), 0) AS media
         FROM usuarios u
         LEFT JOIN funcoes f ON f.id = u.funcao_id
         LEFT JOIN meta_atribuicoes a ON a.usuario_id = u.id
         LEFT JOIN metas m ON m.id = a.meta_id AND m.semana_fim BETWEEN ? AND ?
         WHERE u.ativo = 1
         GROUP BY u.id, u.nome, f.nome
         ORDER BY u.nome
         LIMIT 200"
    );
    $stmt->execute([$inicio, $fim]);
    $linhas = $stmt->fetchAll();
} catch (Throwable $e) {
    $erro = $e instanceof PDOException && $e->getCode() === '42P01'
        ? 'a migração database-V1.sql ainda não foi aplicada.'
        : 'erro ao gerar o relatório.';
}

$periodo = date('d/m/Y', strtotime($inicio)) . ' a ' . date('d/m/Y', strtotime($fim));

/* ---- tenta o PDF de verdade ---- */
$autoload = __DIR__ . '/../vendor/autoload.php';
if ($erro === '' && is_file($autoload)) {
    require_once $autoload;

    if (class_exists('FPDF')) {
        $pdf = new FPDF('P', 'mm', 'A4');
        $pdf->AddPage();
        $pdf->SetFont('Helvetica', 'B', 14);
        $pdf->Cell(0, 10, utf8_decode('Ellenco Construções — Relatório de Metas'), 0, 1);
        $pdf->SetFont('Helvetica', '', 10);
        $pdf->Cell(0, 6, utf8_decode('Período: ' . $periodo), 0, 1);
        $pdf->Ln(4);

        $larguras = [70, 40, 25, 30, 25];
        $pdf->SetFont('Helvetica', 'B', 9);
        $pdf->SetFillColor(238, 242, 255);
        foreach (['Pessoa', 'Função', 'Metas', 'Concluídas', 'Média'] as $i => $t) {
            $pdf->Cell($larguras[$i], 8, utf8_decode($t), 1, 0, 'L', true);
        }
        $pdf->Ln();

        $pdf->SetFont('Helvetica', '', 9);
        foreach ($linhas as $l) {
            $pdf->Cell($larguras[0], 7, utf8_decode(mb_substr((string) $l['nome'], 0, 38)), 1);
            $pdf->Cell($larguras[1], 7, utf8_decode(mb_substr((string) ($l['funcao'] ?? '—'), 0, 22)), 1);
            $pdf->Cell($larguras[2], 7, (string) (int) $l['metas'], 1, 0, 'C');
            $pdf->Cell($larguras[3], 7, (string) (int) $l['concluidas'], 1, 0, 'C');
            $pdf->Cell($larguras[4], 7, number_format((float) $l['media'], 0) . '%', 1, 0, 'C');
            $pdf->Ln();
        }

        $pdf->Ln(6);
        $pdf->SetFont('Helvetica', 'I', 8);
        $pdf->Cell(0, 5, utf8_decode('Gerado em ' . date('d/m/Y H:i') . ' por ' . $user['nome']), 0, 1);

        header('Content-Type: application/pdf');
        header('Content-Disposition: attachment; filename="ellenco-relatorio-' . $inicio . '.pdf"');
        $pdf->Output('D', 'ellenco-relatorio.pdf');
        exit;
    }
}

/* ---- fallback: HTML imprimível ---- */
$tabela = '';
foreach ($linhas as $l) {
    $tabela .= '<tr><td>' . h($l['nome']) . '</td><td>' . h($l['funcao'] ?? '—') . '</td>'
             . '<td>' . (int) $l['metas'] . '</td><td>' . (int) $l['concluidas'] . '</td>'
             . '<td>' . number_format((float) $l['media'], 0) . '%</td></tr>';
}
if ($tabela === '') {
    $tabela = '<tr><td colspan="5" style="text-align:center">Sem dados no período.</td></tr>';
}

$conteudo = ($erro !== '' ? '<div class="alert alert-warning">' . h($erro) . '</div>' : '')
  . '<div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:14px">'
  . '<form method="get" style="display:flex;gap:8px;align-items:end;flex-wrap:wrap">'
  . '<div class="field"><label for="rel-inicio">De</label>'
  . '<input type="date" id="rel-inicio" name="inicio" value="' . h($inicio) . '"></div>'
  . '<div class="field"><label for="rel-fim">Até</label>'
  . '<input type="date" id="rel-fim" name="fim" value="' . h($fim) . '"></div>'
  . '<button class="btn btn-primary" type="submit">Atualizar</button>'
  . '</form>'
  . '<button class="btn" type="button" onclick="window.print()">' . icon('download', 15) . ' Imprimir / salvar PDF</button>'
  . '</div>'
  . '<section class="card"><div class="card-head"><div>'
  . '<h3>Desempenho por pessoa</h3>'
  . '<p class="card-sub">Período: ' . h($periodo) . '</p></div></div>'
  . '<div class="table-wrap"><table class="tabela">'
  . '<thead><tr><th>Pessoa</th><th>Função</th><th>Metas</th><th>Concluídas</th><th>Média</th></tr></thead>'
  . '<tbody>' . $tabela . '</tbody></table></div></section>';

page($user, 'config', 'Relatório', 'Desempenho por pessoa no período', $conteudo, [
    'funcao'       => funcao_do_usuario($user) ?: tipo_acesso_label((string) $user['tipo_acesso']),
    'notificacoes' => contar_notificacoes((int) $user['id']),
]);
