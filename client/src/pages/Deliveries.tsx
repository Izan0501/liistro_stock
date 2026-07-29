import { useState } from 'react';
import { Search, FileText, Loader2, ArrowUpDown } from 'lucide-react';
import { useSales } from '../hooks/useData';
import ReceiptModal from '../components/ui/ReceiptModal';
import { DatePickerWithRange, type DateRange } from '../components/ui/DatePicker';
import { format } from 'date-fns';

export default function Deliveries() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedSale, setSelectedSale] = useState<any>(null);

  const apiDateRange = dateRange?.from ? {
    start: format(dateRange.from, 'yyyy-MM-dd'),
    end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')
  } : undefined;

  const { data: salesData, isLoading } = useSales(apiDateRange);

  const sales = Array.isArray(salesData) ? salesData : (salesData?.items || []);
  const filtered = sales.filter((s: any) => {
    const clientName = s.client?.name || s.client_name || 'Desconocido';
    return clientName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);
    
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 p-4 md:p-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Historial de entregas</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review past sales and deliveries.</p>
        </div>
      </div>

      {/* Filters/Search */}
      <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
          <input 
            type="text" 
            placeholder="Search by client name..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent-indigo transition-colors text-slate-950 dark:text-white"
          />
        </div>
        
        <div className="flex items-center gap-2 flex-wrap">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          {dateRange?.from && (
            <button 
              onClick={() => setDateRange(undefined)}
              className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:text-white px-2 py-1 rounded bg-slate-100 dark:bg-white/5"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="px-6 py-3 font-medium cursor-pointer hover:text-slate-950 dark:text-slate-950 dark:text-white">
                <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 font-medium">Client</th>
              <th className="px-6 py-3 font-medium text-right">Items</th>
              <th className="px-6 py-3 font-medium text-right">Total</th>
              <th className="px-6 py-3 font-medium text-center">Receipt</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400 mx-auto" />
                </td>
              </tr>
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-slate-500 dark:text-slate-400">
                  No deliveries found for this range.
                </td>
              </tr>
            ) : filtered.map((sale: any) => {
              const totalItems = sale.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
              return (
                <tr key={sale.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group bg-white dark:bg-transparent text-slate-950 dark:text-white">
                  <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDate(sale.created_at || new Date().toISOString())}</td>
                  <td className="px-6 py-4 font-medium">{sale.client?.name || sale.client_name || 'Desconocido'}</td>
                  <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{totalItems}</td>
                  <td className="px-6 py-4 text-right font-medium text-emerald-600 dark:text-emerald-400">{formatCurrency(sale.total_amount || 0)}</td>
                  <td className="px-6 py-4 text-center">
                    <button 
                      onClick={() => setSelectedSale(sale)}
                      className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:text-indigo-400 rounded bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
                      title="Ver Recibo"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {isLoading ? (
          <div className="glass-card p-12 flex justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="glass-card p-6 text-center text-slate-500 dark:text-slate-400">
            No deliveries found for this range.
          </div>
        ) : filtered.map((sale: any) => {
          const totalItems = sale.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
          return (
            <div key={sale.id} className="glass-card p-4 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-bold">{sale.client?.name || sale.client_name || 'Desconocido'}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(sale.created_at || new Date().toISOString())}</div>
                </div>
                <div className="text-emerald-600 dark:text-emerald-400 font-bold">{formatCurrency(sale.total_amount || 0)}</div>
              </div>
              <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
                <div className="text-xs text-slate-500 dark:text-slate-400">{totalItems} Items</div>
                <button 
                  onClick={() => setSelectedSale(sale)}
                  className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-400"
                >
                  <FileText className="w-3.5 h-3.5" /> View Receipt
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <ReceiptModal sale={selectedSale} onClose={() => setSelectedSale(null)} />
    </div>
  );
}
