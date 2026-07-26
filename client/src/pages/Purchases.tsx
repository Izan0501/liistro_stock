import { useState } from 'react';
import { Search, FileText, Loader2, ArrowUpDown, Plus, Building2, Mail, Phone, Box, CheckCircle2 } from 'lucide-react';
import { Confetti } from '../components/ui/confetti';
import { cn } from '../lib/utils';
import { HoverButton } from '../components/ui/HoverButton';
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
          <p className="text-sm text-text-secondary mt-1">Review past restocks and purchases.</p>
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
      <div className="flex border-b border-white/5 space-x-8">
        <button 
          onClick={() => setActiveTab('history')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'history' 
              ? 'border-accent-indigo text-accent-indigo' 
              : 'border-transparent text-slate-400 hover:text-white hover:border-white/20'
          }`}
        >
          Historial de Restocks
        </button>
        <button 
          onClick={() => setActiveTab('directory')}
          className={`py-3 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'directory' 
              ? 'border-accent-indigo text-accent-indigo' 
              : 'border-transparent text-slate-400 hover:text-white hover:border-white/20'
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
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
              <input 
                type="text" 
                placeholder="Search by supplier name..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent-indigo transition-colors text-white"
              />
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <DatePickerWithRange date={dateRange} setDate={setDateRange} />
              {dateRange?.from && (
                <button 
                  onClick={() => setDateRange(undefined)}
                  className="text-xs text-text-secondary hover:text-white px-2 py-1 rounded bg-white/5"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Desktop Data Table */}
          <div className="hidden md:block glass-card overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-900/50 text-text-secondary border-b border-white/5">
                <tr>
                  <th className="px-6 py-3 font-medium cursor-pointer hover:text-text-primary">
                    <div className="flex items-center gap-1">Date <ArrowUpDown className="w-3 h-3" /></div>
                  </th>
                  <th className="px-6 py-3 font-medium">Supplier</th>
                  <th className="px-6 py-3 font-medium text-right">Items</th>
                  <th className="px-6 py-3 font-medium text-right">Total Cost</th>
                  <th className="px-6 py-3 font-medium text-center">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center">
                      <Loader2 className="w-6 h-6 animate-spin text-accent-indigo mx-auto" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center text-text-secondary">
                      No purchases found for this range.
                    </td>
                  </tr>
                ) : filtered.map((purchase: any) => {
                  const totalItems = purchase.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
                  return (
                    <tr key={purchase.id} className="hover:bg-white/5 transition-colors group">
                      <td className="px-6 py-4 text-text-secondary">{formatDate(purchase.purchase_date || purchase.created_at || new Date().toISOString())}</td>
                      <td className="px-6 py-4 font-medium">{purchase.supplier?.name || purchase.supplier_name || 'Desconocido'}</td>
                      <td className="px-6 py-4 text-right text-text-secondary">{totalItems}</td>
                      <td className="px-6 py-4 text-right font-medium text-accent-red">{formatCurrency(purchase.total_amount || purchase.total_cost || 0)}</td>
                      <td className="px-6 py-4 text-center">
                        <button 
                          onClick={() => setSelectedPurchase(purchase)}
                          className="p-1.5 text-text-secondary hover:text-accent-indigo rounded bg-white/5 opacity-0 group-hover:opacity-100 transition-all"
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
                <Loader2 className="w-6 h-6 animate-spin text-accent-indigo" />
              </div>
            ) : filtered.length === 0 ? (
              <div className="glass-card p-6 text-center text-text-secondary">
                No purchases found for this range.
              </div>
            ) : filtered.map((purchase: any) => {
              const totalItems = purchase.items?.reduce((acc: number, curr: any) => acc + curr.quantity, 0) || 0;
              return (
                <div key={purchase.id} className="glass-card p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold">{purchase.supplier?.name || purchase.supplier_name || 'Desconocido'}</div>
                      <div className="text-xs text-text-secondary mt-0.5">{formatDate(purchase.purchase_date || purchase.created_at || new Date().toISOString())}</div>
                    </div>
                    <div className="text-accent-red font-bold">{formatCurrency(purchase.total_amount || purchase.total_cost || 0)}</div>
                  </div>
                  <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
                    <div className="text-xs text-text-secondary">{totalItems} Items</div>
                    <button 
                      onClick={() => setSelectedPurchase(purchase)}
                      className="flex items-center gap-1.5 text-xs font-medium text-accent-indigo hover:text-indigo-400"
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
              <Loader2 className="w-6 h-6 animate-spin text-accent-indigo" />
            </div>
          ) : suppliersList.length === 0 ? (
            <div className="glass-card flex flex-col items-center justify-center p-12 text-center border-dashed border-2 border-slate-800 bg-slate-900/20">
              <div className="bg-slate-800/50 p-4 rounded-full mb-4">
                <Box className="w-8 h-8 text-slate-500" />
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">No Suppliers Found</h3>
              <p className="text-slate-400 text-sm max-w-sm mb-6">You haven't added any suppliers yet. Create your first supplier to start tracking purchases and restocks.</p>
              <button 
                onClick={() => setIsNewSupplierModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium bg-slate-800 hover:bg-slate-700 text-white transition-colors"
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
                  className="bg-slate-900/50 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors flex flex-col gap-4 cursor-pointer group"
                >
                  <div className="flex items-center gap-4">
                    <div className="bg-indigo-500/10 text-indigo-400 p-2.5 rounded-lg group-hover:bg-indigo-500/20 transition-colors">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <h3 className="text-lg font-semibold text-white">{supplier.name}</h3>
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
          <div className="bg-slate-950 border border-slate-800 shadow-2xl shadow-black/50 rounded-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-semibold tracking-tight text-white mb-6">New Supplier</h2>
            <form onSubmit={handleCreateSupplier} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Name</label>
                <input 
                  type="text" 
                  required
                  value={newSupplier.name}
                  onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Contact Email (Optional)</label>
                <input 
                  type="email" 
                  value={newSupplier.contact_email}
                  onChange={e => setNewSupplier({ ...newSupplier, contact_email: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                />
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Contact Phone (Optional)</label>
                <input 
                  type="text" 
                  value={newSupplier.contact_phone}
                  onChange={e => setNewSupplier({ ...newSupplier, contact_phone: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                />
              </div>
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsNewSupplierModalOpen(false)}
                  className="flex-1 h-10 rounded-lg font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
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
          
          <div className="relative z-50 bg-slate-950/80 backdrop-blur-xl border border-slate-800/60 rounded-2xl w-full max-w-sm p-8 shadow-[0_0_60px_rgba(16,185,129,0.15)] animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className={cn("w-20 h-20 rounded-full flex items-center justify-center mb-6 border", showDeleteSuccess ? "shadow-[0_0_30px_rgba(220,38,38,0.3)] bg-red-500/10 border-red-500/20" : "shadow-[0_0_30px_rgba(16,185,129,0.3)] bg-accent-emerald/10 border-accent-emerald/20")}>
              <CheckCircle2 className={cn("w-10 h-10", showDeleteSuccess ? "text-red-500" : "text-accent-emerald")} />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              {showSupplierSuccess ? 'Proveedor Creado' : showEditSuccess ? 'Proveedor Actualizado' : 'Proveedor Eliminado'}
            </h2>
            <p className="text-text-secondary text-sm mb-8">
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
              className="w-full py-3 px-6 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shadow-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
