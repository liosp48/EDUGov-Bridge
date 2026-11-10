"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface DonneesCause {
  nom: string;
  alertes: number;
}

export default function GraphCauses({ data }: { data: DonneesCause[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 60, right: 16 }}>
        <CartesianGrid horizontal={false} strokeDasharray="3 3" stroke="#E2E8F0" />
        <XAxis type="number" allowDecimals={false} fontSize={12} />
        <YAxis
          type="category"
          dataKey="nom"
          width={180}
          fontSize={11}
          tickFormatter={(v: string) => (v.length > 34 ? `${v.slice(0, 33)}…` : v)}
        />
        <Tooltip />
        <Bar dataKey="alertes" name="Alertes" radius={[0, 4, 4, 0]} barSize={14}>
          {data.map((e) => (
            <Cell key={e.nom} fill="#EF2B2D" />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
