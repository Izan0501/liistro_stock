import { ArrowUpDown, Pencil } from 'lucide-react';
import { cn } from '../lib/utils';

export function ProductGrid({ filtered, setSelectedEditProduct }: any) {
  return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filtered.map((product: any) => (
            <button
              type="button"
              key={product.id}
              onClick={() => setSelectedEditProduct(product)}
              className="text-left w-full block group bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl p-5 hover:border-indigo-200 dark:hover:border-slate-700 transition-colors transition-shadow duration-200 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/80 shadow-[0_4px_20px_rgb(0,0,0,0.03)] dark:shadow-none"
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
            </button>
          ))}
        </div>
  );
}

export function ProductTable({ filtered, setSelectedEditProduct }: any) {
  return (
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
            <button
              type="button"
              key={product.id}
              onClick={() => setSelectedEditProduct(product)}
              className={cn(
                'text-left w-full group grid grid-cols-12 gap-4 px-4 py-3.5 items-center cursor-pointer transition-colors duration-150 bg-white dark:bg-transparent',
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
            </button>
          ))}
        </div>
  );
}

export function InventoryHeader({ filtered, viewMode, setViewMode, setIsRestockModalOpen, setIsNewProductModalOpen, exportInventoryToExcel, products, PackagePlus, Plus, FileSpreadsheet, LayoutGrid, List, HoverButton, cn }: any) {
  return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white tracking-tight">Inventario</h1>
          <p className="text-slate-400 text-sm mt-1">{filtered.length} productos en stock</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 gap-1">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={cn(
                'p-1.5 rounded-lg transition-colors transition-shadow duration-200',
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700 dark:text-slate-400'
              )}
              title="Vista tabla"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={cn(
                'p-1.5 rounded-lg transition-colors transition-shadow duration-200',
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
            type="button"
            onClick={() => exportInventoryToExcel(products)}
            className="group relative flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-colors transition-transform transition-shadow duration-300 overflow-hidden shadow-sm bg-white dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/50 hover:border-emerald-300 dark:hover:border-emerald-800 hover:shadow-[0_8px_20px_rgba(16,185,129,0.12)] dark:hover:shadow-none active:scale-95 flex-1 sm:flex-none"
            title="Exportar a Excel"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-400/0 via-emerald-400/10 to-emerald-400/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
            <FileSpreadsheet className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" strokeWidth={2.5}/>
            <span className="hidden sm:inline-block">Exportar</span>
          </button>
        </div>
      </div>
  );
}

export function InventoryFilters({ searchTerm, setSearchTerm, setSelectedCategory, uniqueCategories, selectedCategory, Search, cn }: any) {
  return (
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            aria-label="Buscar productos"
            placeholder="Buscar productos..."
            value={searchTerm}
            onChange={(e: any) => setSearchTerm(e.target.value)}
            className="w-full h-10 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700 rounded-xl pl-10 pr-4 text-sm text-slate-950 dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 dark:focus:border-indigo-500 transition-colors transition-shadow shadow-sm"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto scrollbar-none snap-x items-center">
          <button
            type="button"
            onClick={() => setSelectedCategory('All')}
            className={cn("px-4 h-10 rounded-xl whitespace-nowrap text-sm font-medium transition-colors transition-shadow snap-start", selectedCategory === 'All' ? "bg-indigo-600 text-white shadow-md border border-transparent" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm")}
          >
            Todas
          </button>
          {uniqueCategories.map((cat: any) => (
            <button
              type="button"
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={cn("px-4 h-10 rounded-xl whitespace-nowrap text-sm font-medium transition-colors transition-shadow snap-start", selectedCategory === cat ? "bg-indigo-600 text-white shadow-md border border-transparent" : "bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-white shadow-sm")}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
  );
}

export function EditProductModalWrapper({ selectedEditProduct, supplierList, setSelectedEditProduct, toast, PackageCheck, EditProductModal }: any) {
  if (!selectedEditProduct) return null;
  return (
    <EditProductModal
      product={selectedEditProduct}
      suppliers={supplierList}
      onClose={() => setSelectedEditProduct(null)}
      onSuccess={(action: string) => {
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
  );
}
