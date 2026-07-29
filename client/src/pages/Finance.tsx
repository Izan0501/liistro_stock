import { useState } from 'react';
import { DollarSign, ArrowUpRight, ArrowDownRight, Loader2 } from 'lucide-react';
import { useDashboardMetrics } from '../hooks/useData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { cn } from '../lib/utils';

export default function Finance() {
  const [operation, setOperation] = useState<'add' | 'subtract'>('add');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  
  const { data: metrics, isLoading } = useDashboardMetrics();
  const queryClient = useQueryClient();

  const adjustCapitalMutation = useMutation({
    mutationFn: async (payload: any) => {
      // User requested /finance/capital/adjust
      const { data } = await api.post('/finance/capital/adjust', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['capital'] });
      setAmount('');
      setReason('');
    }
  });

  const handleAdjustCapital = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !reason) return;
    
    adjustCapitalMutation.mutate({
      operation,
      amount: Number(amount),
      reason
    });
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  const netCapital = Number(metrics?.net_capital || metrics?.totalCapital || 0);
  const initialCapital = Number(metrics?.initial_capital || 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300 p-4 md:p-8 pb-24 md:pb-8">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Capital Management</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Manage and track your business capital flow.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Current Capital Card */}
        <div className="glass-card p-6 flex flex-col justify-center relative overflow-hidden">
          <div className="absolute -right-10 -top-10 w-40 h-40 bg-emerald-600 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
          
          <div className="flex items-center gap-3 mb-4 text-slate-500 dark:text-slate-400">
            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span className="font-medium">Net Capital</span>
          </div>
          
          <div className="text-5xl font-bold tracking-tight text-slate-950 dark:text-white mb-2">
            {formatCurrency(netCapital)}
          </div>
          <div className="text-sm font-medium text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <ArrowUpRight className="w-4 h-4" />
            Live Balance
          </div>
          
          <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 flex justify-between text-sm">
            <span className="text-slate-500 dark:text-slate-400">Initial Investment</span>
            <span className="font-medium text-slate-950 dark:text-white">{formatCurrency(initialCapital)}</span>
          </div>
        </div>

        {/* Adjust Capital Form */}
        <div className="glass-card p-6">
          <h2 className="text-lg font-bold mb-4">Manual Adjustment</h2>
          <form onSubmit={handleAdjustCapital} className="space-y-4">
            <div className="flex gap-2 p-1 bg-black/20 rounded-lg border border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setOperation('add')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                  operation === 'add' ? "bg-emerald-600 dark:bg-emerald-500 text-slate-950 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:text-white"
                )}
              >
                <ArrowUpRight className="w-4 h-4" /> Add Funds
              </button>
              <button
                type="button"
                onClick={() => setOperation('subtract')}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium rounded-md transition-all",
                  operation === 'subtract' ? "bg-red-600 dark:bg-red-500 text-slate-950 dark:text-white shadow-sm" : "text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:text-white"
                )}
              >
                <ArrowDownRight className="w-4 h-4" /> Withdraw
              </button>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-1.5">Amount (USD)</label>
              <div className="relative">
                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
                <input 
                  type="number" 
                  step="0.01"
                  min="0.01"
                  required
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg pl-9 pr-4 py-2.5 focus:outline-none focus:border-accent-indigo text-slate-950 dark:text-white" 
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-500 dark:text-slate-400 block mb-1.5">Reason / Concept</label>
              <input 
                type="text" 
                required
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-slate-950 dark:text-white" 
                placeholder="e.g. Owner injection, Expense payment"
              />
            </div>
            
            <button 
              type="submit"
              disabled={adjustCapitalMutation.isPending}
              className={cn(
                "w-full flex items-center justify-center gap-2 py-3 rounded-lg font-bold text-slate-950 dark:text-white transition-all shadow-lg disabled:opacity-50 mt-2",
                operation === 'add' ? "bg-emerald-600 dark:bg-emerald-500 hover:brightness-110 shadow-[0_0_15px_rgba(16,185,129,0.3)]" : "bg-red-600 dark:bg-red-500 hover:brightness-110 shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              )}
            >
              {adjustCapitalMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {operation === 'add' ? 'Inject Capital' : 'Withdraw Funds'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
