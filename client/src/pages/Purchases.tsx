import { useState, useMemo } from 'react';
import { Search, FileText, Loader2, ArrowUpDown, Plus, Building2, Mail, Phone, Box, Check, TrendingDown } from 'lucide-react';
import { Confetti } from '../components/ui/confetti';
import { cn } from '../lib/utils';
import { HoverButton } from '../components/ui/HoverButton';
import { AppInput } from '../components/ui/AppInput';
import { GlowContainer } from '../components/ui/GlowContainer';
import { usePurchases, useSuppliers } from '../hooks/useData';
import PurchaseReceiptModal from '../components/ui/PurchaseReceiptModal';
import EditSupplierModal from '../components/ui/EditSupplierModal';
import { DatePickerWithRange, type DateRange } from '../components/ui/DatePicker';
import { format } from 'date-fns';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

const currencyFormatter = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
const formatCurrency = (val: number) => currencyFormatter.format(val);
const arsFormatter = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS' });
const formatARS = (val: number) => arsFormatter.format(val);
    
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit'
  });
};

function usePurchasesLogic() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [showSupplierSuccess, setShowSupplierSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [selectedEditSupplier, setSelectedEditSupplier] = useState<any>(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_email: '', contact_phone: '' });
  const [activeTab, setActiveTab] = useState<'history' | 'directory' | 'gasto-total'>('history');

  const queryClient = useQueryClient();

  const apiDateRange = dateRange?.from ? {
    start: format(dateRange.from, 'yyyy-MM-dd'),
    end: dateRange.to ? format(dateRange.to, 'yyyy-MM-dd') : format(dateRange.from, 'yyyy-MM-dd')
  } : undefined;

  const { data: purchasesData, isLoading } = usePurchases(apiDateRange);
  const { data: suppliersData, isLoading: isLoadingSuppliers } = useSuppliers();

  const createSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/suppliers', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      setIsNewSupplierModalOpen(false);
      setShowSupplierSuccess(true);
      setNewSupplier({ name: '', contact_email: '', contact_phone: '' });
    }
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    createSupplierMutation.mutate({
      name: newSupplier.name,
      email: newSupplier.contact_email,
      phone: newSupplier.contact_phone,
      contact_email: newSupplier.contact_email,
      contact_phone: newSupplier.contact_phone
    });
  };

  const purchases = useMemo(
    () => Array.isArray(purchasesData) ? purchasesData : (purchasesData?.items || purchasesData?.data || []),
    [purchasesData]
  );
  const suppliersList = useMemo(
    () => Array.isArray(suppliersData) ? suppliersData : (suppliersData?.items || suppliersData?.data || []),
    [suppliersData]
  );

  const filtered = purchases.filter((p: any) => {
    const supplierName = p.supplier?.name || p.supplier_name || 'Desconocido';
    return supplierName.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const { globalTotal, supplierTotals } = useMemo(() => {
    if (!purchases.length) return { globalTotal: 0, supplierTotals: [] as { name: string; totalSpent: number }[] };
    let total = 0;
    const supplierMap = new Map<string, number>();
    purchases.forEach((purchase: any) => {
      const amount = Number(purchase.total_amount || purchase.total_cost || 0);
      const name = purchase.supplier?.name || purchase.supplier_name || 'Proveedor Desconocido';
      total += amount;
      supplierMap.set(name, (supplierMap.get(name) ?? 0) + amount);
    });
    const supplierTotals = Array.from(supplierMap, ([name, totalSpent]) => ({ name, totalSpent }))
      .sort((a, b) => b.totalSpent - a.totalSpent);
    return { globalTotal: total, supplierTotals };
  }, [purchases]);

  return {
    searchTerm, setSearchTerm, dateRange, setDateRange, selectedPurchase, setSelectedPurchase,
    isNewSupplierModalOpen, setIsNewSupplierModalOpen, showSupplierSuccess, setShowSupplierSuccess,
    showEditSuccess, setShowEditSuccess, showDeleteSuccess, setShowDeleteSuccess,
    selectedEditSupplier, setSelectedEditSupplier, newSupplier, setNewSupplier,
    activeTab, setActiveTab, isLoading, isLoadingSuppliers, createSupplierMutation,
    handleCreateSupplier, purchases, suppliersList, filtered, globalTotal, supplierTotals
  };
}

export default function Purchases() {
  const {
    searchTerm, setSearchTerm, dateRange, setDateRange, selectedPurchase, setSelectedPurchase,
    isNewSupplierModalOpen, setIsNewSupplierModalOpen, showSupplierSuccess, setShowSupplierSuccess,
    showEditSuccess, setShowEditSuccess, showDeleteSuccess, setShowDeleteSuccess,
    selectedEditSupplier, setSelectedEditSupplier, newSupplier, setNewSupplier,
    activeTab, setActiveTab, isLoading, isLoadingSuppliers, createSupplierMutation,
    handleCreateSupplier, suppliersList, filtered, globalTotal, supplierTotals
  } = usePurchasesLogic();

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in transition-opacity duration-300 p-4 md:p-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Compras a proveedores</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Revisar restock y nuevas compras.</p>
        </div>
        <HoverButton
          onClick={() => setIsNewSupplierModalOpen(true)}
          className="w-full sm:w-auto text-sm font-semibold"
          glowColor="#6366f1"
          backgroundColor="#0f172a"
        >
          <Plus className="w-4 h-4" />
          Nuevo Proveedor
        </HoverButton>
      </div>

      {/* Tabs System */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 space-x-8">
        <button type="button" 
          onClick={() => setActiveTab('history')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-accent-indigo text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-950 dark:text-white hover:border-slate-300 dark:border-white/20'
          }`}
        >
          Historial de Restocks
        </button>
        <button type="button" 
          onClick={() => setActiveTab('directory')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'directory' 
              ? 'border-accent-indigo text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-950 dark:text-white hover:border-slate-300 dark:border-white/20'
          }`}
        >
          Directorio de Proveedores
        </button>
        <button type="button" 
          onClick={() => setActiveTab('gasto-total')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'gasto-total' 
              ? 'border-accent-indigo text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-950 dark:text-white hover:border-slate-300 dark:border-white/20'
          }`}
        >
          Gasto total
        </button>
      </div>

      {activeTab === 'history' ? (
        <>
          {/* Filters/Search */}
          <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <label htmlFor="search-supplier" className="sr-only">Buscar por nombre</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input 
                id="search-supplier"
                type="text" 
                placeholder="Buscar por nombre..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent-indigo transition-colors text-slate-950 dark:text-white"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              {dateRange?.from && (
                <button type="button" 
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
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 font-medium text-right">Items</th>
                  <th className="px-6 py-3 font-medium text-right">Total Cost</th>
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
                      No purchases found for this range.
                    </td>
                  </tr>
                ) : filtered?.map((purchase: any) => {
                  const totalItems = purchase.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
                  return (
                    <tr key={purchase.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group bg-white dark:bg-transparent text-slate-950 dark:text-white">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDate(purchase.purchase_date || purchase.created_at || new Date().toISOString())}</td>
                      <td className="px-6 py-4 font-medium">{purchase.supplier?.name || purchase.supplier_name || 'Desconocido'}</td>
                      <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{totalItems}</td>
                      <td className="px-6 py-4 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(purchase.total_amount || purchase.total_cost || 0)}</td>
                      <td className="px-6 py-4 text-center">
                        <button type="button" 
                          onClick={() => setSelectedPurchase(purchase)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:text-indigo-400 rounded bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-colors transition-opacity"
                          title="Ver Detalle"
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
                No purchases found for this range.
              </div>
            ) : filtered?.map((purchase: any) => {
              const totalItems = purchase.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
              return (
                <div key={purchase.id} className="glass-card p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{purchase.supplier?.name || purchase.supplier_name || 'Desconocido'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{formatDate(purchase.purchase_date || purchase.created_at || new Date().toISOString())}</div>
                    </div>
                    <div className="text-red-600 dark:text-red-400 font-bold">{formatCurrency(purchase.total_amount || purchase.total_cost || 0)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-slate-200 dark:border-slate-800 pt-3">
                    <div className="text-xs text-slate-500 dark:text-slate-400">{totalItems} Items</div>
                    <button type="button" 
                      onClick={() => setSelectedPurchase(purchase)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-400"
                    >
                      <FileText className="w-3.5 h-3.5" /> Ver Recibo
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : activeTab === 'directory' ? (
        <>
          {/* Supplier Directory Tab */}
          {isLoadingSuppliers ? (
            <div className="glass-card p-12 flex justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
            </div>
          ) : suppliersList.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/20 rounded-2xl">
              <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                <Box className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white mb-2">No Suppliers Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mb-6">You haven't added any suppliers yet. Create your first supplier to start tracking purchases and restocks.</p>
              <button type="button" 
                onClick={() => setIsNewSupplierModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-950 dark:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <SuppliersGrid suppliersList={suppliersList} setSelectedEditSupplier={setSelectedEditSupplier} />
            </div>
          )}
        </>
      ) : (
        <GastoTotalTab
          globalTotal={globalTotal}
          supplierTotals={supplierTotals}
          isLoading={isLoading}
          Loader2={Loader2}
          TrendingDown={TrendingDown}
        />
      )}

      <PurchaseReceiptModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />

      <NewSupplierModal
        isOpen={isNewSupplierModalOpen}
        onClose={() => setIsNewSupplierModalOpen(false)}
        newSupplier={newSupplier}
        setNewSupplier={setNewSupplier}
        handleCreateSupplier={handleCreateSupplier}
        isPending={createSupplierMutation.isPending}
        AppInput={AppInput}
        HoverButton={HoverButton}
        Loader2={Loader2}
      />
      {/* Edit Supplier Modal */}
      {selectedEditSupplier && (
        <EditSupplierModal
          supplier={selectedEditSupplier}
          onClose={() => setSelectedEditSupplier(null)}
          onSuccess={(action) => {
            setSelectedEditSupplier(null);
            if (action === 'delete') {
              setShowDeleteSuccess(true);
            } else {
              setShowEditSuccess(true);
            }
          }}
        />
      )}

      <SupplierSuccessModal
        showSupplierSuccess={showSupplierSuccess}
        showEditSuccess={showEditSuccess}
        showDeleteSuccess={showDeleteSuccess}
        setShowSupplierSuccess={setShowSupplierSuccess}
        setShowEditSuccess={setShowEditSuccess}
        setShowDeleteSuccess={setShowDeleteSuccess}
        Confetti={Confetti}
        Check={Check}
        cn={cn}
      />
    </div>
  );
}

function NewSupplierModal({ isOpen, onClose, newSupplier, setNewSupplier, handleCreateSupplier, isPending, AppInput, HoverButton, Loader2 }: any) {
  if (!isOpen) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 transition-colors">
            <GlowContainer className="p-6">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white mb-6">New Supplier</h2>
              <form onSubmit={handleCreateSupplier} className="space-y-4">
              <AppInput
                label="Nombre del Proveedor"
                type="text"
                required
                value={newSupplier.name}
                onChange={(e: any) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="Ej. Distribuidora Norte S.A."
                accentColor="indigo"
              />
              <AppInput
                label="Email de Contacto (Opcional)"
                type="email"
                value={newSupplier.contact_email}
                onChange={(e: any) => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
                placeholder="proveedor@empresa.com"
                accentColor="indigo"
              />
              <AppInput
                label="Teléfono de Contacto (Opcional)"
                type="tel"
                value={newSupplier.contact_phone}
                onChange={(e: any) => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
                placeholder="+54 11 0000-0000"
                accentColor="indigo"
              />
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={onClose}
                  className="flex-1 h-10 rounded-xl font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <HoverButton
                  type="submit"
                  disabled={isPending}
                  className="flex-1"
                  glowColor="#6366f1"
                  backgroundColor="#0f172a"
                >
                  {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Supplier
                </HoverButton>
              </div>
            </form>
            </GlowContainer>
          </div>
        </div>
  );
}

function SupplierSuccessModal({ showSupplierSuccess, showEditSuccess, showDeleteSuccess, setShowSupplierSuccess, setShowEditSuccess, setShowDeleteSuccess, Confetti, Check, cn }: any) {
  if (!(showSupplierSuccess || showEditSuccess || showDeleteSuccess)) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <Confetti
            manualstart={false}
            className="fixed inset-0 w-screen h-screen pointer-events-none z-[9999]"
            options={{
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#6366f1', '#f8fafc', '#334155']
            }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"></div>
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl transform transition-colors transition-transform transition-shadow z-50 animate-in zoom-in-95 duration-300 flex flex-col items-center">
            <div className={cn("mx-auto flex h-20 w-20 items-center justify-center rounded-full mb-6 ring-8", showDeleteSuccess ? "bg-red-50 dark:bg-red-500/10 ring-red-50/50 dark:ring-red-500/5" : "bg-emerald-50 dark:bg-emerald-500/10 ring-emerald-50/50 dark:ring-emerald-500/5")}>
              <Check className={cn("h-10 w-10", showDeleteSuccess ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400")} strokeWidth={2.5} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white mb-2 tracking-tight">
              {showSupplierSuccess ? 'Proveedor Creado' : showEditSuccess ? 'Proveedor Actualizado' : 'Proveedor Eliminado'}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
              {showSupplierSuccess 
                ? 'El proveedor se agregó al directorio correctamente.'
                : showEditSuccess
                  ? 'El proveedor se actualizó correctamente.'
                  : 'El proveedor ha sido eliminado del directorio.'}
            </p>
            
            <button type="button" 
              onClick={() => {
                setShowSupplierSuccess(false);
                setShowEditSuccess(false);
                setShowDeleteSuccess(false);
              }}
              className="w-full px-4 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold transition-colors shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
  );
}

function SuppliersGrid({ suppliersList, setSelectedEditSupplier }: any) {
  return (
    <>
      {suppliersList?.map((supplier: any) => (
        <button 
          type="button"
          key={supplier.id} 
          onClick={() => setSelectedEditSupplier(supplier)}
          className="text-left block w-full bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:border-indigo-200 dark:hover:border-slate-700 transition-colors flex flex-col gap-4 cursor-pointer group"
        >
          <div className="flex items-center gap-4">
            <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
              <Building2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-semibold text-slate-950 dark:text-white">{supplier.name}</h3>
          </div>
            <div className="flex flex-col gap-2 mt-2 pt-4 border-t border-slate-800/50">
              <div className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-sm text-slate-400 truncate">
                  {supplier.email || supplier.contact_email || 'No email provided'}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                <span className="text-sm text-slate-400">
                  {supplier.phone || supplier.contact_phone || 'No phone provided'}
                </span>
              </div>
            </div>
        </button>
      ))}
    </>
  );
}

function GastoTotalTab({ globalTotal, supplierTotals, isLoading, Loader2, TrendingDown }: any) {
  if (isLoading) {
    return (
      <div className="glass-card p-12 flex justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6 transition-opacity duration-200 opacity-100">

      {/* Hero — Global Total */}
      <div className="relative overflow-hidden rounded-2xl border border-rose-200/60 dark:border-rose-500/20 bg-gradient-to-br from-rose-50 to-white dark:from-rose-950/30 dark:to-slate-950 p-6 md:p-8 shadow-sm">
        {/* Decorative glow */}
        <div className="pointer-events-none absolute -top-10 -right-10 w-48 h-48 rounded-full bg-rose-400/10 dark:bg-rose-500/10 blur-3xl" />
        <div className="relative flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-rose-600/80 dark:text-rose-400/80 uppercase tracking-widest mb-1">Gasto total en compras</p>
            <p className="text-4xl md:text-5xl font-black tracking-tight text-slate-950 dark:text-white">
              {formatARS(globalTotal)}
            </p>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
              Suma acumulada de {supplierTotals.length} proveedor{supplierTotals.length !== 1 ? 'es' : ''}
            </p>
          </div>
          <div className="shrink-0 bg-rose-100 dark:bg-rose-500/10 p-3.5 rounded-xl border border-rose-200/60 dark:border-rose-500/20">
            <TrendingDown className="w-7 h-7 text-rose-500 dark:text-rose-400" />
          </div>
        </div>
      </div>

      {/* Supplier Breakdown */}
      {supplierTotals.length === 0 ? (
        <div className="glass-card p-10 text-center text-slate-500 dark:text-slate-400 text-sm">
          No hay compras registradas aún.
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-800">
            <h3 className="font-semibold text-slate-950 dark:text-white text-sm tracking-tight">Desglose por proveedor</h3>
          </div>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {supplierTotals.map((supplier: { name: string; totalSpent: number }) => {
              const pct = globalTotal > 0 ? (supplier.totalSpent / globalTotal) * 100 : 0;
              return (
                <li key={supplier.name} className="px-5 py-4 flex flex-col gap-2 hover:bg-slate-50/60 dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="shrink-0 w-8 h-8 rounded-lg bg-indigo-500/10 dark:bg-indigo-500/10 flex items-center justify-center">
                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400">
                          {supplier.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="font-medium text-slate-950 dark:text-white truncate text-sm">{supplier.name}</span>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="font-bold text-slate-950 dark:text-white text-sm">{formatARS(supplier.totalSpent)}</span>
                      <span className="block text-xs text-slate-400 dark:text-slate-500">{pct.toFixed(1)}% del total</span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-[width] duration-500"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
