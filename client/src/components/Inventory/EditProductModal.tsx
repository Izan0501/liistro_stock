import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { HoverButton } from '../ui/HoverButton';

interface EditProductModalProps {
  product: any;
  suppliers: any[];
  onClose: () => void;
  onSuccess: (action?: 'edit' | 'delete') => void;
}

export default function EditProductModal({ product, suppliers, onClose, onSuccess }: EditProductModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    buy_price: '',
    sell_price: '',
    markup_percentage: '',
    supplier_id: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (product) {
      const buy = product.buy_price ?? product.buyPrice ?? 0;
      const sell = product.sell_price ?? product.sellPrice ?? 0;
      let markup = '';
      if (buy > 0 && sell > 0) {
        markup = (((sell / buy) - 1) * 100).toFixed(2);
      }
      setFormData({
        name: product.name || '',
        category: product.category || '',
        buy_price: buy.toString(),
        sell_price: sell.toString(),
        markup_percentage: markup,
        supplier_id: product.supplier?.id || product.supplier_id || ''
      });
    }
  }, [product]);

  const queryClient = useQueryClient();

  const updateProductMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.patch(`/products/${product.id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      onSuccess('edit');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/products/${product.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      onSuccess('delete');
    }
  });

  const handleBuyPriceChange = (val: string) => {
    const buy = parseFloat(val);
    const markup = parseFloat(formData.markup_percentage);
    if (!isNaN(buy) && !isNaN(markup)) {
      const sell = buy * (1 + (markup / 100));
      setFormData(prev => ({ ...prev, buy_price: val, sell_price: sell.toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, buy_price: val }));
    }
  };

  const handleMarkupChange = (val: string) => {
    const markup = parseFloat(val);
    const buy = parseFloat(formData.buy_price);
    if (!isNaN(markup) && !isNaN(buy)) {
      const sell = buy * (1 + (markup / 100));
      setFormData(prev => ({ ...prev, markup_percentage: val, sell_price: sell.toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, markup_percentage: val }));
    }
  };

  const handleSellPriceChange = (val: string) => {
    const sell = parseFloat(val);
    const buy = parseFloat(formData.buy_price);
    if (!isNaN(sell) && !isNaN(buy) && buy > 0) {
      const markup = ((sell / buy) - 1) * 100;
      setFormData(prev => ({ ...prev, sell_price: val, markup_percentage: markup.toFixed(2) }));
    } else {
      setFormData(prev => ({ ...prev, sell_price: val }));
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProductMutation.mutate({
      name: formData.name,
      buy_price: Number(formData.buy_price),
      sell_price: Number(formData.sell_price),
      category: formData.category,
      supplier_id: formData.supplier_id || null
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-2xl p-6 md:p-8 animate-in zoom-in-95 duration-200 transition-colors">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white mb-6">Edit Product</h2>
        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-12 gap-4">
          <div className="md:col-span-12">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Product Name</label>
            <input 
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
            />
          </div>

          <div className="md:col-span-6 flex flex-col justify-end">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Supplier</label>
            <select 
              value={formData.supplier_id}
              onChange={e => setFormData({ ...formData, supplier_id: e.target.value })}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 appearance-none transition-all"
            >
              <option value="">No Supplier</option>
              {suppliers.map((s: any) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div className="md:col-span-6 flex flex-col justify-end">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Category</label>
            <input 
              type="text" 
              value={formData.category}
              onChange={e => setFormData({ ...formData, category: e.target.value })}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
            />
          </div>

          <div className="md:col-span-12 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Precio de Compra</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={formData.buy_price}
                onChange={e => handleBuyPriceChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Margen %</label>
              <input 
                type="number" 
                step="0.01"
                value={formData.markup_percentage}
                onChange={e => handleMarkupChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Precio Final</label>
              <input 
                type="number" 
                step="0.01"
                required
                value={formData.sell_price}
                onChange={e => handleSellPriceChange(e.target.value)}
                className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-all"
              />
            </div>
          </div>
          
          <div className="md:col-span-12 flex gap-3 pt-6">
            <button 
              type="button"
              onClick={() => setShowDeleteConfirm(true)}
              className="px-4 h-10 rounded-lg font-medium text-red-500 hover:bg-red-500/10 border border-red-500/20 transition-colors"
            >
              Eliminar
            </button>
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 h-10 rounded-xl font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <HoverButton
              type="submit"
              disabled={updateProductMutation.isPending}
              className="flex-1"
              glowColor="#6366f1"
              backgroundColor="#0f172a"
            >
              {updateProductMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Save Changes
            </HoverButton>
          </div>
        </form>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md rounded-2xl p-6 text-center animate-in fade-in duration-200">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Eliminar Producto</h3>
            <p className="text-slate-400 mb-8 max-w-sm">¿Estás seguro? Esta acción no se puede deshacer y el producto desaparecerá del inventario.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button 
                onClick={() => deleteProductMutation.mutate()}
                disabled={deleteProductMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-red-600 text-slate-950 dark:text-white hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50"
              >
                {deleteProductMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Sí, Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
