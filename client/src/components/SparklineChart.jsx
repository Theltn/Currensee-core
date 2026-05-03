import React, { useRef, useEffect } from 'react';

/**
 * Lightweight sparkline chart using Canvas 2D API.
 * No Chart.js dependency — fast and tiny.
 */
const SparklineChart = ({ data = [], width = 120, height = 40, color }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas resolution for sharp rendering
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;
    const padding = 2;
    const drawWidth = width - padding * 2;
    const drawHeight = height - padding * 2;

    // Determine color from price direction if not provided
    const lineColor = color || (data[data.length - 1] >= data[0] ? '#26a69a' : '#ef5350');

    // Clear
    ctx.clearRect(0, 0, width, height);

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = lineColor;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    data.forEach((val, i) => {
      const x = padding + (i / (data.length - 1)) * drawWidth;
      const y = padding + drawHeight - ((val - min) / range) * drawHeight;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw gradient fill under the line
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, lineColor + '30'); // 19% opacity
    gradient.addColorStop(1, lineColor + '05'); // 2% opacity

    ctx.lineTo(padding + drawWidth, padding + drawHeight);
    ctx.lineTo(padding, padding + drawHeight);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();
  }, [data, width, height, color]);

  if (!data || data.length < 2) {
    return (
      <div
        style={{ width, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        <span style={{ fontSize: '10px', color: 'var(--text-muted)' }}>—</span>
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      style={{ width: `${width}px`, height: `${height}px`, display: 'block' }}
    />
  );
};

export default SparklineChart;
