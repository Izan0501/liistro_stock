import { useState } from 'react';
import { Search, FileText, Loader2, ArrowUpDown, Plus, Building2, Mail, Phone, Box, Check } from 'lucide-react';
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

export default function Purchases() {
  const [searchTerm, setSearchTerm] = useState('');
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);
  const [selectedPurchase, setSelectedPurchase] = useState<any>(null);
  const [isNewSupplierModalOpen, setIsNewSupplierModalOpen] = useState(false);
  const [showSupplierSuccess, setShowSupplierSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [selectedEditSupplier, setSelectedEditSupplier] = useState<any>(null);
  const [newSupplier, setNewSupplier] = useState({ name: '', contact_email: '', contact_phone: '' });
  const [activeTab, setActiveTab] = useState<'history' | 'directory'>('history');
  
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

  const purchases = Array.isArray(purchasesData) ? purchasesData : (purchasesData?.items || []);
  const suppliersList = Array.isArray(suppliersData) ? suppliersData : (suppliersData?.items || []);

  const filtered = purchases.filter((p: any) => {
    const supplierName = p.supplier?.name || p.supplier_name || 'Desconocido';
    return supplierName.toLowerCase().includes(searchTerm.toLowerCase());
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
          <h1 className="text-2xl font-bold tracking-tight">Supplier Purchases</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Review past restocks and purchases.</p>
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
        <button 
          onClick={() => setActiveTab('history')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-accent-indigo text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-950 dark:text-white hover:border-slate-300 dark:border-white/20'
          }`}
        >
          Historial de Restocks
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'directory' 
              ? 'border-accent-indigo text-indigo-600 dark:text-indigo-400' 
              : 'border-transparent text-slate-400 hover:text-slate-950 dark:text-white hover:border-slate-300 dark:border-white/20'
          }`}
        >
          Directorio de Proveedores
        </button>
      </div>

      {activeTab === 'history' ? (
        <>
          {/* Filters/Search */}
          <div className="glass-card p-4 flex flex-col md:flex-row gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input 
                type="text" 
                placeholder="Search by supplier name..." 
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
                ) : filtered.map((purchase: any) => {
                  const totalItems = purchase.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
                  return (
                    <tr key={purchase.id} className="border-b border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors group bg-white dark:bg-transparent text-slate-950 dark:text-white">
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{formatDate(purchase.purchase_date || purchase.created_at || new Date().toISOString())}</td>
                      <td className="px-6 py-4 font-medium">{purchase.supplier?.name || purchase.supplier_name || 'Desconocido'}</td>
                      <td className="px-6 py-4 text-right text-slate-500 dark:text-slate-400">{totalItems}</td>
                      <td className="px-6 py-4 text-right font-medium text-red-600 dark:text-red-400">{formatCurrency(purchase.total_amount || purchase.total_cost || 0)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedPurchase(purchase)}
                          className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-indigo-600 dark:text-indigo-400 rounded bg-slate-100 dark:bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
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
            ) : filtered.map((purchase: any) => {
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
                    <button 
                      onClick={() => setSelectedPurchase(purchase)}
                      className="flex items-center gap-1.5 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-400"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Receipt
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      ) : (
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
              <button 
                onClick={() => setIsNewSupplierModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-slate-950 dark:text-white transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Supplier
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suppliersList.map((supplier: any) => (
                <div 
                  key={supplier.id} 
                  onClick={() => setSelectedEditSupplier(supplier)}
                  className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm p-5 hover:border-indigo-200 dark:hover:border-slate-700 transition-colors flex flex-col gap-4 cursor-pointer group"
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
                </div>
              ))}
            </div>
          )}
        </>
      )}

      <PurchaseReceiptModal purchase={selectedPurchase} onClose={() => setSelectedPurchase(null)} />

      {/* New Supplier Modal */}
      {isNewSupplierModalOpen && (
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
                onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                placeholder="Ej. Distribuidora Norte S.A."
                accentColor="indigo"
              />
              <AppInput
                label="Email de Contacto (Opcional)"
                type="email"
                value={newSupplier.contact_email}
                onChange={e => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
                placeholder="proveedor@empresa.com"
                accentColor="indigo"
              />
              <AppInput
                label="Teléfono de Contacto (Opcional)"
                type="tel"
                value={newSupplier.contact_phone}
                onChange={e => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
                placeholder="+54 11 0000-0000"
                accentColor="indigo"
              />
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="flex-1 h-10 rounded-xl font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <HoverButton
                  type="submit"
                  disabled={createSupplierMutation.isPending}
                  className="flex-1"
                  glowColor="#6366f1"
                  backgroundColor="#0f172a"
                >
                  {createSupplierMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Save Supplier
                </HoverButton>
              </div>
            </form>
            </GlowContainer>
          </div>
        </div>
      )}

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

      {/* Success Modal */}
      {(showSupplierSuccess || showEditSuccess || showDeleteSuccess) && (
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
          
          <div className="relative w-full max-w-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 text-center shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl transform transition-all z-50 animate-in zoom-in-95 duration-300 flex flex-col items-center">
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
            
            <button 
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
      )}
    </div>
  );
}
