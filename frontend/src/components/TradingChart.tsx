import React, { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Activity, BarChart2, Calendar, Layers, ShieldCheck } from 'lucide-react'

export interface HistoryItem {
  date: string
  movements: number | string
  receipts: number | string
}

interface TradingChartProps {
  data: HistoryItem[]
  title?: string
  subtitle?: string
}

type ChartMode = 'candles' | 'line' | 'bars'
type TimeRange = '7D' | '14D' | '30D'

export default function TradingChart({ data = [], title = 'Fluxo Operacional', subtitle = 'Análise de entradas e saídas de materiais' }: TradingChartProps) {
  const [mode, setMode] = useState<ChartMode>('candles')
  const [range, setRange] = useState<TimeRange>('30D')
  const [hoverIndex, setHoverIndex] = useState<number | null>(null)

  // Filter data according to selected timeframe
  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return []
    const count = range === '7D' ? 7 : range === '14D' ? 14 : 30
    return data.slice(-count)
  }, [data, range])

  // Calculate trade metrics (OHLC-like simulation for logistics flow)
  // For each day:
  // - Entradas (receipts) represent Inflow / Bullish volume
  // - Saídas (movements) represent Outflow / Bearish volume
  // - Net Balance = receipts - movements
  // - Total Volume = receipts + movements
  const tradeStats = useMemo(() => {
    if (!filteredData.length) {
      return {
        totalReceipts: 0,
        totalMovements: 0,
        totalVolume: 0,
        netBalance: 0,
        maxDaily: 1,
        minDaily: 0,
        avgVolume: 0,
        bullishDays: 0,
        bearishDays: 0,
        trend: 'neutral' as 'bullish' | 'bearish' | 'neutral',
        trendPercent: '+0.0%'
      }
    }

    let totalR = 0
    let totalM = 0
    let maxD = 0
    let minD = Infinity
    let bullDays = 0
    let bearDays = 0

    filteredData.forEach(d => {
      const r = Number(d.receipts) || 0
      const m = Number(d.movements) || 0
      const vol = r + m
      totalR += r
      totalM += m
      if (vol > maxD) maxD = vol
      if (vol < minD) minD = vol
      if (r >= m) bullDays++
      else bearDays++
    })

    if (minD === Infinity) minD = 0
    const totalVol = totalR + totalM
    const net = totalR - totalM
    const avg = Math.round(totalVol / filteredData.length)
    const trendRatio = totalVol > 0 ? (net / totalVol) * 100 : 0
    const trendPercent = `${trendRatio >= 0 ? '+' : ''}${trendRatio.toFixed(1)}%`

    return {
      totalReceipts: totalR,
      totalMovements: totalM,
      totalVolume: totalVol,
      netBalance: net,
      maxDaily: Math.max(maxD, 5),
      minDaily: minD,
      avgVolume: avg,
      bullishDays: bullDays,
      bearishDays: bearDays,
      trend: net >= 0 ? ('bullish' as const) : ('bearish' as const),
      trendPercent
    }
  }, [filteredData])

  // Coordinates & SVG dimensions
  const svgWidth = 860
  const svgHeight = 270
  const padLeft = 40
  const padRight = 55
  const padTop = 30
  const padBottom = 40
  const chartW = svgWidth - padLeft - padRight
  const chartH = svgHeight - padTop - padBottom

  // Candle computations
  const candles = useMemo(() => {
    if (!filteredData.length) return []
    const count = filteredData.length
    const colW = chartW / count
    const candleWidth = Math.max(5, Math.min(colW * 0.65, 24))

    let prevClose = Number(filteredData[0]?.receipts || 0)

    return filteredData.map((d, i) => {
      const receipts = Number(d.receipts) || 0
      const movements = Number(d.movements) || 0
      const totalVol = receipts + movements
      const isBull = receipts >= movements

      // Synthetic OHLC mapping for operational trade:
      // Open: previous baseline flow
      // High: maximum peak flow reached today
      // Low: lowest flow of the day
      // Close: ending net volume
      const open = prevClose
      const high = Math.max(receipts, movements, totalVol * 0.9, open + 1)
      const low = Math.max(0, Math.min(receipts, movements, open - 1))
      const close = isBull ? open + receipts : Math.max(0, open - movements)
      prevClose = close

      const scaleY = (val: number) => {
        const norm = Math.min(1, Math.max(0, val / (tradeStats.maxDaily * 1.25)))
        return padTop + chartH - norm * chartH
      }

      const x = padLeft + i * colW + colW / 2
      const yHigh = scaleY(high)
      const yLow = scaleY(low)
      const yOpen = scaleY(open)
      const yClose = scaleY(close)
      const yTop = Math.min(yOpen, yClose)
      const bodyH = Math.max(3, Math.abs(yClose - yOpen))

      // 7-day Simple Moving Average (SMA)
      let sum7 = 0
      let c7 = 0
      for (let j = Math.max(0, i - 6); j <= i; j++) {
        sum7 += Number(filteredData[j].receipts || 0) + Number(filteredData[j].movements || 0)
        c7++
      }
      const sma = c7 > 0 ? sum7 / c7 : totalVol
      const ySma = scaleY(sma)

      // Format date
      const dObj = new Date(d.date + 'T00:00:00')
      const dayLabel = dObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
      const weekday = dObj.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')

      return {
        date: d.date,
        dayLabel,
        weekday,
        receipts,
        movements,
        totalVol,
        net: receipts - movements,
        isBull,
        x,
        yHigh,
        yLow,
        yTop,
        bodyH,
        candleWidth,
        ySma,
        rawYVol: scaleY(totalVol)
      }
    })
  }, [filteredData, chartW, chartH, padLeft, padTop, tradeStats.maxDaily])

  // Active point for tooltip (either hovered or the last point)
  const activeItem = hoverIndex !== null && candles[hoverIndex] ? candles[hoverIndex] : candles[candles.length - 1]

  // Lines for line/area mode and SMA curve
  const { linePath, areaPath, smaPath } = useMemo(() => {
    if (candles.length < 2) return { linePath: '', areaPath: '', smaPath: '' }

    let lp = `M ${candles[0].x} ${candles[0].rawYVol}`
    let sp = `M ${candles[0].x} ${candles[0].ySma}`

    for (let i = 1; i < candles.length; i++) {
      const prev = candles[i - 1]
      const curr = candles[i]
      const cpX = (prev.x + curr.x) / 2
      lp += ` C ${cpX} ${prev.rawYVol}, ${cpX} ${curr.rawYVol}, ${curr.x} ${curr.rawYVol}`
      sp += ` C ${cpX} ${prev.ySma}, ${cpX} ${curr.ySma}, ${curr.x} ${curr.ySma}`
    }

    const firstX = candles[0].x
    const lastX = candles[candles.length - 1].x
    const bottomY = padTop + chartH
    const ap = `${lp} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`

    return { linePath: lp, areaPath: ap, smaPath: sp }
  }, [candles, chartH, padTop])

  // Y-axis grid increments
  const yTicks = useMemo(() => {
    const max = tradeStats.maxDaily * 1.25
    return [
      { val: Math.round(max), y: padTop },
      { val: Math.round(max * 0.75), y: padTop + chartH * 0.25 },
      { val: Math.round(max * 0.5), y: padTop + chartH * 0.5 },
      { val: Math.round(max * 0.25), y: padTop + chartH * 0.75 },
      { val: 0, y: padTop + chartH }
    ]
  }, [tradeStats.maxDaily, chartH, padTop])

  return (
    <div className="trade-chart-card">
      {/* Header bar com ticker e status de mercado operacional */}
      <div className="trade-chart-header">
        <div className="trade-title-group">
          <div className="trade-badge-row">
            <span className="trade-ticker">ELLENCO · OPS/BRL</span>
            <span className="trade-live-badge">
              <span className="live-pulse" /> EM TEMPO REAL
            </span>
          </div>
          <h2 className="trade-title">{title}</h2>
          <p className="trade-subtitle">{subtitle}</p>
        </div>

        {/* Controles de Modo & Timeframe */}
        <div className="trade-controls">
          <div className="trade-segmented-group" role="group" aria-label="Intervalo de tempo">
            {(['7D', '14D', '30D'] as TimeRange[]).map(r => (
              <button
                key={r}
                type="button"
                className={`trade-segment-btn ${range === r ? 'active' : ''}`}
                onClick={() => setRange(r)}
              >
                {r}
              </button>
            ))}
          </div>

          <div className="trade-segmented-group" role="group" aria-label="Tipo de gráfico">
            <button
              type="button"
              className={`trade-segment-btn ${mode === 'candles' ? 'active' : ''}`}
              onClick={() => setMode('candles')}
              title="Modo Candlestick (Velas de Trade)"
            >
              🕯️ Candles
            </button>
            <button
              type="button"
              className={`trade-segment-btn ${mode === 'line' ? 'active' : ''}`}
              onClick={() => setMode('line')}
              title="Modo Linha / Área de Tendência"
            >
              📈 Área
            </button>
            <button
              type="button"
              className={`trade-segment-btn ${mode === 'bars' ? 'active' : ''}`}
              onClick={() => setMode('bars')}
              title="Modo Barras de Fluxo"
            >
              📊 Barras
            </button>
          </div>
        </div>
      </div>

      {/* Ticker HUD / Stats financeiras e operacionais */}
      <div className="trade-hud-stats">
        <div className="trade-stat-item">
          <span className="trade-stat-label">Volume Total</span>
          <strong className="trade-stat-value">{tradeStats.totalVolume.toLocaleString('pt-BR')} un</strong>
        </div>
        <div className="trade-stat-item">
          <span className="trade-stat-label">Saldo Líquido</span>
          <strong className={`trade-stat-value ${tradeStats.netBalance >= 0 ? 'text-emerald' : 'text-rose'}`}>
            {tradeStats.netBalance >= 0 ? `+${tradeStats.netBalance}` : tradeStats.netBalance} un
          </strong>
        </div>
        <div className="trade-stat-item">
          <span className="trade-stat-label">Tendência Geral</span>
          <span className={`trade-trend-pill ${tradeStats.trend === 'bullish' ? 'bullish' : 'bearish'}`}>
            {tradeStats.trend === 'bullish' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            {tradeStats.trendPercent}
          </span>
        </div>
        <div className="trade-stat-item">
          <span className="trade-stat-label">Pico Diário (Máx)</span>
          <strong className="trade-stat-value">{tradeStats.maxDaily.toLocaleString('pt-BR')} un</strong>
        </div>
        <div className="trade-stat-item">
          <span className="trade-stat-label">Média Móvel Diária</span>
          <strong className="trade-stat-value text-cyan">{tradeStats.avgVolume} un/dia</strong>
        </div>
      </div>

      {/* Floating Inspector HUD (quando passa o cursor ou clica) */}
      {activeItem && (
        <div className="trade-active-hud">
          <div className="hud-pill date-pill">
            <Calendar size={13} />
            <span>{activeItem.dayLabel} ({activeItem.weekday})</span>
          </div>
          <div className="hud-pill bull-pill">
            <span className="hud-dot bg-emerald" />
            <span>Entradas: <b>+{activeItem.receipts}</b></span>
          </div>
          <div className="hud-pill bear-pill">
            <span className="hud-dot bg-rose" />
            <span>Saídas: <b>-{activeItem.movements}</b></span>
          </div>
          <div className="hud-pill vol-pill">
            <span className="hud-dot bg-purple" />
            <span>Vol: <b>{activeItem.totalVol}</b></span>
          </div>
          <div className="hud-pill net-pill">
            <span>Saldo: <b className={activeItem.net >= 0 ? 'text-emerald' : 'text-rose'}>
              {activeItem.net >= 0 ? `+${activeItem.net}` : activeItem.net}
            </b></span>
          </div>
        </div>
      )}

      {/* Canvas SVG Interativo de Trading */}
      <div className="trade-canvas-wrapper">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="trade-svg-canvas"
          preserveAspectRatio="none"
          onMouseLeave={() => setHoverIndex(null)}
        >
          <defs>
            {/* Gradiente da área de trade */}
            <linearGradient id="tradeAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.32" />
              <stop offset="50%" stopColor="#0ea5e9" stopOpacity="0.14" />
              <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.0" />
            </linearGradient>

            {/* Gradiente das velas bullish (verde esmeralda trading) */}
            <linearGradient id="bullCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="100%" stopColor="#059669" />
            </linearGradient>

            {/* Gradiente das velas bearish (vermelho coral trading) */}
            <linearGradient id="bearCandleGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#fb7185" />
              <stop offset="100%" stopColor="#e11d48" />
            </linearGradient>

            {/* Sombra suave para a linha de trade */}
            <filter id="tradeLineGlow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#0ea5e9" floodOpacity="0.45" />
            </filter>
          </defs>

          {/* Linhas de Grade de Preço / Volume (Grid financeiro tracejado) */}
          {yTicks.map((tick, i) => (
            <g key={i} className="trade-grid-row">
              <line
                x1={padLeft}
                y1={tick.y}
                x2={svgWidth - padRight}
                y2={tick.y}
                className="trade-grid-line"
              />
              <text
                x={svgWidth - padRight + 8}
                y={tick.y + 4}
                className="trade-axis-text"
              >
                {tick.val}
              </text>
            </g>
          ))}

          {/* VISUALIZAÇÃO: MODO CANDLES */}
          {mode === 'candles' && (
            <g className="trade-candles-group">
              {candles.map((c, i) => {
                const isHovered = hoverIndex === i
                const color = c.isBull ? '#10b981' : '#f43f5e'
                const fillGrad = c.isBull ? 'url(#bullCandleGrad)' : 'url(#bearCandleGrad)'

                return (
                  <g
                    key={c.date}
                    className={`candle-group ${isHovered ? 'candle-hovered' : ''}`}
                    onMouseEnter={() => setHoverIndex(i)}
                  >
                    {/* Pavio Superior e Inferior (Wicks) */}
                    <line
                      x1={c.x}
                      y1={c.yHigh}
                      x2={c.x}
                      y2={c.yLow}
                      stroke={color}
                      strokeWidth={isHovered ? 2.5 : 1.5}
                      strokeLinecap="round"
                    />

                    {/* Corpo do Candlestick */}
                    <rect
                      x={c.x - c.candleWidth / 2}
                      y={c.yTop}
                      width={c.candleWidth}
                      height={c.bodyH}
                      rx={3}
                      fill={fillGrad}
                      stroke={color}
                      strokeWidth={1}
                      filter={isHovered ? 'drop-shadow(0 0 6px rgba(16,185,129,0.5))' : undefined}
                    />

                    {/* Coluna invisível para detecção de hover e toque */}
                    <rect
                      x={c.x - c.candleWidth}
                      y={padTop}
                      width={c.candleWidth * 2}
                      height={chartH}
                      fill="transparent"
                      cursor="crosshair"
                      onClick={() => setHoverIndex(i)}
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* VISUALIZAÇÃO: MODO LINHA / ÁREA DE TENDÊNCIA */}
          {mode === 'line' && (
            <g className="trade-line-group">
              {areaPath && <path d={areaPath} fill="url(#tradeAreaGrad)" />}
              {linePath && (
                <path
                  d={linePath}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="3.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#tradeLineGlow)"
                />
              )}

              {/* Pontos nos dados */}
              {candles.map((c, i) => (
                <circle
                  key={c.date}
                  cx={c.x}
                  cy={c.rawYVol}
                  r={hoverIndex === i ? 6 : 3.5}
                  fill={c.isBull ? '#10b981' : '#f43f5e'}
                  stroke="#fff"
                  strokeWidth={hoverIndex === i ? 2.5 : 1.5}
                  cursor="pointer"
                  onMouseEnter={() => setHoverIndex(i)}
                  onClick={() => setHoverIndex(i)}
                />
              ))}
            </g>
          )}

          {/* VISUALIZAÇÃO: MODO BARRAS DE FLUXO */}
          {mode === 'bars' && (
            <g className="trade-bars-group">
              {candles.map((c, i) => {
                const isHovered = hoverIndex === i
                const barWidth = Math.max(4, Math.min(c.candleWidth * 0.45, 10))
                const hReceipts = Math.max(3, (c.receipts / (tradeStats.maxDaily * 1.25)) * chartH)
                const hMovements = Math.max(3, (c.movements / (tradeStats.maxDaily * 1.25)) * chartH)
                const yR = padTop + chartH - hReceipts
                const yM = padTop + chartH - hMovements

                return (
                  <g
                    key={c.date}
                    className="trade-bar-pair"
                    onMouseEnter={() => setHoverIndex(i)}
                    onClick={() => setHoverIndex(i)}
                  >
                    {/* Barra de Recebimentos (Verde) */}
                    <rect
                      x={c.x - barWidth - 1}
                      y={yR}
                      width={barWidth}
                      height={hReceipts}
                      rx={2}
                      fill="#10b981"
                      opacity={isHovered ? 1 : 0.85}
                    />
                    {/* Barra de Movimentações (Vermelho) */}
                    <rect
                      x={c.x + 1}
                      y={yM}
                      width={barWidth}
                      height={hMovements}
                      rx={2}
                      fill="#f43f5e"
                      opacity={isHovered ? 1 : 0.85}
                    />
                  </g>
                )
              })}
            </g>
          )}

          {/* Curva de Média Móvel SMA (Azul / Ciano) */}
          {smaPath && (
            <path
              d={smaPath}
              fill="none"
              stroke="#0ea5e9"
              strokeWidth="2"
              strokeDasharray="4 3"
              opacity="0.85"
            />
          )}

          {/* Crosshair Interativo (Cursor de Trade) */}
          {hoverIndex !== null && candles[hoverIndex] && (
            <g className="trade-crosshair">
              {/* Linha vertical */}
              <line
                x1={candles[hoverIndex].x}
                y1={padTop}
                x2={candles[hoverIndex].x}
                y2={padTop + chartH}
                stroke="#64748b"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {/* Linha horizontal no ponto de volume */}
              <line
                x1={padLeft}
                y1={candles[hoverIndex].rawYVol}
                x2={svgWidth - padRight}
                y2={candles[hoverIndex].rawYVol}
                stroke="#64748b"
                strokeWidth="1.2"
                strokeDasharray="3 3"
              />
              {/* Ponto focal pulsante */}
              <circle
                cx={candles[hoverIndex].x}
                cy={candles[hoverIndex].rawYVol}
                r="7"
                fill="#0ea5e9"
                fillOpacity="0.3"
              />
              <circle
                cx={candles[hoverIndex].x}
                cy={candles[hoverIndex].rawYVol}
                r="3.5"
                fill="#0ea5e9"
              />
            </g>
          )}

          {/* Eixo X com datas formatadas */}
          {candles.map((c, i) => {
            // Em telas menores ou com muitos pontos, pular alguns rótulos para não embolar
            const step = candles.length > 20 ? 3 : candles.length > 10 ? 2 : 1
            if (i % step !== 0 && i !== candles.length - 1) return null

            return (
              <text
                key={c.date}
                x={c.x}
                y={svgHeight - 12}
                textAnchor="middle"
                className={`trade-date-label ${hoverIndex === i ? 'font-bold text-primary' : ''}`}
              >
                {c.dayLabel}
              </text>
            )
          })}
        </svg>
      </div>

      {/* Legenda a Cores Completa e Vibrante */}
      <div className="trade-color-legend">
        <div className="legend-badge">
          <span className="legend-indicator bg-emerald" />
          <span className="legend-title">Entradas / Recebimentos (Alta)</span>
          <strong className="legend-value text-emerald">+{tradeStats.totalReceipts} un</strong>
        </div>

        <div className="legend-badge">
          <span className="legend-indicator bg-rose" />
          <span className="legend-title">Saídas / Movimentações (Baixa)</span>
          <strong className="legend-value text-rose">-{tradeStats.totalMovements} un</strong>
        </div>

        <div className="legend-badge">
          <span className="legend-indicator bg-cyan" />
          <span className="legend-title">Média Móvel (SMA-7)</span>
          <strong className="legend-value text-cyan">~{tradeStats.avgVolume} un</strong>
        </div>

        <div className="legend-badge">
          <span className="legend-indicator bg-purple" />
          <span className="legend-title">Volume Acumulado</span>
          <strong className="legend-value text-purple">{tradeStats.totalVolume} un</strong>
        </div>
      </div>
    </div>
  )
}
