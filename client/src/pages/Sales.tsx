import { useState } from 'react';
import { Plus, Search, MapPin, Phone, ChevronRight, ShoppingBag, Loader2, CheckCircle2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useClients, useProducts } from '../hooks/useData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Confetti } from '../components/ui/confetti';
import { HoverButton } from '../components/ui/HoverButton';

export default function Sales() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchClient, setSearchClient] = useState('');
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  const [newClient, setNewClient] = useState({ name: '', address: '', phone: '', company: '' });

  const { data: clients } = useClients();
  const { data: products, isLoading: productsLoading } = useProducts();
  const queryClient = useQueryClient();

  const clientList = Array.isArray(clients) ? clients : (clients?.items || []);
  const productList = Array.isArray(products) ? products : (products?.items || []);

  const filteredClients = clientList.filter((c: any) => c.name.toLowerCase().includes(searchClient.toLowerCase()));

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/clients', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      setIsCreatingClient(false);
      handleSelectClient(data); // Auto-select the newly created client
      setNewClient({ name: '', address: '', phone: '', company: '' });
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/sales', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setShowSuccessModal(true);
    }
  });

  const handleCloseSuccess = () => {
    setShowSuccessModal(false);
    setStep(1);
    setSelectedClient(null);
    setCart([]);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    createClientMutation.mutate({
      name: newClient.name,
      address: newClient.address,
      phone: newClient.phone
    });
  };

  const handleCreateSale = () => {
    if (!selectedClient || cart.length === 0) return;
    
    const items = cart.map(item => ({
      product_id: item.product.id,
      quantity: item.qty,
      unit_price: Number(item.product.sell_price ?? item.product.sellPrice ?? 0)
    }));

    createSaleMutation.mutate({
      client_id: selectedClient.id,
      items,
      notes: ''
    });
  };

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setStep(2);
  };

  const addToCart = (product: any) => {
    const stock = product.available_quantity ?? product.stock ?? 0;
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= stock) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      if (stock > 0) {
        return [...prev, { product, qty: 1 }];
      }
      return prev;
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing?.qty === 1) return prev.filter(item => item.product.id !== productId);
      return prev.map(item => item.product.id === productId ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const total = cart.reduce((acc, item) => {
    const price = item.product.sell_price ?? item.product.sellPrice ?? item.product.price ?? 0;
    return acc + (price * item.qty);
  }, 0);

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] p-4 md:p-8 pb-24 md:pb-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">New Sale</h1>
          <p className="text-sm text-text-secondary mt-1">
            {step === 1 ? 'Select a client to start' : `Order for ${selectedClient?.name}`}
          </p>
        </div>
        {step === 2 && (
          <button 
            onClick={() => setStep(1)}
            className="text-sm font-medium text-text-secondary hover:text-text-primary px-3 py-1.5 rounded-lg bg-white/5"
          >
            Change Client
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="relative shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-secondary" />
            <input 
              type="text" 
              placeholder="Search clients..." 
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="w-full bg-slate-900/50 border border-white/10 rounded-xl pl-11 pr-4 py-4 text-lg focus:outline-none focus:border-accent-indigo transition-colors"
            />
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            {isCreatingClient ? (
              <div className="glass-card p-4 space-y-4 animate-in fade-in slide-in-from-top-4 duration-200">
                <h3 className="font-medium text-lg">New Client</h3>
                <form onSubmit={handleCreateClient} className="space-y-3">
                  <input 
                    type="text" 
                    required
                    placeholder="Client Name" 
                    value={newClient.name}
                    onChange={e => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
                  />
                  <input 
                    type="text" 
                    placeholder="Company (Optional)" 
                    value={newClient.company}
                    onChange={e => setNewClient({ ...newClient, company: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
                  />
                  <input 
                    type="text" 
                    placeholder="Address" 
                    value={newClient.address}
                    onChange={e => setNewClient({ ...newClient, address: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
                  />
                  <input 
                    type="tel" 
                    placeholder="Phone" 
                    value={newClient.phone}
                    onChange={e => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
                  />
                  <div className="flex gap-3 pt-2">
                    <button 
                      type="button"
                      onClick={() => setIsCreatingClient(false)}
                      className="flex-1 py-3 rounded-lg font-medium bg-white/5 text-text-primary"
                    >
                      Cancel
                    </button>
                    <HoverButton
                      type="submit"
                      disabled={createClientMutation.isPending}
                      className="flex-1"
                      glowColor="#6366f1"
                      backgroundColor="#0f172a"
                    >
                      {createClientMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                      Save Client
                    </HoverButton>
                  </div>
                </form>
              </div>
            ) : (
              <>
                <button 
                  onClick={() => setIsCreatingClient(true)}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-white/20 text-accent-indigo hover:bg-accent-indigo/10 transition-colors"
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Create New Client</span>
                </button>
                
                {filteredClients.map((client: any) => (
                  <button 
                    key={client.id}
                    onClick={() => handleSelectClient(client)}
                    className="w-full flex items-center justify-between p-4 glass-card hover:bg-slate-800 transition-colors text-left"
                  >
                    <div>
                      <div className="font-bold text-lg">{client.name}</div>
                      <div className="flex items-center gap-3 mt-1.5 text-sm text-text-secondary">
                        <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {client.address}</span>
                        <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>
                      </div>
                    </div>
                    <ChevronRight className="w-6 h-6 text-text-secondary" />
                  </button>
                ))}
              </>
            )}
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-24">
            <h3 className="font-medium text-text-secondary sticky top-0 bg-obsidian/90 backdrop-blur pb-2 pt-1 z-10">
              Available Products
            </h3>
            {productsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-accent-indigo" /></div>
            ) : productList.map((product: any) => {
              const inCart = cart.find(item => item.product.id === product.id)?.qty || 0;
              const stock = product.available_quantity ?? product.stock ?? 0;
              const price = product.sell_price ?? product.sellPrice ?? product.price ?? 0;
              return (
                <div key={product.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">{product.name}</div>
                    <div className="text-sm text-text-secondary flex gap-3 mt-1">
                      <span className="text-accent-emerald font-medium">${price}</span>
                      <span>Stock: {stock - inCart}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {inCart > 0 && (
                      <>
                        <button 
                          onClick={() => removeFromCart(product.id)}
                          className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center font-bold text-lg active:scale-95 transition-transform"
                        >-</button>
                        <span className="font-bold w-6 text-center">{inCart}</span>
                      </>
                    )}
                    <button 
                      onClick={() => addToCart(product)}
                      disabled={inCart >= stock}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg active:scale-95 transition-transform",
                        inCart > 0 ? "bg-accent-indigo text-white" : "bg-white/10 hover:bg-white/20",
                        inCart >= stock && "opacity-50 cursor-not-allowed"
                      )}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Bar (Floating on mobile) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-28 md:p-6 bg-slate-900/90 backdrop-blur-lg border-t border-white/5 z-30 md:relative md:bg-transparent md:border-0 md:p-0 md:pt-4">
            <button 
              onClick={handleCreateSale}
              disabled={cart.length === 0 || createSaleMutation.isPending}
              className={cn(
                "w-full flex items-center justify-between py-4 px-6 rounded-2xl font-semibold text-lg transition-all duration-300",
                cart.length > 0 && !createSaleMutation.isPending
                  ? "bg-emerald-600/10 border border-emerald-500/50 text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] hover:bg-emerald-600/20" 
                  : "bg-white/5 border border-white/10 text-text-secondary cursor-not-allowed"
              )}
            >
              <span className="flex items-center gap-2">
                {createSaleMutation.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShoppingBag className="w-5 h-5" />}
                {createSaleMutation.isPending ? "Confirming..." : "Confirm Sale"}
              </span>
              <span className="font-bold tracking-tight">${total}</span>
            </button>
          </div>
        </div>
      )}

      {/* Success Modal with Confetti */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Confetti Canvas */}
          <Confetti
            manualstart={false}
            className="fixed inset-0 w-full h-full pointer-events-none z-[100]"
            options={{
              particleCount: 150,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#10b981', '#6366f1', '#f8fafc', '#334155']
            }}
          />
          
          {/* Modal Backdrop */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm z-40"></div>
          
          {/* Modal Content */}
          <div className="relative z-50 bg-slate-950/80 backdrop-blur-xl border border-slate-800/60 rounded-2xl w-full max-w-sm p-8 shadow-[0_0_60px_rgba(16,185,129,0.15)] animate-in zoom-in-95 duration-300 flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-full bg-accent-emerald/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(16,185,129,0.3)] border border-accent-emerald/20">
              <CheckCircle2 className="w-10 h-10 text-accent-emerald" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">
              Entrega Concretada
            </h2>
            <p className="text-text-secondary text-sm mb-8">
              The sale was registered successfully and the inventory has been updated.
            </p>
            
            <button 
              onClick={handleCloseSuccess}
              className="w-full py-3 px-6 rounded-xl font-bold text-white bg-white/5 hover:bg-white/10 border border-white/10 transition-colors shadow-sm"
            >
              Nueva Venta
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
