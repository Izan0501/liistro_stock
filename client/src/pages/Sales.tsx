import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, MapPin, Phone, Loader2, Check, Plus, Minus, ChevronRight, ShoppingBag, Edit2, Trash2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useClients, useProducts } from '../hooks/useData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { Confetti } from '../components/ui/confetti';
import { HoverButton } from '../components/ui/HoverButton';
import { toast } from 'sonner';
import { useNotificationStore } from '../hooks/useNotificationStore';

function HybridQuantityInput({ inCart, maxStock, onUpdate }: any) {
  const [inputValue, setInputValue] = useState(inCart === 0 ? '' : inCart.toString());
  const [prevInCart, setPrevInCart] = useState(inCart);

  if (inCart !== prevInCart) {
    setPrevInCart(inCart);
    setInputValue(inCart === 0 ? '' : inCart.toString());
  }

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    
    // 1. Allow the user to completely clear the input WITHOUT unmounting the component
    if (val === '') {
      setInputValue('');
      return; // CRITICAL: Do NOT call onUpdate(0) here.
    }

    // 2. Parse and validate
    const num = parseInt(val, 10);
    if (!isNaN(num) && num >= 0) {
      // Cap at max stock
      const safeNum = Math.min(num, maxStock);
      setInputValue(safeNum.toString());
      
      // Only tell the parent if it's a valid number > 0
      if (safeNum > 0) {
        onUpdate(safeNum);
      }
    }
  };

  const handleBlur = () => {
    const currentQty = parseInt(inputValue, 10);
    if (isNaN(currentQty) || currentQty <= 0) {
      setInputValue('1');
      onUpdate(1);
    }
  };

  if (inCart === 0) {
    return (
      <button type="button" aria-label="Añadir al carrito"
        onClick={() => onUpdate(1)}
        disabled={maxStock <= 0}
        className={cn(
          "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg active:scale-95 transition-transform",
          "bg-white/10 hover:bg-white/20",
          maxStock <= 0 && "opacity-50 cursor-not-allowed"
        )}
      >
        <Plus className="w-5 h-5" />
      </button>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-700/50 w-fit">
      <button type="button" aria-label="Reducir cantidad"
        onClick={() => onUpdate(Math.max(0, inCart - 1))}
        className="p-2 text-slate-500 hover:text-slate-950 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition-colors transition-opacity transition-transform transition-shadow shadow-sm dark:shadow-none active:scale-95 disabled:opacity-50"
      >
        <Minus className="w-4 h-4 sm:w-5 sm:h-5"/>
      </button>
      
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        value={inputValue}
        onChange={handleQuantityChange}
        onBlur={handleBlur}
        className="w-12 sm:w-16 text-center bg-transparent text-slate-950 dark:text-white font-bold text-base sm:text-lg border-none focus:ring-0 focus:outline-none selection:bg-indigo-500/30 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none m-0 p-0"
        aria-label="Cantidad"
      />
      
      <button type="button" aria-label="Aumentar cantidad"
        onClick={() => onUpdate(Math.min(maxStock, inCart + 1))}
        className="p-2 text-slate-500 hover:text-slate-950 hover:bg-white dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800 rounded-lg transition-colors transition-opacity transition-transform transition-shadow shadow-sm dark:shadow-none active:scale-95 disabled:opacity-50"
        disabled={inCart >= maxStock}
      >
        <Plus className="w-4 h-4 sm:w-5 sm:h-5"/>
      </button>
    </div>
  );
}

function useSalesLogic() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchClient, setSearchClient] = useState('');
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const navigate = useNavigate();
  const { addNotification, addActivityEvent } = useNotificationStore();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [newClient, setNewClient] = useState({ name: '', address: '', phone: '', company: '' });
  const [editingClient, setEditingClient] = useState<any>(null);
  const [selectedZone, setSelectedZone] = useState<string>('All');

  const { data: clients } = useClients();
  const { data: products, isLoading: productsLoading } = useProducts();
  const queryClient = useQueryClient();

  const clientList = Array.isArray(clients) ? clients : (clients?.items || []);
  const productList = Array.isArray(products) ? products : (products?.items || []);

  const uniqueZones = Array.from(
    new Set(
      clientList.reduce((acc: string[], client: any) => {
        const addr = client.address?.trim();
        if (addr && addr.length > 0) acc.push(addr);
        return acc;
      }, [])
    )
  ).sort() as string[];

  const filteredClients = clientList.filter((c: any) => {
    const matchesSearch = c.name.toLowerCase().includes(searchClient.toLowerCase());
    const matchesZone = selectedZone === 'All' || c.address?.trim() === selectedZone;
    return matchesSearch && matchesZone;
  });

  const uniqueCategories = Array.from(
    new Set(
      productList.reduce((acc: string[], p: any) => {
        if (p.category && p.category.toLowerCase() !== 'general') {
          acc.push(p.category);
        }
        return acc;
      }, [])
    )
  ).sort() as string[];

  const filteredProducts = productList.filter((product: any) => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  // Mutations
  const createClientMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/clients', payload);
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      setIsCreatingClient(false);
      handleSelectClient(data); // Auto-select the newly created client
      setNewClient({ name: '', address: '', phone: '', company: '' });
    }
  });

  const updateClientMutation = useMutation({
    mutationFn: async (payload: any) => {
      const targetId = payload?.id;
      if (!targetId) throw new Error('Client ID is missing.');
      // Send only the fields the backend schema accepts
      const body = {
        name: payload.name || undefined,
        phone: payload.phone || undefined,
        address: payload.address || undefined,
      };
      const { data } = await api.patch(`/clients/${targetId}`, body);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      setEditingClient(null);
      toast.success('Cliente actualizado exitosamente');
    },
    onError: (err: any) => {
      const msg = err?.message === 'Client ID is missing.'
        ? 'Error: ID de cliente no encontrado.'
        : 'Error al actualizar el cliente. Intenta de nuevo.';
      toast.error(msg);
    }
  });

  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: string | number) => {
      if (!clientId) throw new Error('Client ID is missing.');
      await api.delete(`/clients/${clientId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      setEditingClient(null);
      toast.success('Cliente eliminado correctamente.');
    },
    onError: (err: any) => {
      const msg = err?.message === 'Client ID is missing.'
        ? 'Error: ID de cliente no encontrado.'
        : 'Error al eliminar el cliente. Intenta de nuevo.';
      toast.error(msg);
    }
  });

  const createSaleMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/sales', payload);
      return data;
    },
    onSuccess: (response: any) => {
      queryClient.invalidateQueries({ queryKey: ['sales'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      setShowSuccessModal(true);

      // ── Dispatch sale activity notification ───────────────────────────────
      const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
      const firstItem = cart[0];
      const saleLabel = cart.length === 1
        ? `${firstItem.qty}x ${firstItem.product.name}`
        : `${totalItems} artículos (${cart.length} productos)`;
      addActivityEvent({
        type: 'sale',
        user: 'Terminal de Ventas',
        message: `Venta registrada: ${saleLabel}`,
      });

      // ── Handle low-stock alerts from the backend ──────────────────────────
      const alerts: any[] = response?.low_stock_alerts ?? [];
      alerts.forEach((alert: any) => {
        // Push into the global notification inbox
        addNotification({
          productId: alert.product_id,
          productName: alert.product_name,
          stock: alert.remaining_stock,
        });

        // Fire a floating toast that deep-links to Restock modal
        toast.warning(
          `¡Stock crítico! ${alert.product_name}: ${alert.remaining_stock} unidades`,
          {
            duration: 8000,
            action: {
              label: 'Reponer ahora',
              onClick: () => navigate(`/inventory?restock=${alert.product_id}`),
            },
          }
        );
      });
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
      phone: newClient.phone,
      company: newClient.company
    });
  };

  const handleUpdateClient = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = editingClient?.id;
    if (!targetId) {
      toast.error('Error: ID de cliente no encontrado.');
      return;
    }
    updateClientMutation.mutate(editingClient);
  };

  const handleCreateSale = () => {
    if (!selectedClient || cart.length === 0) return;
    
    const items = cart.reduce((acc: any[], item: any) => {
      const p = productList.find((p: any) => p.id === item.product.id);
      if (p) {
        acc.push({ 
          product_id: item.product.id,
          quantity: item.qty,
          unit_price: Number(item.product.sell_price ?? item.product.sellPrice ?? 0),
          unit_cost: Number(p.buy_price ?? 0)
        });
      }
      return acc;
    }, []);

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



  const updateQuantity = (product: any, newQty: number) => {
    setCart(prev => {
      if (newQty <= 0) return prev.filter(item => item.product.id !== product.id);
      
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, qty: newQty } : item);
      }
      return [...prev, { product, qty: newQty }];
    });
  };

  const total = cart.reduce((acc, item) => {
    const price = item.product.sell_price ?? item.product.sellPrice ?? item.product.price ?? 0;
    return acc + (price * item.qty);
  }, 0);

  return {
    step, setStep, selectedClient, searchClient, setSearchClient, cart, isCreatingClient, setIsCreatingClient,
    showSuccessModal, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, newClient, setNewClient,
    editingClient, setEditingClient, selectedZone, setSelectedZone,
    uniqueZones, filteredClients, uniqueCategories, filteredProducts, productsLoading,
    createClientMutation, updateClientMutation, deleteClientMutation, createSaleMutation,
    handleCloseSuccess, handleCreateClient, handleUpdateClient, handleCreateSale, handleSelectClient,
    updateQuantity, total
  };
}

export default function Sales() {
  const {
    step, setStep, selectedClient, searchClient, setSearchClient, cart, isCreatingClient, setIsCreatingClient,
    showSuccessModal, searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, newClient, setNewClient,
    editingClient, setEditingClient, selectedZone, setSelectedZone,
    uniqueZones, filteredClients, uniqueCategories, filteredProducts, productsLoading,
    createClientMutation, updateClientMutation, deleteClientMutation, createSaleMutation,
    handleCloseSuccess, handleCreateClient, handleUpdateClient, handleCreateSale, handleSelectClient,
    updateQuantity, total
  } = useSalesLogic();

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)] p-4 md:p-8 pb-24 md:pb-8 animate-in fade-in transition-opacity duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 shrink-0">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Nueva venta</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {step === 1 ? 'Selecciona o crea un cliente' : `Orden para ${selectedClient?.name}`}
          </p>
        </div>
        {step === 2 && (
          <button type="button" 
            onClick={() => setStep(1)}
            className="text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:text-slate-950 dark:text-white px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-white/5"
          >
            Cambiar Cliente
          </button>
        )}
      </div>

      {step === 1 && (
        <div className="flex-1 flex flex-col gap-4 overflow-hidden">
          <div className="relative shrink-0">
            <label htmlFor="search-client" className="sr-only">Buscar Clientes</label>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 dark:text-slate-400" />
            <input 
              id="search-client"
              type="text" 
              placeholder="Buscar clientes..." 
              value={searchClient}
              onChange={(e) => setSearchClient(e.target.value)}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 rounded-xl pl-11 pr-4 py-4 text-lg text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 transition-colors transition-shadow shadow-sm"
            />
          </div>

          <div className="flex w-full gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2 shrink-0">
            <button type="button" onClick={() => setSelectedZone('All')} className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors transition-shadow", selectedZone === 'All' ? 'bg-indigo-600 text-white shadow-md border-transparent' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm')}>Todos</button>
            {uniqueZones.map((zone: string) => (
              <button type="button" key={zone} onClick={() => setSelectedZone(zone)} className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors transition-shadow", selectedZone === zone ? 'bg-indigo-600 text-white shadow-md border-transparent' : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm')}>
                {zone}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 pb-4">
            <ClientSelectionStep
              isCreatingClient={isCreatingClient}
              setIsCreatingClient={setIsCreatingClient}
              newClient={newClient}
              setNewClient={setNewClient}
              handleCreateClient={handleCreateClient}
              createClientMutation={createClientMutation}
              editingClient={editingClient}
              setEditingClient={setEditingClient}
              handleUpdateClient={handleUpdateClient}
              updateClientMutation={updateClientMutation}
              filteredClients={filteredClients}
              handleSelectClient={handleSelectClient}
              HoverButton={HoverButton}
              Loader2={Loader2}
              Plus={Plus}
              MapPin={MapPin}
              Phone={Phone}
              ChevronRight={ChevronRight}
              Edit2={Edit2}
              Trash2={Trash2}
              deleteClientMutation={deleteClientMutation}
            />
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="flex-1 flex flex-col overflow-hidden">
           <SalesProductSelectionStep
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            selectedCategory={selectedCategory}
            setSelectedCategory={setSelectedCategory}
            uniqueCategories={uniqueCategories}
            productsLoading={productsLoading}
            filteredProducts={filteredProducts}
            cart={cart}
            updateQuantity={updateQuantity}
            handleCreateSale={handleCreateSale}
            createSaleMutation={createSaleMutation}
            total={total}
            Search={Search}
            Loader2={Loader2}
            HybridQuantityInput={HybridQuantityInput}
            ShoppingBag={ShoppingBag}
            cn={cn}
          />
        </div>
      )}

      <SalesSuccessModal 
        showSuccessModal={showSuccessModal}
        handleCloseSuccess={handleCloseSuccess}
        Confetti={Confetti}
        Check={Check}
      />
    </div>
  );
}

function ClientSelectionStep({ isCreatingClient, setIsCreatingClient, newClient, setNewClient, handleCreateClient, createClientMutation, editingClient, setEditingClient, handleUpdateClient, updateClientMutation, deleteClientMutation, filteredClients, handleSelectClient, HoverButton, Loader2, Plus, MapPin, Phone, ChevronRight, Edit2, Trash2 }: any) {
  if (isCreatingClient) {
    return (
      <div className="glass-card p-4 space-y-4 animate-in fade-in slide-in-from-top-4 transition-opacity duration-200">
        <h3 className="font-medium text-lg">New Client</h3>
        <form onSubmit={handleCreateClient} className="space-y-3">
          <div>
            <label htmlFor="client-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Client Name</label>
            <input 
              id="client-name"
              type="text" 
              required
              placeholder="Client Name" 
              value={newClient.name}
              onChange={(e: any) => setNewClient({ ...newClient, name: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div>
            <label htmlFor="client-company" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Company (Optional)</label>
            <input 
              id="client-company"
              type="text" 
              placeholder="Company (Optional)" 
              value={newClient.company}
              onChange={(e: any) => setNewClient({ ...newClient, company: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div>
            <label htmlFor="client-address" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Address</label>
            <input 
              id="client-address"
              type="text" 
              placeholder="Address" 
              value={newClient.address}
              onChange={(e: any) => setNewClient({ ...newClient, address: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div>
            <label htmlFor="client-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Phone</label>
            <input 
              id="client-phone"
              type="tel" 
              placeholder="Phone" 
              value={newClient.phone}
              onChange={(e: any) => setNewClient({ ...newClient, phone: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setIsCreatingClient(false)}
              className="flex-1 py-3 rounded-lg font-medium bg-slate-100 dark:bg-white/5 text-slate-950 dark:text-slate-950 dark:text-white"
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
    );
  }

  if (editingClient) {
    return (
      <div className="glass-card p-4 space-y-4 animate-in fade-in slide-in-from-top-4 transition-opacity duration-200">
        <h3 className="font-medium text-lg">Editar Cliente</h3>
        <form onSubmit={handleUpdateClient} className="space-y-3">
          <div>
            <label htmlFor="edit-client-name" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Nombre del Cliente</label>
            <input 
              id="edit-client-name"
              type="text" 
              required
              placeholder="Nombre del Cliente" 
              value={editingClient.name || ''}
              onChange={(e: any) => setEditingClient({ ...editingClient, name: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div>
            <label htmlFor="edit-client-company" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Empresa (Opcional)</label>
            <input 
              id="edit-client-company"
              type="text" 
              placeholder="Empresa (Opcional)" 
              value={editingClient.company || ''}
              onChange={(e: any) => setEditingClient({ ...editingClient, company: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div>
            <label htmlFor="edit-client-address" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Dirección</label>
            <input 
              id="edit-client-address"
              type="text" 
              placeholder="Dirección" 
              value={editingClient.address || ''}
              onChange={(e: any) => setEditingClient({ ...editingClient, address: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div>
            <label htmlFor="edit-client-phone" className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">Teléfono</label>
            <input 
              id="edit-client-phone"
              type="tel" 
              placeholder="Teléfono" 
              value={editingClient.phone || ''}
              onChange={(e: any) => setEditingClient({ ...editingClient, phone: e.target.value })}
              className="w-full bg-white border border-slate-300 text-slate-950 placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/20 dark:bg-slate-950/50 dark:border-slate-700 dark:text-white dark:focus:border-indigo-500 dark:focus:ring-0 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" 
            />
          </div>
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={() => setEditingClient(null)}
              className="py-3 px-4 rounded-lg font-medium bg-slate-100 dark:bg-white/5 text-slate-950 dark:text-white"
            >
              Cancelar
            </button>
            <button 
              type="button"
              onClick={() => {
                if (window.confirm(`¿Eliminar a "${editingClient.name}"? Esta acción no se puede deshacer.`)) {
                  deleteClientMutation.mutate(editingClient.id);
                }
              }}
              disabled={deleteClientMutation.isPending || updateClientMutation.isPending}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium bg-rose-50 hover:bg-rose-100 text-rose-600 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              aria-label="Eliminar cliente"
            >
              {deleteClientMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Eliminar
            </button>
            <HoverButton
              type="submit"
              disabled={updateClientMutation.isPending || deleteClientMutation.isPending}
              className="flex-1"
              glowColor="#6366f1"
              backgroundColor="#0f172a"
            >
              {updateClientMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar
            </HoverButton>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      <button type="button" 
        onClick={() => setIsCreatingClient(true)}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl border border-dashed border-slate-300 dark:border-slate-700 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:border-indigo-600 dark:hover:border-indigo-400 transition-colors font-medium"
      >
        <Plus className="w-5 h-5" />
        <span className="font-medium">Crear nuevo cliente</span>
      </button>
      
      {filteredClients.map((client: any) => (
        <div 
          key={client.id}
          className="flex w-full items-center justify-between p-4 rounded-2xl border transition-colors transition-shadow bg-white border-slate-200 text-slate-950 hover:border-indigo-500 hover:shadow-md dark:bg-slate-900 dark:border-slate-800 dark:text-white dark:hover:border-indigo-500"
        >
          <button type="button" onClick={() => handleSelectClient(client)} className="flex-1 text-left flex flex-col justify-center cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg">
            <div className="font-bold text-lg">{client.name}</div>
            <div className="flex items-center gap-3 mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" /> {client.address}</span>
              <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {client.phone}</span>
            </div>
          </button>
          <div className="flex items-center pl-2 shrink-0">
            <button 
              type="button"
              onClick={() => setEditingClient(client)}
              className="p-2 text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:text-indigo-400 dark:hover:bg-indigo-500/10 rounded-lg transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
              aria-label="Editar cliente"
            >
              <Edit2 className="w-5 h-5" />
            </button>
            <ChevronRight className="w-6 h-6 text-slate-500 dark:text-slate-400 pointer-events-none" />
          </div>
        </div>
      ))}
    </>
  );
}

function SalesSuccessModal({ showSuccessModal, handleCloseSuccess, Confetti, Check }: any) {
  if (!showSuccessModal) return null;
  return (
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
          <div className="relative z-50 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl p-8 max-w-sm w-full mx-auto shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl text-center transform transition-colors transition-transform transition-shadow animate-in zoom-in-95 duration-300">
            {/* Success Icon Container */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-500/10 mb-6 ring-8 ring-emerald-50/50 dark:ring-emerald-500/5">
              <Check className="h-10 w-10 text-emerald-600 dark:text-emerald-400" strokeWidth={2.5} />
            </div>
            
            <h2 className="text-2xl font-bold text-slate-950 dark:text-white mb-2">
              Entrega Concretada
            </h2>
            <p className="text-slate-500 dark:text-slate-400 mb-8">
              La venta se registró exitosamente y el inventario ha sido actualizado.
            </p>
            
            <button type="button" 
              onClick={handleCloseSuccess}
              className="w-full py-3 px-4 bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold rounded-xl transition-colors shadow-md"
            >
              Nueva Venta
            </button>
          </div>
        </div>
  );
}

function SalesProductSelectionStep({ searchQuery, setSearchQuery, selectedCategory, setSelectedCategory, uniqueCategories, productsLoading, filteredProducts, cart, updateQuantity, handleCreateSale, createSaleMutation, total, Search, Loader2, HybridQuantityInput, ShoppingBag, cn }: any) {
  return (
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 pb-24">
            <h3 className="py-3 mb-4 border-b border-slate-200 dark:border-slate-800 text-lg font-semibold text-slate-950 dark:text-white sticky top-0 bg-slate-50 dark:bg-slate-950 z-10">
              Productos disponibles
            </h3>
            
            <div className="relative mb-3 shrink-0">
              <label htmlFor="search-products" className="sr-only">Buscar productos</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400" />
              <input 
                id="search-products"
                type="text" 
                placeholder="Buscar productos..." 
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl pl-9 pr-4 py-2.5 text-sm transition-colors transition-shadow shadow-sm"
              />
            </div>
            
            <div className="flex w-full gap-2 overflow-x-auto pb-2 scrollbar-hide mb-2 shrink-0">
              <button type="button"                 onClick={() => setSelectedCategory('All')}
                className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors transition-shadow",
                  selectedCategory === 'All'
                    ? 'bg-indigo-600 text-white shadow-md border-transparent'
                    : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm'
                )}
              >
                Todos
              </button>
              {uniqueCategories.map((category: any) => (
                <button type="button"                   key={category as string}
                  onClick={() => setSelectedCategory(category as string)}
                  className={cn("whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors transition-shadow",
                    selectedCategory === category
                       ? 'bg-indigo-600 text-white shadow-md border-transparent'
                       : 'bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm'
                  )}
                >
                  {category as React.ReactNode}
                </button>
              ))}
            </div>

            {productsLoading ? (
              <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin text-indigo-600 dark:text-indigo-400" /></div>
            ) : filteredProducts.map((product: any) => {
              const inCart = cart.find((item: any) => item.product.id === product.id)?.qty || 0;
              const stock = product.available_quantity ?? product.stock ?? 0;
              const price = product.sell_price ?? product.sellPrice ?? product.price ?? 0;
              return (
                <div key={product.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">{product.name}</div>
                    <div className="text-sm text-slate-500 dark:text-slate-400 flex gap-3 mt-1">
                      <span className="text-emerald-600 dark:text-emerald-400 font-medium">${price}</span>
                      <span>Stock: {stock - inCart}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <HybridQuantityInput 
                      inCart={inCart} 
                      maxStock={stock} 
                      onUpdate={(newQty: number) => updateQuantity(product, newQty)} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Bar (Floating on mobile) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 pb-28 md:p-6 bg-white/90 dark:bg-slate-950/90 backdrop-blur-lg border-t border-slate-200 dark:border-slate-800 z-30 md:relative md:bg-transparent md:border-0 md:p-0 md:pt-4">
            <button type="button" 
              onClick={handleCreateSale}
              disabled={cart.length === 0 || createSaleMutation.isPending}
              className={cn(
                "w-full flex items-center justify-between py-4 px-6 rounded-2xl font-semibold text-lg transition-colors transition-transform transition-shadow duration-300",
                cart.length > 0 && !createSaleMutation.isPending
                  ? "bg-emerald-600/10 border border-emerald-500/50 text-emerald-400 hover:shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.02] hover:bg-emerald-600/20" 
                  : "bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-500 dark:text-slate-400 cursor-not-allowed"
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
  );
}
