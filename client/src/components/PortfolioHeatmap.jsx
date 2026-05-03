import React, { useMemo, useState, useRef, useEffect } from 'react';

/**
 * PortfolioHeatmap — SVG-based treemap visualization
 *
 * Each rectangle is sized by market value and colored by P/L percentage.
 * Hover shows a detailed tooltip with position info.
 *
 * Props:
 *   holdings: Array<{ ticker, name, mv, totPL, alloc, shares, currentPrice, avgCost }>
 */

// ── Color scale: P/L % → fill color ──
function plColor(plPct) {
  if (plPct <= -5) return '#d32f2f';
  if (plPct <= -2) return '#ef5350';
  if (plPct < -0.5) return '#e57373';
  if (plPct <= 0.5) return '#546e7a';
  if (plPct <= 2) return '#66bb6a';
  if (plPct <= 5) return '#43a047';
  return '#2e7d32';
}

// ── Squarified treemap layout ──
// Takes items sorted by value desc, lays out in a container rect
function squarify(items, x, y, w, h) {
  if (items.length === 0) return [];
  if (items.length === 1) {
    return [{ ...items[0], x, y, w, h }];
  }

  const total = items.reduce((s, i) => s + i.value, 0);
  if (total <= 0) return [];

  const rects = [];
  let remaining = [...items];
  let cx = x, cy = y, cw = w, ch = h;

  while (remaining.length > 0) {
    const isWide = cw >= ch;
    const side = isWide ? ch : cw;
    const totalRemaining = remaining.reduce((s, i) => s + i.value, 0);

    // Find the best row
    let row = [remaining[0]];
    let rowSum = remaining[0].value;
    let bestWorst = worstRatio(row, rowSum, side, totalRemaining);

    for (let i = 1; i < remaining.length; i++) {
      const next = remaining[i];
      const newRow = [...row, next];
      const newSum = rowSum + next.value;
      const newWorst = worstRatio(newRow, newSum, side, totalRemaining);

      if (newWorst <= bestWorst) {
        row = newRow;
        rowSum = newSum;
        bestWorst = newWorst;
      } else {
        break;
      }
    }

    // Layout the row
    const rowFraction = rowSum / totalRemaining;
    const rowSize = isWide ? cw * rowFraction : ch * rowFraction;
    let offset = 0;

    for (const item of row) {
      const frac = item.value / rowSum;
      const itemSize = side * frac;

      if (isWide) {
        rects.push({ ...item, x: cx, y: cy + offset, w: rowSize, h: itemSize });
      } else {
        rects.push({ ...item, x: cx + offset, y: cy, w: itemSize, h: rowSize });
      }
      offset += itemSize;
    }

    // Update remaining area
    if (isWide) {
      cx += rowSize;
      cw -= rowSize;
    } else {
      cy += rowSize;
      ch -= rowSize;
    }

    remaining = remaining.slice(row.length);
  }

  return rects;
}

function worstRatio(row, rowSum, side, totalArea) {
  const rowArea = (rowSum / totalArea) * side * side;
  const rowWidth = rowSum > 0 ? (rowArea / side) : 0;
  let worst = 0;

  for (const item of row) {
    const itemArea = (item.value / totalArea) * side * side;
    const itemHeight = rowWidth > 0 ? itemArea / rowWidth : 0;
    const ratio = Math.max(itemHeight / rowWidth, rowWidth / itemHeight) || 1;
    worst = Math.max(worst, ratio);
  }

  return worst;
}

const fmt = (n) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n);

const PortfolioHeatmap = ({ holdings }) => {
  const containerRef = useRef(null);
  const [dims, setDims] = useState({ w: 800, h: 400 });
  const [tooltip, setTooltip] = useState(null);
  const [mounted, setMounted] = useState(false);

  // Responsive sizing
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (entry) {
        const w = entry.contentRect.width;
        setDims({ w, h: Math.max(350, w * 0.45) });
      }
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Fade-in
  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  // Prepare & layout
  const rects = useMemo(() => {
    if (!holdings || holdings.length === 0) return [];

    const items = holdings
      .filter(h => h.mv > 0)
      .map(h => ({
        ticker: h.ticker,
        name: h.name,
        value: h.mv,
        mv: h.mv,
        totPL: h.totPL,
        plPct: h.costBasis > 0 ? ((h.mv - h.costBasis) / h.costBasis) * 100 : 0,
        shares: h.shares,
        currentPrice: h.currentPrice,
        avgCost: h.avgCost,
        alloc: h.alloc,
      }))
      .sort((a, b) => b.value - a.value);

    const PAD = 2;
    return squarify(items, PAD, PAD, dims.w - PAD * 2, dims.h - PAD * 2);
  }, [holdings, dims]);

  const handleMouseEnter = (rect, e) => {
    const container = containerRef.current.getBoundingClientRect();
    setTooltip({
      ...rect,
      mouseX: e.clientX - container.left,
      mouseY: e.clientY - container.top,
    });
  };

  const handleMouseMove = (e) => {
    if (!tooltip) return;
    const container = containerRef.current.getBoundingClientRect();
    setTooltip(prev => ({
      ...prev,
      mouseX: e.clientX - container.left,
      mouseY: e.clientY - container.top,
    }));
  };

  const handleMouseLeave = () => setTooltip(null);

  // Minimum area threshold for labels
  const totalArea = dims.w * dims.h;

  return (
    <div
      className={`heatmap-container ${mounted ? 'heatmap-mounted' : ''}`}
      ref={containerRef}
    >
      <svg
        width={dims.w}
        height={dims.h}
        viewBox={`0 0 ${dims.w} ${dims.h}`}
        className="heatmap-svg"
      >
        {rects.map((r, i) => {
          const fill = plColor(r.plPct);
          const rectArea = r.w * r.h;
          const areaRatio = rectArea / totalArea;
          const showTicker = r.w > 40 && r.h > 28;
          const showPct = r.w > 50 && r.h > 42;
          const showValue = r.w > 70 && r.h > 58;

          // Dynamic font sizing based on rectangle area
          const tickerSize = Math.max(10, Math.min(18, Math.sqrt(areaRatio * 3000)));
          const subSize = Math.max(8, tickerSize * 0.65);

          return (
            <g
              key={r.ticker}
              className="heatmap-cell"
              onMouseEnter={(e) => handleMouseEnter(r, e)}
              onMouseMove={handleMouseMove}
              onMouseLeave={handleMouseLeave}
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <rect
                x={r.x + 1}
                y={r.y + 1}
                width={Math.max(0, r.w - 2)}
                height={Math.max(0, r.h - 2)}
                rx={4}
                fill={fill}
                className="heatmap-rect"
              />
              {showTicker && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + (showPct ? -4 : 4)}
                  textAnchor="middle"
                  fill="#fff"
                  fontWeight="700"
                  fontSize={tickerSize}
                  className="heatmap-label"
                >
                  {r.ticker}
                </text>
              )}
              {showPct && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + (showValue ? 10 : 14)}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.85)"
                  fontSize={subSize}
                  fontWeight="500"
                >
                  {r.plPct >= 0 ? '+' : ''}{r.plPct.toFixed(1)}%
                </text>
              )}
              {showValue && (
                <text
                  x={r.x + r.w / 2}
                  y={r.y + r.h / 2 + 24}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.6)"
                  fontSize={subSize * 0.9}
                  fontWeight="400"
                >
                  {fmt(r.mv)}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {/* Tooltip */}
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{
            left: Math.min(tooltip.mouseX + 12, dims.w - 200),
            top: Math.min(tooltip.mouseY - 10, dims.h - 120),
          }}
        >
          <div className="heatmap-tooltip-header">
            <strong>{tooltip.ticker}</strong>
            <span>{tooltip.name}</span>
          </div>
          <div className="heatmap-tooltip-rows">
            <div><span>Shares</span><span>{tooltip.shares}</span></div>
            <div><span>Price</span><span>{fmt(tooltip.currentPrice)}</span></div>
            <div><span>Avg Cost</span><span>{fmt(tooltip.avgCost)}</span></div>
            <div><span>Market Value</span><span>{fmt(tooltip.mv)}</span></div>
            <div>
              <span>P/L</span>
              <span className={tooltip.totPL >= 0 ? 'price-up' : 'price-down'}>
                {tooltip.totPL >= 0 ? '+' : ''}{fmt(tooltip.totPL)} ({tooltip.plPct >= 0 ? '+' : ''}{tooltip.plPct.toFixed(2)}%)
              </span>
            </div>
            <div><span>Allocation</span><span>{tooltip.alloc.toFixed(1)}%</span></div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PortfolioHeatmap;
