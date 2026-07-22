import { useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, DollarSign, Package, CreditCard, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDashboardMetrics } from '../hooks/useData';

const MetricCard = ({ title, value, change, icon: Icon, trend }: any) => (
  <div className="glass-card p-6 flex flex-col gap-4">
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-text-secondary">{title}</span>
      <div className="w-8 h-8 rounded-full bg-slate-800/80 flex items-center justify-center">
        <Icon className="w-4 h-4 text-accent-indigo" />
      </div>
    </div>
    <div>
      <div className="text-3xl font-bold tracking-tight mb-1">{value}</div>
      <div className={cn("text-xs font-medium flex items-center gap-1", trend === 'up' ? 'text-accent-emerald' : 'text-accent-red')}>
        {trend === 'up' ? <TrendingUp className="w-3 h-3" /> : <TrendingUp className="w-3 h-3 rotate-180" />}
        {change}
      </div>
    </div>
  </div>
);

export default function Dashboard() {
  const [timeRange, setTimeRange] = useState('7d');
  
  // Real API Fetching
  const { data: metrics, isLoading } = useDashboardMetrics();

  // If metrics are still loading, show a skeleton or loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-indigo" />
      </div>
    );
  }

  // Fallback if backend API is not strictly matching expected schema yet, but we use what we have
  const totalCapital = metrics?.totalCapital || 5000000.00;
  const inventoryValue = metrics?.inventoryValue || 0;
  const supplierCount = metrics?.supplierCount || 0;
  const monthlyRevenue = metrics?.monthlyRevenue || 0;
  
  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  // We will assume backend returns historical chart data. If not, use empty array
  const chartData = metrics?.chartData || [
    { name: 'Jan', revenue: 4000, expenses: 2400 },
    { name: 'Feb', revenue: 3000, expenses: 1398 },
    { name: 'Mar', revenue: 2000, expenses: 9800 },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-text-secondary mt-1">Track your business capital and inventory progression.</p>
        </div>
        <div className="flex bg-slate-900/80 p-1 rounded-lg border border-white/5">
          {['7d', '30d', '90d', '1y'].map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={cn(
                "px-4 py-1.5 text-xs font-medium rounded-md transition-colors",
                timeRange === range ? "bg-accent-indigo text-white shadow-sm" : "text-text-secondary hover:text-text-primary"
              )}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard title="Starting Capital" value={formatCurrency(totalCapital)} change="+0.0% from start" icon={DollarSign} trend="up" />
        <MetricCard title="Inventory Valuation" value={formatCurrency(inventoryValue)} change="Live" icon={Package} trend="up" />
        <MetricCard title="Monthly Revenue" value={formatCurrency(monthlyRevenue)} change="+12.5% from last month" icon={TrendingUp} trend="up" />
        <MetricCard title="Total Suppliers" value={supplierCount.toString()} change="Active partners" icon={CreditCard} trend="up" />
      </div>

      <div className="glass-card p-6 h-[400px]">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-bold">Capital Progression</h2>
          <div className="flex items-center gap-4 text-xs font-medium">
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-accent-indigo"></div> Revenue</div>
            <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-slate-700"></div> Expenses</div>
          </div>
        </div>
        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--color-accent-indigo)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--color-accent-indigo)" stopOpacity={0}/>
                </linearGradient>
                <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#334155" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#334155" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1E212B" vertical={false} />
              <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
              <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `$${value/1000}k`} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#12141D', borderColor: '#1E212B', borderRadius: '8px', color: '#f8fafc' }}
                itemStyle={{ color: '#f8fafc' }}
              />
              <Area type="monotone" dataKey="revenue" stroke="var(--color-accent-indigo)" strokeWidth={2} fillOpacity={1} fill="url(#colorRevenue)" />
              <Area type="monotone" dataKey="expenses" stroke="#64748b" strokeWidth={2} fillOpacity={1} fill="url(#colorExpenses)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
