'use client';

import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';

export function DashboardChart({ data }: { data: Array<Record<string, string | number>> }) {
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer>
        <LineChart data={data} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" stroke="#64748b" fontSize={12} />
          <YAxis stroke="#64748b" fontSize={12} />
          <Tooltip />
          <Line type="monotone" dataKey="cloro" stroke="#0c78b2" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="ph" stroke="#11b981" strokeWidth={3} dot={false} />
          <Line type="monotone" dataKey="temperatura" stroke="#f97316" strokeWidth={3} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
