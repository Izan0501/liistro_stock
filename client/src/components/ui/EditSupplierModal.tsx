import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';
import { HoverButton } from './HoverButton';

interface EditSupplierModalProps {
  supplier: any;
  onClose: () => void;
  onSuccess: (action?: 'edit' | 'delete') => void;
}

export default function EditSupplierModal({ supplier, onClose, onSuccess }: EditSupplierModalProps) {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        name: supplier.name || '',
        email: supplier.email || supplier.contact_email || '',
        phone: supplier.phone || supplier.contact_phone || ''
      });
    }
  }, [supplier]);

  const queryClient = useQueryClient();

  const updateSupplierMutation = useMutation({
    mutationFn: async (payload: any) => {
      const { data } = await api.patch(`/suppliers/${supplier.id}`, payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      onSuccess('edit');
    }
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/suppliers/${supplier.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardMetrics'] });
      queryClient.invalidateQueries({ queryKey: ['recentActivity'] });
      onSuccess('delete');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateSupplierMutation.mutate({
      name: formData.name,
      email: formData.email,
      phone: formData.phone,
      contact_email: formData.email, // fallback
      contact_phone: formData.phone // fallback
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-md p-6 md:p-8 animate-in zoom-in-95 duration-200 transition-colors">
        <h2 className="text-2xl font-semibold tracking-tight text-slate-950 dark:text-white mb-6">Edit Supplier</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="supplier-name" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Name</label>
            <input 
              id="supplier-name"
              type="text" 
              required
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="supplier-email" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Contact Email</label>
            <input 
              id="supplier-email"
              type="email" 
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-colors"
            />
          </div>
          <div>
            <label htmlFor="supplier-phone" className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1.5 block">Contact Phone</label>
            <input 
              id="supplier-phone"
              type="text" 
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              className="w-full bg-white dark:bg-slate-900/50 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-600/20 transition-colors"
            />
          </div>
          
          <div className="flex gap-3 pt-6">
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
              disabled={updateSupplierMutation.isPending}
              className="flex-1"
              glowColor="#6366f1"
              backgroundColor="#0f172a"
            >
              {updateSupplierMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Guardar Cambios
            </HoverButton>
          </div>
        </form>

        {showDeleteConfirm && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-slate-950/95 backdrop-blur-md rounded-2xl p-6 text-center animate-in fade-in transition-opacity duration-200">
            <h3 className="text-xl font-bold text-slate-950 dark:text-white mb-2">Eliminar Proveedor</h3>
            <p className="text-slate-400 mb-8 max-w-sm">¿Estás seguro? Esta acción no se puede deshacer y el proveedor desaparecerá del directorio.</p>
            <div className="flex gap-4 w-full max-w-xs">
              <button type="button" 
                onClick={() => setShowDeleteConfirm(false)}
                className="flex-1 py-2.5 rounded-xl font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
              >
                Cancelar
              </button>
              <button type="button" 
                onClick={() => deleteSupplierMutation.mutate()}
                disabled={deleteSupplierMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg font-bold bg-red-600 text-slate-950 dark:text-white hover:bg-red-500 transition-colors shadow-[0_0_15px_rgba(220,38,38,0.4)] disabled:opacity-50"
              >
                {deleteSupplierMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Sí, Eliminar
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
