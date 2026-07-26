import { useState } from 'react';
import { Plus, Search, Loader2, ArrowUpDown, CheckCircle2, PackagePlus } from 'lucide-react';
import { Confetti } from '../components/ui/confetti';
import { cn } from '../lib/utils';
import { useProducts, useSuppliers } from '../hooks/useData';
import { HoverButton } from '../components/ui/HoverButton';
import EditProductModal from '../components/Inventory/EditProductModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [showProductSuccess, setShowProductSuccess] = useState(false);
  const [showRestockSuccess, setShowRestockSuccess] = useState(false);
  const [showEditSuccess, setShowEditSuccess] = useState(false);
  const [showDeleteSuccess, setShowDeleteSuccess] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<any>(null);
  
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    buy_price: '',
    sell_price: '',
    markup_percentage: '',
    available_quantity: '',
    supplier_id: ''
  });

  // Restock Form State
  const [restockData, setRestockData] = useState({
    product_id: '',
    operation: 'add',
    quantity: '',
    reason: ''
  });
  
  const { data: products, isLoading, isError } = useProducts();
  const { data: suppliers } = useSuppliers();
  const queryClient = useQueryClient();

  const productList = Array.isArray(products) ? products : (products?.items || []);
  const supplierList = Array.isArray(suppliers) ? suppliers : (suppliers?.items || []);
  const filtered = productList.filter((p: any) => p.name.toLowerCase().includes(searchTerm.toLowerCase()));

  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setIsNewProductModalOpen(false);
      setShowProductSuccess(true);
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
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      setIsRestockModalOpen(false);
      setShowRestockSuccess(true);
    }
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate({
      name: newProduct.name,
      buy_price: Number(newProduct.buy_price),
      sell_price: Number(newProduct.sell_price),
      available_quantity: Number(newProduct.available_quantity),
      category: newProduct.category,
      supplier_id: newProduct.supplier_id || null
    });
  };

  const handleBuyPriceChange = (val: string) => {
    const buy = parseFloat(val);
    const markup = parseFloat(newProduct.markup_percentage);
    if (!isNaN(buy) && !isNaN(markup)) {
      const sell = buy * (1 + (markup / 100));
      setNewProduct(prev => ({ ...prev, buy_price: val, sell_price: sell.toFixed(2) }));
    } else {
      setNewProduct(prev => ({ ...prev, buy_price: val }));
    }
  };

  const handleMarkupChange = (val: string) => {
    const markup = parseFloat(val);
    const buy = parseFloat(newProduct.buy_price);
    if (!isNaN(markup) && !isNaN(buy)) {
      const sell = buy * (1 + (markup / 100));
      setNewProduct(prev => ({ ...prev, markup_percentage: val, sell_price: sell.toFixed(2) }));
    } else {
      setNewProduct(prev => ({ ...prev, markup_percentage: val }));
    }
  };

  const handleSellPriceChange = (val: string) => {
    const sell = parseFloat(val);
    const buy = parseFloat(newProduct.buy_price);
    if (!isNaN(sell) && !isNaN(buy) && buy > 0) {
      const markup = ((sell / buy) - 1) * 100;
      setNewProduct(prev => ({ ...prev, sell_price: val, markup_percentage: markup.toFixed(2) }));
    } else {
      setNewProduct(prev => ({ ...prev, sell_price: val }));
    }
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(restockData.quantity);
    const delta = restockData.operation === 'add' ? qty : -qty;
    adjustStockMutation.mutate({
      productId: restockData.product_id,
      payload: {
        quantity_delta: delta,
        reason: restockData.reason,
        supplier_id: restockData.operation === 'add' ? ((restockData as any).supplier_id || null) : null
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
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          <button 
            onClick={() => setIsRestockModalOpen(true)}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-medium bg-slate-800 border border-white/10 hover:bg-slate-700 transition-colors"
          >
            <PackagePlus className="w-4 h-4" />
            Restock
          </button>
          <HoverButton
            onClick={() => setIsNewProductModalOpen(true)}
            className="flex-1 sm:flex-none w-full sm:w-auto text-sm font-semibold"
            glowColor="#6366f1"
            backgroundColor="#0f172a"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Crear</span> Producto
          </HoverButton>
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
              <tr 
                key={product.id} 
                className="hover:bg-white/5 transition-colors group cursor-pointer"
                onClick={() => setSelectedEditProduct(product)}
              >
                <td className="px-6 py-4 font-medium">{product.name}</td>
                <td className="px-6 py-4 text-text-secondary">{product.supplier?.name || product.supplier || 'N/A'}</td>
                <td className="px-6 py-4 text-right">
                  <span className={cn("inline-flex items-center px-2 py-0.5 rounded text-xs font-medium", product.available_quantity < 20 ? "bg-accent-red/10 text-accent-red" : "bg-accent-emerald/10 text-accent-emerald")}>
                    {product.available_quantity ?? product.stock}
                  </span>
                </td>
                <td className="px-6 py-4 text-right text-text-secondary">${product.buy_price ?? product.buyPrice}</td>
                <td className="px-6 py-4 text-right font-medium text-accent-emerald">${product.sell_price ?? product.sellPrice}</td>
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
          <div 
            key={product.id} 
            className="glass-card p-4 flex flex-col gap-3 cursor-pointer hover:border-slate-700 transition-colors"
            onClick={() => setSelectedEditProduct(product)}
          >
            <div className="flex justify-between items-start">
              <div>
                <div className="font-bold">{product.name}</div>
                <div className="text-xs text-text-secondary mt-0.5">{product.supplier?.name || product.supplier || 'N/A'}</div>
              </div>
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
          <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/50 rounded-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-semibold tracking-tight text-white mb-6">Adjust Stock</h2>
            <form onSubmit={handleAdjustStock} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Product</label>
                <select 
                  required
                  value={restockData.product_id}
                  onChange={e => setRestockData({ ...restockData, product_id: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-white transition-all"
                >
                  <option value="" disabled>Select a product...</option>
                  {productList.map((p: any) => (
                    <option key={p.id} value={p.id}>{p.name} (Stock: {p.available_quantity})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Supplier (Optional)</label>
                <select 
                  value={(restockData as any).supplier_id || ''}
                  onChange={e => setRestockData({ ...restockData, supplier_id: e.target.value } as any)}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-white transition-all"
                >
                  <option value="">No Supplier</option>
                  {supplierList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Operation</label>
                  <select 
                    value={restockData.operation}
                    onChange={e => setRestockData({ ...restockData, operation: e.target.value })}
                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-white transition-all"
                  >
                    <option value="add">Add (+)</option>
                    <option value="remove">Remove (-)</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Quantity</label>
                  <input 
                    type="number" 
                    min="1"
                    required
                    value={restockData.quantity}
                    onChange={e => setRestockData({ ...restockData, quantity: e.target.value })}
                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Reason</label>
                <input 
                  type="text" 
                  required
                  placeholder="e.g. New shipment, Damage write-off"
                  value={restockData.reason}
                  onChange={e => setRestockData({ ...restockData, reason: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                />
              </div>
              
              <div className="flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsRestockModalOpen(false)}
                  className="flex-1 h-10 rounded-lg font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <HoverButton
                  type="submit"
                  disabled={adjustStockMutation.isPending}
                  className="flex-1"
                  glowColor="#6366f1"
                  backgroundColor="#0f172a"
                >
                  {adjustStockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Confirmar
                </HoverButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-950/80 backdrop-blur-xl border border-slate-800 shadow-2xl shadow-black/50 rounded-2xl w-full max-w-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200">
            <h2 className="text-2xl font-semibold tracking-tight text-white mb-6">New Product</h2>
            <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12">
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Product Name</label>
                <input 
                  type="text" 
                  required
                  value={newProduct.name}
                  onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                />
              </div>

              <div className="md:col-span-6 flex flex-col justify-end">
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Supplier</label>
                <select 
                  value={newProduct.supplier_id}
                  onChange={e => setNewProduct({ ...newProduct, supplier_id: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-white transition-all"
                >
                  <option value="">No Supplier</option>
                  {supplierList.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-6 flex flex-col justify-end">
                <label className="text-sm font-medium text-slate-300 mb-1.5 block">Category</label>
                <input 
                  type="text" 
                  value={newProduct.category}
                  onChange={e => setNewProduct({ ...newProduct, category: e.target.value })}
                  className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                />
              </div>

              <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Precio de Compra</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={newProduct.buy_price}
                onChange={e => handleBuyPriceChange(e.target.value)}
                className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Margen %</label>
              <input 
                type="number" 
                step="0.01"
                value={newProduct.markup_percentage}
                onChange={e => handleMarkupChange(e.target.value)}
                className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-300 mb-1.5 block">Precio Final</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={newProduct.sell_price}
                onChange={e => handleSellPriceChange(e.target.value)}
                className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
              />
            </div>
                <div>
                  <label className="text-sm font-medium text-slate-300 mb-1.5 block">Stock</label>
                  <input 
                    type="number" 
                    required
                    value={newProduct.available_quantity}
                    onChange={e => setNewProduct({ ...newProduct, available_quantity: e.target.value })}
                    className="w-full h-10 bg-slate-900 border border-slate-700 rounded-lg px-4 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-white transition-all" 
                  />
                </div>
              </div>
              
              <div className="md:col-span-12 flex gap-3 pt-6">
                <button 
                  type="button"
                  onClick={() => setIsNewProductModalOpen(false)}
                  className="flex-1 h-10 rounded-lg font-medium bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 transition-colors"
                >
                  Cancel
                </button>
                <HoverButton
                  type="submit"
                  disabled={createProductMutation.isPending}
                  className="flex-1"
                  glowColor="#6366f1"
                  backgroundColor="#0f172a"
                >
                  {createProductMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                  Crear Producto
                </HoverButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Product Modal */}
      {selectedEditProduct && (
        <EditProductModal 
          product={selectedEditProduct}
          suppliers={supplierList}
          onClose={() => setSelectedEditProduct(null)}
          onSuccess={(action) => {
            setSelectedEditProduct(null);
            if (action === 'delete') {
              setShowDeleteSuccess(true);
            } else {
              setShowEditSuccess(true);
            }
          }}
        />
      )}

      {/* Success Modals */}
      {(showProductSuccess || showRestockSuccess || showEditSuccess || showDeleteSuccess) && (
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
              {showProductSuccess ? 'Producto Creado' : showEditSuccess ? 'Producto Actualizado' : showDeleteSuccess ? 'Producto Eliminado' : 'Stock Actualizado'}
            </h2>
            <p className="text-text-secondary text-sm mb-8">
              {showProductSuccess 
                ? 'El producto ha sido añadido correctamente al inventario.' 
                : showEditSuccess
                  ? 'El producto ha sido actualizado correctamente.'
                  : showDeleteSuccess
                    ? 'El producto ha sido eliminado del inventario de forma permanente.'
                    : 'El inventario ha sido actualizado correctamente.'}
            </p>
            
            <button 
              onClick={() => {
                setShowProductSuccess(false);
                setShowRestockSuccess(false);
                setShowEditSuccess(false);
                setShowDeleteSuccess(false);
                setNewProduct({ name: '', category: '', buy_price: '', sell_price: '', markup_percentage: '', available_quantity: '', supplier_id: '' });
                setRestockData({ product_id: '', operation: 'add', quantity: '', reason: '' });
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
