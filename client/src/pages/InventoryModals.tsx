import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../services/api';
import { toast } from 'sonner';
import { useNotificationStore } from '../hooks/useNotificationStore';
import { Loader2, PackageCheck } from 'lucide-react';
import { AppInput } from '../components/ui/AppInput';
import { GlowContainer } from '../components/ui/GlowContainer';

export function RestockModalWrapper({
  isOpen, onClose, productList, supplierList, initialProductId
}: any) {
  const [restockData, setRestockData] = useState({
    product_id: initialProductId || '',
    operation: 'add',
    quantity: '',
    reason: '',
    supplier_id: ''
  });

  const [prevInitialId, setPrevInitialId] = useState(initialProductId);
  if (initialProductId !== prevInitialId) {
    setPrevInitialId(initialProductId);
    setRestockData((prev: any) => ({ ...prev, product_id: initialProductId }));
  }

  const queryClient = useQueryClient();
  const { addActivityEvent } = useNotificationStore();

  const selectedRestockProduct = productList.find((p: any) => p.id === restockData.product_id);

  const adjustStockMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { product_id, ...restPayload } = payload;
      const { data } = await api.post(`/products/${product_id}/adjust-stock`, restPayload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });

      const product = productList.find((p: any) => p.id === restockData.product_id);
      const qty = parseInt(String(restockData.quantity), 10) || 0;
      const operation = restockData.operation === 'add' ? '+' : '-';
      addActivityEvent({
        type: 'restock',
        user: 'Logística y Compras',
        message: `Ingreso de stock: ${operation}${qty} unidades de ${product?.name || 'Producto'}`,
      });

      onClose();
      
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

  if (!isOpen) return null;
  return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-md animate-in zoom-in-95 duration-200 transition-colors">
            <GlowContainer className="p-6 max-h-[85dvh] overflow-y-auto scrollbar-none">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white mb-6">Adjust Stock</h2>
              <form onSubmit={handleAdjustStock} className="space-y-4">
                <div>
                  <label htmlFor="restock-product" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Product</label>
                  <select
                    id="restock-product"
                    required
                    value={restockData.product_id}
                    onChange={e => setRestockData({ ...restockData, product_id: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-colors transition-shadow shadow-sm appearance-none"
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
                  <label htmlFor="restock-supplier" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Supplier (Optional)</label>
                  <select
                    id="restock-supplier"
                    value={restockData.supplier_id || ''}
                    onChange={e => setRestockData({ ...restockData, supplier_id: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-colors transition-shadow shadow-sm appearance-none"
                  >
                    <option value="">No Supplier</option>
                    {supplierList.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="restock-op" className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">Operación</label>
                    <select
                      id="restock-op"
                      value={restockData.operation}
                      onChange={e => setRestockData({ ...restockData, operation: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-colors transition-shadow shadow-sm appearance-none"
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
                    onClick={onClose}
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
  );
}

export function NewProductModalWrapper({
  isOpen, onClose, supplierList, uniqueCategories
}: any) {
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    buy_price: '',
    sell_price: '',
    markup_percentage: '',
    available_quantity: '',
    supplier_id: ''
  });
  const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);

  const queryClient = useQueryClient();
  const { addActivityEvent } = useNotificationStore();

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

  const createProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.post('/products', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['purchases'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });

      addActivityEvent({
        type: 'product',
        user: 'Gestión de Inventario',
        message: `Nuevo producto añadido: ${newProduct.name || 'Producto'}`,
      });

      onClose();
      
      toast.success("Nuevo Producto Creado", { 
        description: `Se ha añadido ${newProduct.name || 'Producto'} al inventario.`,
        icon: <PackageCheck className="w-5 h-5" />
      });

      setNewProduct({ name: '', category: '', buy_price: '', sell_price: '', markup_percentage: '', available_quantity: '', supplier_id: '' });
    }
  });

  const handleCreateProduct = (e: React.FormEvent) => {
    e.preventDefault();

    if (!newProduct.supplier_id) {
      toast.error('Debes seleccionar un proveedor para este producto.');
      return;
    }

    createProductMutation.mutate({
      name: newProduct.name,
      category: newProduct.category || null,
      buy_price: parseFloat(newProduct.buy_price),
      sell_price: parseFloat(newProduct.sell_price),
      available_quantity: parseInt(newProduct.available_quantity),
      supplier_id: newProduct.supplier_id,
    });
  };

  if (!isOpen) return null;
  return (
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
                  <label htmlFor="newprod-supplier" className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">
                    Proveedor <span className="text-red-500">*</span>
                  </label>
                  <select
                    id="newprod-supplier"
                    aria-label="Proveedor"
                    value={newProduct.supplier_id}
                    onChange={e => setNewProduct({ ...newProduct, supplier_id: e.target.value })}
                    className={`w-full bg-white dark:bg-slate-900/50 border text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-colors transition-shadow shadow-sm appearance-none ${
                      !newProduct.supplier_id
                        ? 'border-rose-300 dark:border-rose-500/50'
                        : 'border-slate-300 dark:border-slate-700'
                    }`}
                  >
                    <option value="">— Seleccionar proveedor —</option>
                    {supplierList.map((s: any) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-6 flex flex-col justify-end">
                  <label htmlFor="newprod-category" className="text-xs font-semibold uppercase tracking-widest text-slate-400 block mb-1.5">Categoría</label>
                  <div className="relative">
                    <input
                      id="newprod-category"
                      type="text"
                      value={newProduct.category}
                      onChange={(e) => {
                        setNewProduct({ ...newProduct, category: e.target.value });
                        setShowCategorySuggestions(true);
                      }}
                      onFocus={() => setShowCategorySuggestions(true)}
                      onBlur={() => setTimeout(() => setShowCategorySuggestions(false), 200)}
                      placeholder="Ej. Electrónica, Bebidas..."
                      className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 rounded-xl px-4 py-2.5 transition-colors transition-shadow shadow-sm"
                      autoComplete="off"
                    />
                    
                    {showCategorySuggestions && (
                      <ul className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-[0_10px_40px_rgb(0,0,0,0.08)] dark:shadow-2xl max-h-48 overflow-y-auto overflow-x-hidden">
                        {uniqueCategories.reduce((acc: any[], c: any) => {
                          if (c.toLowerCase().includes(newProduct.category.toLowerCase())) {
                            acc.push(
                              <li key={c}>
                                <button
                                  type="button"
                                  onClick={() => { setNewProduct({ ...newProduct, category: c }); setShowCategorySuggestions(false); }}
                                  className="w-full text-left px-4 py-2 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
                                >
                                  {c}
                                </button>
                              </li>
                            );
                          }
                          return acc;
                        }, [])}
                        
                        {newProduct.category && !uniqueCategories.some((c: any) => c.toLowerCase() === newProduct.category.toLowerCase()) && (
                          <li>
                            <button
                              type="button"
                              onClick={() => setShowCategorySuggestions(false)}
                              className="w-full text-left px-4 py-2 cursor-pointer bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 font-medium transition-colors"
                            >
                              Crear nueva categoría: <span className="font-bold">"{newProduct.category}"</span>
                            </button>
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
                    onClick={onClose}
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
  );
}
