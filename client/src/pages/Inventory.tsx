import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Plus, Search, Loader2, ArrowUpDown, PackagePlus, LayoutGrid, List, Pencil, PackageCheck, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProducts, useSuppliers } from '../hooks/useData';
import { HoverButton } from '../components/ui/HoverButton';
import { AppInput } from '../components/ui/AppInput';
import { GlowContainer } from '../components/ui/GlowContainer';
import EditProductModal from '../components/Inventory/EditProductModal';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useNotificationStore } from '../hooks/useNotificationStore';
import { exportInventoryToExcel } from '../utils/exportToExcel';

export default function Inventory() {
  const [searchTerm, setSearchTerm] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  // Modals state
  const [isNewProductModalOpen, setIsNewProductModalOpen] = useState(false);
  const [isRestockModalOpen, setIsRestockModalOpen] = useState(false);
  const [selectedEditProduct, setSelectedEditProduct] = useState<any>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

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
    reason: '',
    supplier_id: ''
  });

  const { data: products, isLoading, isError } = useProducts();
  const { data: suppliers } = useSuppliers();
  const queryClient = useQueryClient();
  const { addActivityEvent } = useNotificationStore();

  const productList = Array.isArray(products) ? products : (products?.items || []);
  const supplierList = Array.isArray(suppliers) ? suppliers : (suppliers?.items || []);
  const uniqueCategories: string[] = Array.from(
    new Set(
      productList
        .map((p: any) => p.category)
        .filter((cat: any) => cat && cat.toLowerCase() !== 'general')
    )
  ).sort() as string[];

  const filtered = productList.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const selectedRestockProduct = productList.find((p: any) => p.id === restockData.product_id);

  // ── Deep-link: ?restock=<productId> opens the Restock modal pre-filled ────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const restockId = params.get('restock');
    if (!restockId || productList.length === 0) return;

    const target = productList.find((p: any) => p.id === restockId);
    if (target) {
      setRestockData(prev => ({ ...prev, product_id: restockId }));
      setIsRestockModalOpen(true);
      // Clear the URL param silently so refresh doesn't re-trigger
      navigate('/inventory', { replace: true });
    }
  }, [location.search, productList]);

  // Price + markup linked computation
  const handleBuyPriceChange = (value: string) => {
    const buy = parseFloat(value) || 0;
    const markup = parseFloat(newProduct.markup_percentage) || 0;
    const sell = markup > 0 ? (buy * (1 + markup / 100)).toFixed(2) : newProduct.sell_price;
    setNewProduct({ ...newProduct, buy_price: value, sell_price: String(sell) });
  };

  const handleMarkupChange = (value: string) => {
    const markup = parseFloat(value) || 0;
    const buy = parseFloat(newProduct.buy_price) || 0;
    const sell = buy > 0 ? (buy * (1 + markup / 100)).toFixed(2) : newProduct.sell_price;
    setNewProduct({ ...newProduct, markup_percentage: value, sell_price: String(sell) });
  };

  const handleSellPriceChange = (value: string) => {
    const sell = parseFloat(value) || 0;
    const buy = parseFloat(newProduct.buy_price) || 0;
    const markup = buy > 0 ? (((sell / buy) - 1) * 100).toFixed(2) : newProduct.markup_percentage;
    setNewProduct({ ...newProduct, sell_price: value, markup_percentage: String(markup) });
  };

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });

      // ── Dispatch product creation activity notification ───────────────────
      addActivityEvent({
        type: 'product',
        user: 'Gestión de Inventario',
        message: `Nuevo producto añadido: ${newProduct.name || 'Producto'}`,
      });

      setIsNewProductModalOpen(false);
      
      toast.success("Nuevo Producto Creado", { 
        description: `Se ha añadido ${newProduct.name || 'Producto'} al inventario.`,
        icon: <PackageCheck className="w-5 h-5" />
      });

      setNewProduct({ name: '', category: '', buy_price: '', sell_price: '', markup_percentage: '', available_quantity: '', supplier_id: '' });
    }
  });

  const adjustStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { product_id, ...restPayload } = payload;
      const { data } = await api.post(`/products/${product_id}/adjust-stock`, restPayload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });

      // ── Dispatch restock activity notification ──────────────────────────
      const product = productList.find((p: any) => p.id === restockData.product_id);
      const qty = parseInt(String(restockData.quantity), 10) || 0;
      const operation = restockData.operation === 'add' ? '+' : '-';
      addActivityEvent({
        type: 'restock',
        user: 'Logística y Compras',
        message: `Ingreso de stock: ${operation}${qty} unidades de ${product?.name || 'Producto'}`,
      });

      setIsRestockModalOpen(false);
      
      toast.success("Stock Ajustado", {
        description: `Se han actualizado las unidades de ${product?.name || 'Producto'}.`,
        icon: <PackageCheck className="w-5 h-5" />
      });

      setRestockData({ product_id: '', operation: 'add', quantity: '', reason: '', supplier_id: '' });
    },
    onError: (error: any) => {
      const detail = error.response?.data?.detail;
      const errorMessage = typeof detail === 'string' 
        ? detail 
        : JSON.stringify(detail);
      
      console.error("Backend Error Detail:", errorMessage);
      
      toast.error("Operación rechazada", { 
        description: errorMessage || "El servidor rechazó la operación." 
      });
    }
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();
    createProductMutation.mutate({
      name: newProduct.name,
      category: newProduct.category || null,
      buy_price: parseFloat(newProduct.buy_price),
      sell_price: parseFloat(newProduct.sell_price),
      available_quantity: parseInt(newProduct.available_quantity),
      supplier_id: newProduct.supplier_id || null,
    });
  };

  const handleAdjustStock = (e: React.FormEvent) => {
    e.preventDefault();
    let parsedQuantity = parseInt(String(restockData.quantity), 10);
    if (isNaN(parsedQuantity)) parsedQuantity = 0;
    if (restockData.operation === 'remove') parsedQuantity = -parsedQuantity;

    const payload: any = {
      product_id: restockData.product_id,
      quantity: parsedQuantity,
      reason: restockData.reason ? String(restockData.reason) : "Restock general"
    };

    if (restockData.supplier_id) {
      payload.supplier_id = restockData.supplier_id;
    }

    adjustStockMutation.mutate(payload);
  };

  return (
    <div className="p-4 md:p-8 space-y-6">


      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">Inventario</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} productos en stock</p>
        </div>
        <div className="flex items-center gap-3">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-all duration-200',
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
              title="Vista tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-all duration-200',
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
              title="Vista tarjetas"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>

          <HoverButton
            onClick={() => setIsRestockModalOpen(true)}
            glowColor="#10b981"
            backgroundColor="#0f172a"
            className="flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center"
          >
            <PackagePlus className="w-4 h-4" />
            <span className="hidden sm:inline-block">Ajustar Stock</span>
          </HoverButton>
          <HoverButton
            onClick={() => setIsNewProductModalOpen(true)}
            glowColor="#6366f1"
            backgroundColor="#0f172a"
            className="flex items-center gap-2 text-sm flex-1 sm:flex-none justify-center"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline-block">Nuevo Producto</span>
          </HoverButton>
          <button 
            onClick={() => exportInventoryToExcel(products)}
            className="group relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-300 overflow-hidden shadow-sm bg-white dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)] dark:hover:shadow-none active:scale-95 flex-1 sm:flex-none"
            title="Exportar a Excel"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <FileSpreadsheet className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" strokeWidth={2.5}/>
            <span className="hidden sm:inline-block">Exportar</span>
          </button>
        </div>
      </div>

      {/* Search and Category Filter */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full h-10 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:focus:border-indigo-500 transition-all shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x items-center">
          <button
            onClick={() => setSelectedCategory('All')}
            className={cn("px-4 h-10 rounded-xl whitespace-nowrap text-sm font-medium transition-all snap-start", selectedCategory === 'All' ? "bg-indigo-600 text-white shadow-md border border-transparent" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm")}
          >
            Todas
          </button>
          {uniqueCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn("px-4 h-10 rounded-xl whitespace-nowrap text-sm font-medium transition-all snap-start", selectedCategory === cat ? "bg-indigo-600 text-white shadow-md border border-transparent" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Product Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-red-400">Error loading products.</div>
      )}

      {!isLoading && !isError && viewMode === 'grid' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product: any) => (
            <div
              key={product.id}
              onClick={() => setSelectedEditProduct(product)}
              className="group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-slate-700 transition-all duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-slate-950 dark:text-white truncate">{product.name}</h3>
                  {product.category && (
                    <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{product.category}</span>
                  )}
                </div>
                <ArrowUpDown className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors flex-shrink-0 ml-2" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Precio</div>
                  <div className="text-lg font-bold text-slate-950 dark:text-white">
                    ${Number(product.sell_price ?? product.sellPrice ?? 0).toFixed(2)}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1">Stock</div>
                  <span className={cn(
                    "inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-bold tracking-wide border shadow-sm",
                    product.available_quantity <= 10 
                      ? "bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20" 
                      : "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20"
                  )}>
                    {product.available_quantity ?? product.stock}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {!isLoading && !isError && viewMode === 'table' && (
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50/80 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
            <div className="col-span-4 text-xs font-semibold uppercase tracking-widest text-slate-500">Producto</div>
            <div className="col-span-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Categoría</div>
            <div className="col-span-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Costo</div>
            <div className="col-span-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Precio</div>
            <div className="col-span-1 text-xs font-semibold uppercase tracking-widest text-slate-500">Stock</div>
            <div className="col-span-1" />
          </div>
          {filtered.length === 0 && (
            <div className="px-4 py-12 text-center text-slate-500 text-sm">No hay productos.</div>
          )}
          {filtered.map((product: any, idx: number) => (
            <div
              key={product.id}
              onClick={() => setSelectedEditProduct(product)}
              className={cn(
                'group grid grid-cols-12 gap-4 px-4 py-3.5 items-center cursor-pointer transition-colors duration-150 bg-white dark:bg-transparent',
                'hover:bg-slate-50/80 dark:hover:bg-slate-800/50',
                idx !== filtered.length - 1 && 'border-b border-slate-100 dark:border-slate-800/50'
              )}
            >
              <div className="col-span-4 flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
                  <span className="text-xs font-bold text-indigo-400">
                    {product.name.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-slate-950 dark:text-white truncate">{product.name}</span>
              </div>
              <div className="col-span-2 text-sm text-slate-400 truncate">
                {product.category || <span className="text-slate-700">—</span>}
              </div>
              <div className="col-span-2 text-sm text-slate-700 dark:text-slate-300">
                ${Number(product.buy_price ?? 0).toFixed(2)}
              </div>
              <div className="col-span-2 text-lg font-bold text-slate-950 dark:text-white">
                ${Number(product.sell_price ?? product.sellPrice ?? 0).toFixed(2)}
              </div>
              <div className="col-span-1">
                <span className={cn(
                  'inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-sm font-bold tracking-wide border shadow-sm',
                  product.available_quantity <= 10
                    ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border-red-200 dark:border-red-500/20'
                    : 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20'
                )}>
                  {product.available_quantity ?? product.stock}
                </span>
              </div>
              <div className="col-span-1 flex justify-end">
                <Pencil className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-400 transition-colors" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Restock Modal */}
      {isRestockModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 transition-colors">
            <GlowContainer className="p-6 max-h-[85dvh] overflow-y-auto scrollbar-none">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white mb-6">Adjust Stock</h2>
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Product</label>
                  <select
                    required
                    value={restockData.product_id}
                    onChange={e => setRestockData({ ...restockData, product_id: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-all shadow-sm appearance-none"
                  >
                    <option value="" disabled>Select a product...</option>
                    {productList.map((p: any) => (
                      <option key={p.id} value={p.id}>{p.name} (Stock: {p.available_quantity})</option>
                    ))}
                  </select>
                  {selectedRestockProduct && (
                    <div className="mt-2 flex items-center gap-2">
                      <span className="text-xs font-medium px-2 py-1 bg-slate-800/80 text-slate-700 dark:text-slate-300 rounded-md">
                        Categoría: {selectedRestockProduct.category || 'General'}
                      </span>
                    </div>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Supplier (Optional)</label>
                  <select
                    value={restockData.supplier_id || ''}
                    onChange={e => setRestockData({ ...restockData, supplier_id: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-all shadow-sm appearance-none"
                  >
                    <option value="">No Supplier</option>
                    {supplierList.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">Operación</label>
                    <select
                      value={restockData.operation}
                      onChange={e => setRestockData({ ...restockData, operation: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-all shadow-sm appearance-none"
                    >
                      <option value="add">Add (+)</option>
                      <option value="remove">Remove (-)</option>
                    </select>
                  </div>
                  <AppInput
                    label="Cantidad"
                    type="number"
                    min="1"
                    required
                    value={restockData.quantity}
                    onChange={e => setRestockData({ ...restockData, quantity: e.target.value })}
                    placeholder="0"
                    accentColor="indigo"
                  />
                </div>
                <AppInput
                  label="Razón / Notas"
                  type="text"
                  required
                  placeholder="Ej. Nueva remesa, Mercadería dañada"
                  value={restockData.reason}
                  onChange={e => setRestockData({ ...restockData, reason: e.target.value })}
                  accentColor="indigo"
                />

                <div className="flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsRestockModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={adjustStockMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold transition-colors shadow-md disabled:opacity-70"
                  >
                    {adjustStockMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Confirmar
                  </button>
                </div>
                {/* DRASTIC MOBILE DOCK SPACER */}
                <div className="h-28 w-full shrink-0 sm:hidden" aria-hidden="true"></div>
              </form>
            </GlowContainer>
          </div>
        </div>
      )}

      {/* New Product Modal */}
      {isNewProductModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-2xl animate-in zoom-in-95 duration-200 transition-colors">
            <GlowContainer className="p-6 md:p-8 max-h-[85dvh] overflow-y-auto scrollbar-none">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white mb-6">New Product</h2>
              <form onSubmit={handleCreateProduct} className="grid grid-cols-1 md:grid-cols-12 gap-4">
                <div className="md:col-span-12">
                  <AppInput
                    label="Nombre del Producto"
                    type="text"
                    required
                    value={newProduct.name}
                    onChange={e => setNewProduct({ ...newProduct, name: e.target.value })}
                    placeholder="Ej. Laptop Dell XPS 15"
                    accentColor="indigo"
                  />
                </div>

                <div className="md:col-span-6 flex flex-col justify-end">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">Proveedor</label>
                  <select
                    value={newProduct.supplier_id}
                    onChange={e => setNewProduct({ ...newProduct, supplier_id: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-all shadow-sm appearance-none"
                  >
                    <option value="">Sin Proveedor</option>
                    {supplierList.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-6 flex flex-col justify-end">
                  <label className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">Categoría</label>
                  <div className="relative">
                    <input
                      type="text"
                      value={newProduct.category}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, category: e.target.value });
                        setShowCategorySuggestions(true);
                      }}
                      onFocus={() => setShowCategorySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      placeholder="Ej. Electrónica, Bebidas..."
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-all shadow-sm"
                      autoComplete="off"
                    />
                    
                    {showCategorySuggestions && (
                      <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] dark:shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden">
                        {uniqueCategories
                          .filter(c => c.toLowerCase().includes(newProduct.category.toLowerCase()))
                          .map((c) => (
                            <li
                              key={c}
                              onClick={() => { setNewProduct({ ...newProduct, category: c }); setShowCategorySuggestions(false); }}
                              className="px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                            >
                              {c}
                            </li>
                        ))}
                        
                        {newProduct.category && !uniqueCategories.some(c => c.toLowerCase() === newProduct.category.toLowerCase()) && (
                          <li
                            onClick={() => setShowCategorySuggestions(false)}
                            className="px-4 py-2 cursor-pointer bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium transition-colors"
                          >
                            Crear nueva categoría: <span className="font-bold">"{newProduct.category}"</span>
                          </li>
                        )}
                        
                        {!newProduct.category && uniqueCategories.length === 0 && (
                          <li className="px-4 py-3 text-sm text-slate-500 dark:text-slate-400">
                            Escribe para crear una categoría...
                          </li>
                        )}
                      </ul>
                    )}
                  </div>
                </div>

                <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <AppInput
                    label="Precio de Compra"
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.buy_price}
                    onChange={e => handleBuyPriceChange(e.target.value)}
                    placeholder="0.00"
                    accentColor="indigo"
                  />
                  <AppInput
                    label="Margen %"
                    type="number"
                    step="0.01"
                    value={newProduct.markup_percentage}
                    onChange={e => handleMarkupChange(e.target.value)}
                    placeholder="0.00"
                    accentColor="indigo"
                  />
                  <AppInput
                    label="Precio Final"
                    type="number"
                    step="0.01"
                    required
                    value={newProduct.sell_price}
                    onChange={e => handleSellPriceChange(e.target.value)}
                    placeholder="0.00"
                    accentColor="emerald"
                  />
                  <AppInput
                    label="Stock Inicial"
                    type="number"
                    required
                    value={newProduct.available_quantity}
                    onChange={e => setNewProduct({ ...newProduct, available_quantity: e.target.value })}
                    placeholder="0"
                    accentColor="indigo"
                  />
                </div>

                <div className="md:col-span-12 flex gap-3 pt-6">
                  <button
                    type="button"
                    onClick={() => setIsNewProductModalOpen(false)}
                    className="flex-1 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors font-semibold shadow-sm"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProductMutation.isPending}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-950 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-100 text-white dark:text-slate-950 font-semibold transition-colors shadow-md disabled:opacity-70"
                  >
                    {createProductMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                    Crear Producto
                  </button>
                </div>
                {/* DRASTIC MOBILE DOCK SPACER */}
                <div className="h-28 w-full shrink-0 sm:hidden" aria-hidden="true"></div>
              </form>
            </GlowContainer>
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
            
            const isDelete = action === 'delete';
            if (isDelete) {
              toast.error('Producto Eliminado', {
                description: 'El producto fue eliminado del inventario.',
                icon: <PackageCheck className="w-5 h-5" />
              });
            } else {
              toast.success('¡Producto Actualizado!', {
                description: 'Los cambios fueron guardados exitosamente.',
                icon: <PackageCheck className="w-5 h-5" />
              });
            }
          }}
        />
      )}
    </div>
  );
}
