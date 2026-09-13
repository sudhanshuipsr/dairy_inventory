import React from 'react';
import { ResponsiveContainer, AreaChart, Area } from 'recharts';

/**
 * Minimalist Sparkline component: renders a subtle trend shape inside KPI cards.
 */
const Sparkline = ({
  data = [],
  dataKey = 'value',
  color = '#10b981',
  height = 28,
  fillOpacity = 0.25
}) => {
  if (!data || data.length < 2) {
    // Generate a subtle neutral placeholder curve if no time-series yet
    data = [{ value: 10 }, { value: 12 }, { value: 11 }, { value: 15 }, { value: 14 }, { value: 18 }];
    dataKey = 'value';
  }

  // Format array if numbers passed directly
  const formattedData = typeof data[0] === 'number' 
    ? data.map((n, i) => ({ idx: i, val: n }))
    : data;
  const key = typeof data[0] === 'number' ? 'val' : dataKey;

  const gradientId = `sparklineGrad_${color.replace('#', '')}_${Math.random().toString(36).substring(2, 7)}`;

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formattedData} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={fillOpacity} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey={key}
            stroke={color}
            strokeWidth={1.8}
            fill={`url(#${gradientId})`}
            isAnimationActive={true}
            animationDuration={900}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default Sparkline;
