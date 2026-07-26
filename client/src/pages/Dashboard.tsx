import { useState } from 'react';
import { ArrowDownLeft, ArrowUpRight, DollarSign, Package, Users, Truck, Loader2, TrendingUp, ShoppingBag, X, Receipt, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDashboardMetrics, useRecentActivity } from '../hooks/useData';
import { DatePickerWithRange, type DateRange, useMediaQuery } from '../components/ui/DatePicker';
import { format } from 'date-fns';
import { Drawer } from 'vaul';
import { useQuery } from '@tanstack/react-query';
import { api } from '../services/api';

// ─── Metric Card ──────────────────────────────────────────────────────────────
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

// ─── Receipt Detail Fetcher ───────────────────────────────────────────────────
// Fetches full itemized detail from /sales/{id} or /purchases/{id}
function useTransactionDetail(activity: any) {
  const isSale = activity?.entity_type === 'sale';
  const id = activity?.id;

  return useQuery({
    queryKey: ['transactionDetail', id],
    queryFn: async () => {
      const endpoint = isSale ? `/sales/${id}` : `/purchases/${id}`;
      const { data } = await api.get(endpoint);
      return data;
    },
    enabled: !!id,
    staleTime: 60_000,
  });
}

// ─── helpers ─────────────────────────────────────────────────────────────────
const formatCurrency = (val: number | string) =>
  new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(Number(val));

const formatDate = (dateString: string) =>
  new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

const formatReceiptId = (id: string) =>
  `REC-${id?.replace(/-/g, '').slice(0, 6).toUpperCase()}`;

// ─── Receipt Content (shared between Dialog and Drawer) ───────────────────────
const ReceiptContent = ({ activity, onClose }: { activity: any; onClose: () => void }) => {
  const isSale = activity?.entity_type === 'sale';
  const { data: detail, isLoading, isError } = useTransactionDetail(activity);

  // Parse description for display: "Venta - Juan Pérez" → label + name
  const descriptionParts = (activity?.description ?? '').split(' - ');
  const typeLabel = descriptionParts[0] ?? (isSale ? 'Venta' : 'Compra');
  const entityName = descriptionParts.slice(1).join(' - ') || (isSale ? 'Consumidor Final' : 'Sin Proveedor');

  const items: any[] = detail?.items ?? [];
  const notes = detail?.notes ?? null;
  const totalAmount = activity?.amount ?? detail?.total_amount ?? 0;
  const date = detail?.sale_date ?? detail?.purchase_date ?? activity?.date ?? new Date().toISOString();

  return (
    <div className="bg-slate-950 rounded-2xl w-full">
      {/* ── Header ── */}
      <div className="flex items-start justify-between p-6 pb-5">
        <div className="flex items-center gap-4">
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 border",
            isSale
              ? "bg-emerald-500/10 border-emerald-500/20"
              : "bg-indigo-500/10 border-indigo-500/20"
          )}>
            {isSale
              ? <ShoppingBag className="w-7 h-7 text-emerald-400" />
              : <ArrowDownLeft className="w-7 h-7 text-indigo-400" />
            }
          </div>
          <div>
            {/* Type badge */}
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full mb-1.5 inline-block",
              isSale ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
            )}>
              {typeLabel}
            </span>
            <div className="text-xl font-bold text-white leading-tight">{entityName}</div>
            <div className="text-xs text-slate-500 mt-1">{formatDate(date)}</div>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 rounded-xl text-slate-500 hover:text-white hover:bg-slate-800 transition-colors shrink-0 mt-1"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Transaction ID */}
      <div className="mx-6 mb-4 flex items-center justify-between bg-slate-900/60 border border-slate-800/50 rounded-xl px-4 py-2.5">
        <span className="text-xs text-slate-500">ID de Transacción</span>
        <span className="text-xs font-mono font-semibold text-slate-300">{formatReceiptId(activity?.id)}</span>
      </div>

      {/* ── Entity row ── */}
      <div className="mx-6 mb-4 flex justify-between items-center">
        <span className="text-sm text-slate-400">{isSale ? 'Cliente' : 'Proveedor'}</span>
        <span className="text-sm font-semibold text-white">{entityName}</span>
      </div>

      {/* Dashed divider */}
      <div className="border-b border-dashed border-slate-700 mx-6 mb-4" />

      {/* ── Items section ── */}
      <div className="px-6 pb-2">
        <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-3">
          Productos
        </div>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-slate-500" />
          </div>
        ) : isError ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 py-4">
            <AlertCircle className="w-4 h-4" />
            No se pudo cargar el detalle de productos.
          </div>
        ) : items.length === 0 ? (
          <div className="text-xs text-slate-500 py-4 text-center">Sin ítems registrados.</div>
        ) : (
          <>
            {/* Column headers */}
            <div className="grid grid-cols-[1fr_auto_auto_auto] gap-2 text-[10px] font-semibold uppercase tracking-wider text-slate-600 px-1 mb-2">
              <span>Producto</span>
              <span className="text-right">Cant.</span>
              <span className="text-right">P. Unit.</span>
              <span className="text-right">Subtotal</span>
            </div>

            {/* Item rows */}
            <div className="space-y-1.5">
              {items.map((item: any, i: number) => {
                const subtotal = item.subtotal ?? (Number(item.unit_price) * item.quantity);
                return (
                  <div
                    key={item.id ?? i}
                    className="grid grid-cols-[1fr_auto_auto_auto] gap-2 items-center bg-slate-900/50 border border-slate-800/40 rounded-xl px-3 py-2.5"
                  >
                    <span className="text-sm font-medium text-white truncate pr-2">
                      {item.product_name ?? 'Producto'}
                    </span>
                    <span className="text-sm font-mono text-slate-400 text-right">×{item.quantity}</span>
                    <span className="text-sm font-mono text-slate-400 text-right">
                      {formatCurrency(item.unit_price)}
                    </span>
                    <span className="text-sm font-mono font-semibold text-slate-200 text-right">
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Dashed divider before total */}
      <div className="border-b border-dashed border-slate-700 mx-6 mt-4 mb-4" />

      {/* ── Notes / Reason (restock) ── */}
      {notes && (
        <div className="mx-6 mb-4 border-l-2 border-slate-700 pl-3">
          <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">
            {isSale ? 'Notas' : 'Razón / Motivo'}
          </div>
          <p className="text-sm text-slate-400 italic">"{notes}"</p>
        </div>
      )}

      {/* ── Total ── */}
      <div className="px-6 pb-6">
        <div className="flex justify-between items-center">
          <span className="text-base font-semibold text-slate-400">Total</span>
          <span className={cn(
            "text-2xl font-bold font-mono",
            isSale ? "text-emerald-400" : "text-slate-200"
          )}>
            {isSale ? '+' : ''}{formatCurrency(totalAmount)}
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Activity Row ─────────────────────────────────────────────────────────────
const ActivityRow = ({ activity, onClick }: { activity: any; onClick: () => void }) => {
  const isSale = activity.entity_type === 'sale';

  // "Venta - Juan Pérez" → "Juan Pérez"; "Compra/Restock - Sin Proveedor" → "Sin Proveedor"
  const descParts = (activity.description ?? '').split(' - ');
  const typeLabel = descParts[0] ?? '';
  const entityName = descParts.slice(1).join(' - ') || (isSale ? 'Consumidor Final' : 'Sin Proveedor');

  return (
    <div
      onClick={onClick}
      className="group flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-900/40 border border-slate-800/50 hover:bg-slate-800/60 hover:border-slate-700 cursor-pointer transition-all duration-200 gap-3 sm:gap-0"
    >
      {/* Left: icon + details */}
      <div className="flex items-center gap-3">
        <div className={cn(
          "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
          isSale ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
        )}>
          {isSale ? <ArrowUpRight className="w-5 h-5" /> : <ArrowDownLeft className="w-5 h-5" />}
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white truncate">{entityName}</span>
            <span className={cn(
              "text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0",
              isSale ? "bg-emerald-500/10 text-emerald-400" : "bg-indigo-500/10 text-indigo-400"
            )}>
              {typeLabel}
            </span>
          </div>
          <span className="text-xs text-slate-500 mt-0.5">
            {formatDate(activity.date ?? new Date().toISOString())}
          </span>
        </div>
      </div>

      {/* Right: amount + receipt hint */}
      <div className="flex items-center gap-3 pl-[52px] sm:pl-0">
        <span className={cn(
          "font-mono font-semibold text-sm",
          isSale ? "text-emerald-400" : "text-slate-300"
        )}>
          {isSale ? '+' : ''}{formatCurrency(activity.amount ?? 0)}
        </span>
        <Receipt className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors shrink-0" />
      </div>
    </div>
  );
};

// ─── Main Dashboard ───────────────────────────────────────────────────────────
export default function Dashboard() {
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedActivity, setSelectedActivity] = useState<any>(null);

  const isDesktop = useMediaQuery("(min-width: 768px)");

  const apiDateRange = dateRange?.from ? {
    start: format(dateRange.from, 'yyyy-MM-dd'),
    end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd'),
  } : undefined;

  const { data: metrics, isLoading } = useDashboardMetrics(apiDateRange);
  const { data: recentActivityData, isLoading: activityLoading } = useRecentActivity();

  const totalRevenue = metrics?.sales_revenue ?? 0;
  const clientCount = metrics?.total_clients ?? 0;
  const productsCount = metrics?.total_products_stored ?? 0;
  const salesCount = metrics?.total_deliveries ?? 0;

  const recentActivity = Array.isArray(recentActivityData) ? recentActivityData : [];

  const handleClose = () => setSelectedActivity(null);

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300 p-4 md:p-8 pb-24 md:pb-8">
      {/* ── Page Header ── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview</h1>
          <p className="text-sm text-text-secondary mt-1">Track your business capital and inventory progression.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePickerWithRange date={dateRange} setDate={setDateRange} />
          {dateRange?.from && (
            <button
              onClick={() => setDateRange(undefined)}
              className="text-xs text-text-secondary hover:text-white px-3 py-2 rounded-lg bg-white/5 border border-white/10"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="w-8 h-8 animate-spin text-accent-indigo" />
        </div>
      ) : (
        <>
          {/* ── Metric Cards ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <MetricCard title="Ganancia de Ventas" value={formatCurrency(totalRevenue)} change="Revenue" icon={DollarSign} trend="up" />
            <MetricCard title="Clientes" value={clientCount.toString()} change="Total Clients" icon={Users} trend="up" />
            <MetricCard title="Productos Almacenados" value={productsCount.toString()} change="In Stock" icon={Package} trend="up" />
            <MetricCard title="Entregas" value={salesCount.toString()} change="Total Deliveries" icon={Truck} trend="up" />
          </div>

          {/* ── Transaction Feed ── */}
          <div className="glass-card overflow-hidden">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">Actividad Reciente</h2>
                <p className="text-xs text-slate-500 mt-0.5">Haz clic en una fila para ver el recibo detallado</p>
              </div>
              {recentActivity.length > 0 && (
                <span className="text-xs font-semibold text-slate-500 bg-slate-800/60 px-2.5 py-1 rounded-full">
                  {recentActivity.length} transacciones
                </span>
              )}
            </div>

            <div className="p-4 flex flex-col space-y-2">
              {activityLoading ? (
                <div className="py-12 flex justify-center">
                  <div className="w-6 h-6 border-2 border-accent-indigo border-t-transparent rounded-full animate-spin" />
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="py-12 text-center text-slate-500 text-sm">
                  No hay actividad reciente.
                </div>
              ) : recentActivity.map((act: any, idx: number) => (
                <ActivityRow
                  key={act.id ?? idx}
                  activity={act}
                  onClick={() => setSelectedActivity(act)}
                />
              ))}
            </div>
          </div>
        </>
      )}

      {/* ── Receipt: Desktop Dialog ── */}
      {isDesktop && selectedActivity && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
          onClick={handleClose}
        >
          <div
            className="w-full max-w-md animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto rounded-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <ReceiptContent activity={selectedActivity} onClose={handleClose} />
          </div>
        </div>
      )}

      {/* ── Receipt: Mobile Drawer ── */}
      {!isDesktop && (
        <Drawer.Root open={!!selectedActivity} onOpenChange={(open) => !open && handleClose()}>
          <Drawer.Portal>
            <Drawer.Overlay className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" />
            <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 outline-none max-h-[92vh] flex flex-col">
              <div className="bg-slate-950 rounded-t-3xl border-t border-slate-800 flex flex-col overflow-hidden">
                {/* Drag handle */}
                <div className="flex justify-center pt-4 pb-2 shrink-0">
                  <div className="w-10 h-1 rounded-full bg-slate-700" />
                </div>
                <div className="overflow-y-auto">
                  <ReceiptContent activity={selectedActivity} onClose={handleClose} />
                  <div className="h-8" />
                </div>
              </div>
            </Drawer.Content>
          </Drawer.Portal>
        </Drawer.Root>
      )}
    </div>
  );
}
