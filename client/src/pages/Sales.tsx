import { useState } from 'react';
import { Plus, Search, MapPin, Phone, ChevronRight, ShoppingBag } from 'lucide-react';
import { cn } from '../lib/utils';

// Dummy data to simulate React Query fetching
const dummyClients = [
  { id: 1, name: 'Kiosco El Sol', address: 'Av. Corrientes 1234', phone: '+54 11 1234-5678' },
  { id: 2, name: 'Despensa Los Amigos', address: 'San Martin 552', phone: '+54 11 9876-5432' }
];

const dummyProducts = [
  { id: 1, name: 'Coca Cola 2.25L', stock: 120, price: 1500 },
  { id: 2, name: 'Lays Clasicas 150g', stock: 45, price: 800 },
  { id: 3, name: 'Alfajor Jorgito', stock: 200, price: 300 }
];

export default function Sales() {
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedClient, setSelectedClient] = useState<any>(null);
  const [searchClient, setSearchClient] = useState('');
  const [cart, setCart] = useState<{product: any, qty: number}[]>([]);
  const [isCreatingClient, setIsCreatingClient] = useState(false);

  const filteredClients = dummyClients.filter(c => c.name.toLowerCase().includes(searchClient.toLowerCase()));

  const handleSelectClient = (client: any) => {
    setSelectedClient(client);
    setStep(2);
  };

  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.qty >= product.stock) return prev;
        return prev.map(item => item.product.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === productId);
      if (existing?.qty === 1) return prev.filter(item => item.product.id !== productId);
      return prev.map(item => item.product.id === productId ? { ...item, qty: item.qty - 1 } : item);
    });
  };

  const total = cart.reduce((acc, item) => acc + (item.product.price * item.qty), 0);

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
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
                <div className="space-y-3">
                  <input type="text" placeholder="Client Name" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" />
                  <input type="text" placeholder="Address" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" />
                  <input type="tel" placeholder="Phone" className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo" />
                  <div className="flex gap-3 pt-2">
                    <button 
                      onClick={() => setIsCreatingClient(false)}
                      className="flex-1 py-3 rounded-lg font-medium bg-white/5 text-text-primary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={() => {
                        // Simulate creation
                        setIsCreatingClient(false);
                        handleSelectClient({ id: 99, name: 'New Client', address: 'Unknown', phone: 'Unknown' });
                      }}
                      className="flex-1 py-3 rounded-lg font-medium bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)]"
                    >
                      Save & Continue
                    </button>
                  </div>
                </div>
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
                
                {filteredClients.map(client => (
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
            {dummyProducts.map(product => {
              const inCart = cart.find(item => item.product.id === product.id)?.qty || 0;
              return (
                <div key={product.id} className="glass-card p-4 flex items-center justify-between">
                  <div>
                    <div className="font-bold">{product.name}</div>
                    <div className="text-sm text-text-secondary flex gap-3 mt-1">
                      <span className="text-accent-emerald font-medium">${product.price}</span>
                      <span>Stock: {product.stock - inCart}</span>
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
                      disabled={inCart >= product.stock}
                      className={cn(
                        "w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg active:scale-95 transition-transform",
                        inCart > 0 ? "bg-accent-indigo text-white" : "bg-white/10 hover:bg-white/20",
                        inCart >= product.stock && "opacity-50 cursor-not-allowed"
                      )}
                    >+</button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Checkout Bar (Floating on mobile) */}
          <div className="absolute bottom-0 left-0 right-0 p-4 md:p-6 bg-slate-900/90 backdrop-blur-lg border-t border-white/5 pb-safe z-30 md:relative md:bg-transparent md:border-0 md:p-0 md:pt-4">
            <button 
              disabled={cart.length === 0}
              className={cn(
                "w-full flex items-center justify-between py-4 px-6 rounded-xl font-bold text-lg transition-all",
                cart.length > 0 
                  ? "bg-accent-emerald text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:brightness-110" 
                  : "bg-white/10 text-text-secondary cursor-not-allowed"
              )}
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5" />
                Confirm Sale
              </span>
              <span>${total}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
