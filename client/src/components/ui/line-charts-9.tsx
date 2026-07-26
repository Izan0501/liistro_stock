import { Area, ComposedChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatCurrency } from "../../lib/utils"

export function LineChart9({ data }: { data: any[] }) {
  if (!data || data.length === 0) return null;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <ComposedChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <XAxis 
          dataKey="date" 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false}
          tickFormatter={(val) => {
            if (!val) return '';
            const d = new Date(val);
            return `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
          }}
        />
        <YAxis 
          stroke="#94a3b8" 
          fontSize={12} 
          tickLine={false} 
          axisLine={false} 
          tickFormatter={(val) => `$${val}`} 
        />
        <Tooltip 
          content={({ active, payload, label }) => {
            if (active && payload && payload.length) {
              return (
                <div className="bg-slate-900/90 border border-white/10 p-4 rounded-xl shadow-2xl backdrop-blur-md">
                  <p className="text-text-primary font-bold mb-2">{label}</p>
                  {payload.map((entry, index) => (
                    <div key={index} className="flex items-center justify-between gap-4 text-sm font-medium">
                      <span style={{ color: entry.color }}>
                        {entry.name === 'value' ? 'Ganancia de Ventas' : entry.name}
                      </span>
                      <span className="text-white">
                        {formatCurrency(entry.value as number)}
                      </span>
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          }} 
        />
        <Area type="monotone" dataKey="value" name="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorIncome)" />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
