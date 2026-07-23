import { useState } from 'react';
import { Plus, Search, ArrowUpDown, MoreVertical, PackagePlus, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProducts } from '../hooks/useData';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  
  // New Product Form State
  const [newProduct, setNewProduct] = useState({
    name: '',
    sku: '',
    category: '',
    buy_price: '',
    sell_price: '',
    available_quantity: ''
  });

  // Restock Form State
  const [restockData, setRestockData] = useState({
    product_id: '',
    operation: 'add',
    quantity: '',
    reason: ''
  });
  
  const { data: products, isLoading, isError } = useProducts();
  const queryClient = useQueryClient();

  const productList = Array.isArray(products) ? products : (products?.items || []);
  const filtered = productList.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setIsNewProductModalOpen(false);
      setNewProduct({ name: '', sku: '', category: '', buy_price: '', sell_price: '', available_quantity: '' });
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: async ({ productId, payload }: { productId: string, payload: any }) => {
      const { data } = await api.post(`/products/${productId}/adjust-stock`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      setIsRestockModalOpen(false);
      setRestockData({ product_id: '', operation: 'add', quantity: '', reason: '' });
    }
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate({
      name: newProduct.name,
      buy_price: Number(newProduct.buy_price),
      sell_price: Number(newProduct.sell_price),
      available_quantity: Number(newProduct.available_quantity)
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(restockData.quantity);
    const delta = restockData.operation === 'add' ? qty : -qty;
    adjustStockMutation.mutate({
      productId: restockData.product_id,
      payload: {
        quantity_delta: delta,
        reason: restockData.reason
      }
    });
  };

  // Handle Loading State
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-10rem)]">
        <Loader2 className="w-8 h-8 animate-spin text-accent-indigo" />
      </div>
    );
  }

  // Handle Error State
  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-10rem)] text-text-secondary">
        <p className="text-accent-red font-medium mb-2">Failed to load inventory.</p>
        <button onClick={() => window.location.reload()} className="text-accent-indigo hover:underline text-sm">Retry</button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6 animate-in fade-in duration-300 p-4 md:p-8 pb-24 md:pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Inventory</h1>
          <p className="text-sm text-text-secondary mt-1">Manage products, pricing, and stock levels.</p>
        </div>
        <div className="flex gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsRestockModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-slate-800 border border-white/10 hover:bg-slate-700 transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            Restock
          </button>
          <button 
            onClick={() => setIsNewProductModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:brightness-110 transition-all">
            <Plus className="w-4 h-4" />
            New Product
          </button>
        </div>
      </div>

      {/* Filters/Search */}
      <div className="glass-card p-4 flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary" />
          <input 
            type="text" 
            placeholder="Search products..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full bg-black/20 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-accent-indigo transition-colors"
          />
        </div>
      </div>

      {/* Desktop Data Table */}
      <div className="hidden md:block glass-card overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 text-text-secondary border-b border-white/5">
            <tr>
              <th className="px-6 py-3 font-medium">
                <div className="flex items-center gap-1 cursor-pointer hover:text-text-primary">Product <ArrowUpDown className="w-3 h-3" /></div>
              </th>
              <th className="px-6 py-3 font-medium">Supplier</th>
              <th className="px-6 py-3 font-medium text-right">Stock</th>
              <th className="px-6 py-3 font-medium text-right">Buy Price</th>
              <th className="px-6 py-3 font-medium text-right">Sell Price</th>
              <th className="px-6 py-3 font-medium text-center">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-text-secondary">
                  No products found.
                </td>
              </tr>
            ) : filtered.map((product: any) => (
              <tr key={product.id} className="hover:bg-white/5 transition-colors group">
                <td className="px-6 py-4 font-medium">{product.name}</td>
                <td className="px-6 py-4 text-text-secondary">{product.supplier?.name || product.supplier || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", product.available_quantity < 20 ? "bg-accent-red/10 text-accent-red" : "bg-accent-emerald/10 text-accent-emerald")}>
                    {product.available_quantity ?? product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-text-secondary">${product.buy_price ?? product.buyPrice}</td>
                <td className="px-6 py-4 text-right font-medium text-accent-emerald">${product.sell_price ?? product.sellPrice}</td>
                <td className="px-6 py-4 text-center">
                  <button className="p-1 text-text-secondary hover:text-text-primary rounded opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Card View */}
      <div className="md:hidden grid grid-cols-1 gap-3">
        {filtered.length === 0 ? (
          <div className="glass-card p-6 text-center text-text-secondary">
            No products found.
          </div>
        ) : filtered.map((product: any) => (
          <div key={product.id} className="glass-card p-4 flex flex-col gap-3">
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{product.name}</div>
                <div className="text-xs text-text-secondary mt-0.5">{product.supplier?.name || product.supplier || 'N/A'}</div>
              </div>
              <button className="p-1 text-text-secondary"><MoreVertical className="w-4 h-4" /></button>
            </div>
            <div className="flex justify-between items-center text-sm border-t border-white/5 pt-3">
              <div className="flex gap-4">
                <div>
                  <div className="text-xs text-text-secondary">Buy</div>
                  <div>${product.buy_price ?? product.buyPrice}</div>
                </div>
                <div>
                  <div className="text-xs text-text-secondary">Sell</div>
                  <div className="text-accent-emerald font-bold">${product.sell_price ?? product.sellPrice}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-text-secondary mb-1">Stock</div>
                <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", product.available_quantity < 20 ? "bg-accent-red/10 text-accent-red" : "bg-accent-emerald/10 text-accent-emerald")}>
                  {product.available_quantity ?? product.stock}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Restock Modal */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-white">Adjust Stock</h2>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Product</label>
                <select 
                  required
                  value={restockData.product_id}
                  onChange={e => setRestockData({ ...restockData, product_id: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo appearance-none text-white"
                >
                  <option value="" disabled>Select a product...</option>
                  {productList.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.available_quantity})</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Operation</label>
                  <select 
                    value={restockData.operation}
                    onChange={e => setRestockData({ ...restockData, operation: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo appearance-none text-white"
                  >
                    <option value="add">Add (+)</option>
                    <option value="remove">Remove (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={restockData.quantity}
                    onChange={e => setRestockData({ ...restockData, quantity: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Reason</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. New shipment, Damage write-off"
                  value={restockData.reason}
                  onChange={e => setRestockData({ ...restockData, reason: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                />
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg font-medium bg-white/5 text-text-primary hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={adjustStockMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:brightness-110 transition-colors disabled:opacity-50"
                >
                  {adjustStockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirm Adjust
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-[0_0_40px_rgba(0,0,0,0.5)] animate-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold mb-4 text-white">New Product</h2>
            <form onSubmit={handleCreateProduct} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-text-secondary block mb-1.5">Product Name</label>
                <input 
                  type="text" 
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">SKU (Optional)</label>
                  <input 
                    type="text" 
                    value={newProduct.sku}
                    onChange={e => setNewProduct({ ...newProduct, sku: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Category</label>
                  <input 
                    type="text" 
                    value={newProduct.category}
                    onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                  />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Buy Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newProduct.buy_price}
                    onChange={e => setNewProduct({ ...newProduct, buy_price: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Sell Price</label>
                  <input 
                    type="number" 
                    step="0.01"
                    required
                    value={newProduct.sell_price}
                    onChange={e => setNewProduct({ ...newProduct, sell_price: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-text-secondary block mb-1.5">Stock</label>
                  <input 
                    type="number" 
                    required
                    value={newProduct.available_quantity}
                    onChange={e => setNewProduct({ ...newProduct, available_quantity: e.target.value })}
                    className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-2.5 focus:outline-none focus:border-accent-indigo text-white" 
                  />
                </div>
              </div>
              
              <div className="flex gap-3 pt-4 border-t border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="flex-1 py-2.5 rounded-lg font-medium bg-white/5 text-text-primary hover:bg-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-medium bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:brightness-110 transition-colors disabled:opacity-50"
                >
                  {createProductMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Create Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
