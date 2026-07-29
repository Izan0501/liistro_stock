import { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ProductGrid, ProductTable, InventoryHeader, InventoryFilters, EditProductModalWrapper } from './InventoryComponents';
import { RestockModalWrapper, NewProductModalWrapper } from './InventoryModals';
import { Plus, Search, Loader2, ArrowUpDown, PackagePlus, LayoutGrid, List, PackageCheck, FileSpreadsheet } from 'lucide-react';
import { cn } from '../lib/utils';
import { useProducts, useSuppliers } from '../hooks/useData';
import { HoverButton } from '../components/ui/HoverButton';
import EditProductModal from '../components/Inventory/EditProductModal';
import { toast } from 'sonner';
import { exportInventoryToExcel } from '../utils/exportToExcel';
import { useMediaQuery } from '../hooks/useMediaQuery';

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
  const [restockProductId, setRestockProductId] = useState<string | null>(null);

  const { data: products, isLoading, isError } = useProducts();
  const { data: suppliers } = useSuppliers();
  const isMobile = useMediaQuery('(max-width: 767px)');

  const productList = useMemo(() => Array.isArray(products) ? products : (products?.items || []), [products]);
  const supplierList = useMemo(() => Array.isArray(suppliers) ? suppliers : (suppliers?.items || []), [suppliers]);
  const uniqueCategories: string[] = Array.from(
    new Set(
      productList.reduce((acc: string[], p: any) => {
        if (p.category && p.category.toLowerCase() !== 'general') {
          acc.push(p.category);
        }
        return acc;
      }, [])
    )
  ).sort() as string[];

  const filtered = productList.filter((p: any) => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  // ── Deep-link: ?restock=<productId> opens the Restock modal pre-filled ────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const restockId = params.get('restock');
    if (!restockId || productList.length === 0) return;

    const target = productList.find((p: any) => p.id === restockId);
    if (target) {
      setRestockProductId(restockId);
      setIsRestockModalOpen(true);
      // Clear the URL param silently so refresh doesn't re-trigger
      navigate('/inventory', { replace: true });
    }
  }, [location.search, productList, navigate]);


  return (
    <div className="p-4 md:p-8 space-y-6">


      <InventoryHeader 
        filtered={filtered} 
        viewMode={viewMode} 
        setViewMode={setViewMode} 
        setIsRestockModalOpen={setIsRestockModalOpen} 
        setIsNewProductModalOpen={setIsNewProductModalOpen} 
        exportInventoryToExcel={exportInventoryToExcel} 
        products={products} 
        ArrowUpDown={ArrowUpDown} 
        PackagePlus={PackagePlus} 
        Plus={Plus} 
        FileSpreadsheet={FileSpreadsheet} 
        LayoutGrid={LayoutGrid} 
        List={List} 
        HoverButton={HoverButton} 
        cn={cn} 
      />

      <InventoryFilters 
        searchTerm={searchTerm} 
        setSearchTerm={setSearchTerm} 
        setSelectedCategory={setSelectedCategory} 
        uniqueCategories={uniqueCategories} 
        selectedCategory={selectedCategory} 
        Search={Search} 
        cn={cn} 
      />

      {/* Product Grid */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
        </div>
      )}

      {isError && (
        <div className="text-center py-20 text-red-400">Error loading products.</div>
      )}

      {!isLoading && !isError && (
        isMobile ? (
          <ProductGrid 
            filtered={filtered} 
            setSelectedEditProduct={setSelectedEditProduct} 
          />
        ) : viewMode === 'table' ? (
          <ProductTable 
            filtered={filtered} 
            setSelectedEditProduct={setSelectedEditProduct} 
          />
        ) : (
          <ProductGrid 
            filtered={filtered} 
            setSelectedEditProduct={setSelectedEditProduct} 
          />
        )
      )}

      <RestockModalWrapper
        isOpen={isRestockModalOpen}
        onClose={() => setIsRestockModalOpen(false)}
        productList={productList}
        supplierList={supplierList}
        initialProductId={restockProductId}
      />

      <NewProductModalWrapper
        isOpen={isNewProductModalOpen}
        onClose={() => setIsNewProductModalOpen(false)}
        supplierList={supplierList}
        uniqueCategories={uniqueCategories}
      />

      <EditProductModalWrapper
        selectedEditProduct={selectedEditProduct}
        supplierList={supplierList}
        setSelectedEditProduct={setSelectedEditProduct}
        toast={toast}
        PackageCheck={PackageCheck}
        EditProductModal={EditProductModal}
      />
    </div>
  );
}



