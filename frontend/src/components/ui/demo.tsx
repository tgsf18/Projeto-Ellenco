"use client";

import { AnalyticsBento } from "./analytics-bento";

const bell = (x: number, m: number, s: number) => Math.exp(-(((x - m) / s) ** 2) / 2);
const hours = Array.from({ length: 25 }, (_, h) => h);
const desktop = [0, 1, 2].map((w) => hours.map((h) => Math.round(2400 * (1 - w * 0.16) * (bell(h, 13 - w * 0.6, 3.4) * 0.92 + bell(h, 20, 2.2) * 0.18))));
const mobile = [0, 1, 2].map((w) => hours.map((h) => Math.round(2600 * (1 - w * 0.18) * (bell(h, 20.5 - w * 0.4, 3) * 0.95 + bell(h, 8, 1.8) * 0.2))));

const seriesData = [7420, 7510, 7460, 7380, 7490, 7640, 7720, 7680, 7590, 7560, 7630, 7780, 7900, 7960, 7910, 7850, 7880, 8010, 8140, 8230, 8190, 8120, 8260, 8430, 8560, 8620, 8700, 8890, 9020, 9134];

export default function AnalyticsBentoDemo() {
  return (
    <div className="min-h-screen w-full bg-background px-4 py-8 sm:px-6 sm:py-10">
      <AnalyticsBento
        className="mx-auto max-w-[1240px]"
        revenue={{
          label: "Movimentações Operacionais",
          value: 9134,
          delta: "14.2%",
          note: <>Média diária <span className="font-semibold text-foreground/80">304 itens</span></>,
          caption: "Últimos 30 dias",
          series: seriesData.map((value, i) => ({
            value,
            label: new Date(2026, 8, 22 + i).toLocaleDateString("pt-BR", { month: "short", day: "numeric" })
          })),
        }}
        sessions={{
          label: "Operações por Turno",
          value: 48210,
          delta: "12.4%",
          note: "Por hora, últimas 3 semanas",
          desktop,
          mobile
        }}
        categories={{
          title: "Materiais por Categoria",
          groups: [
            { id: "eletrica", name: "Elétrica", color: "#174675", ink: "light" },
            { id: "civil", name: "Construção Civil", color: "#ef3f43", ink: "light" },
            { id: "epi", name: "EPI / Segurança", color: "#10b981", ink: "light" },
            { id: "ferramentas", name: "Ferramental", color: "#f59e0b", ink: "dark" },
            { id: "outros", name: "Geral", color: "#64748b", ink: "light" },
          ],
          periods: [
            { label: "Semanal", total: 2197, delta: "19.6%", compare: "vs 1.837 semana passada" },
            { label: "Mensal", total: 8903, delta: "1.9%", compare: "vs 8.730 mês passado" },
            { label: "Anual", total: 98134, delta: "22%", compare: "vs 80.437 ano passado" },
          ],
          items: [
            { name: "Cabos e Condutores", group: "eletrica", values: [509, 2140, 25600] },
            { name: "Cimento e Concreto", group: "civil", values: [353, 1460, 17800] },
            { name: "Capacetes e Óculos", group: "epi", values: [412, 1880, 22900] },
            { name: "Furadeiras e Serras", group: "ferramentas", values: [551, 2010, 24100] },
            { name: "Tintas e Solventes", group: "civil", values: [532, 1720, 19400] },
            { name: "Luvas de Proteção", group: "epi", values: [498, 2230, 26800] },
            { name: "Disjuntores", group: "eletrica", values: [445, 1590, 18100] },
            { name: "Tubos e Conexões", group: "civil", values: [290, 1310, 16900] },
            { name: "Parafusos e Fixação", group: "outros", values: [331, 1240, 13400] },
            { name: "Chaves e Alicates", group: "ferramentas", values: [380, 1120, 12300] },
            { name: "Sinalização e Cones", group: "epi", values: [118, 520, 6100] },
          ],
          table: {
            columns: ["Canteiro de Obras", "Semanal", "Mensal", "Anual"],
            rows: [
              { label: "Obra Central - Rodovia", values: ["1.030 un", "4.331 un", "42.120 un"] },
              { label: "Obra Subestação Leste", values: ["782 un", "2.795 un", "31.650 un"] },
              { label: "Almoxarifado Matriz", values: ["385 un", "1.777 un", "24.364 un"] },
            ],
          },
        }}
        seasonality={{
          title: "Sazonalidade Operacional",
          years: [
            {
              label: "2026",
              values: [16120, 20540, 24440, 18460, 28080, 21580, 17160, 25740, 30160, 22880, 32240, 23660],
              stats: [
                { label: "Média Mensal", value: 8097, delta: "19.6%", note: "44.214 itens" },
                { label: "Total Anual", value: 312134, delta: "2.5%", note: "301.002 itens" },
              ],
              rows: [
                { label: "Obra Central - Rodovia", value: "201.192 un" },
                { label: "Obra Subestação Leste", value: "192.054 un" },
                { label: "Almoxarifado Matriz", value: "161.300 un" }
              ],
            },
            {
              label: "2025",
              values: [13260, 16640, 18720, 22360, 20020, 15860, 14560, 19240, 23920, 26260, 23140, 19760],
              stats: [
                { label: "Média Mensal", value: 6772, delta: "8.1%", note: "38.920 itens" },
                { label: "Total Anual", value: 304521, delta: "4.4%", note: "287.410 itens" },
              ],
              rows: [
                { label: "Obra Central - Rodovia", value: "188.340 un" },
                { label: "Obra Subestação Leste", value: "171.215 un" },
                { label: "Almoxarifado Matriz", value: "150.870 un" }
              ],
            },
          ],
        }}
      />
    </div>
  );
}
