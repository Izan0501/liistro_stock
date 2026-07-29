import { X, Printer } from 'lucide-react';

export default function ReceiptModal({ sale, onClose }: { sale: any, onClose: () => void }) {
  if (!sale) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (val: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(val);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-AR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  };

  const clientName = sale.client?.name || sale.client_name || 'Desconocido';
  const saleDate = sale.sale_date || sale.created_at || new Date().toISOString();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm z-40"
        onClick={onClose}
      ></div>
      
      {/* Modal Container */}
      <div className="relative bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_20px_50px_rgb(0,0,0,0.1)] dark:shadow-2xl w-full max-w-lg transition-colors overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh] z-50 opacity-100">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <h3 className="text-lg font-bold text-slate-950 dark:text-white tracking-tight">Receipt / Recibo</h3>
          <button 
            onClick={onClose}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-950 dark:text-white rounded-lg hover:bg-slate-50 dark:hover:bg-slate-100 dark:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Content */}
        <div className="flex-1 overflow-y-auto scrollbar-hide">
          <div className="p-6 bg-white dark:bg-slate-900/80 font-mono text-sm print:bg-white print:text-black text-slate-950 dark:text-slate-300">
            {/* Header / Logo Area */}
            <div className="text-center mb-6 border-b border-dashed border-slate-300 dark:border-white/20 pb-6 print:border-black/20">
              <h2 className="text-xl font-black tracking-widest uppercase mb-1">LIISTRO STOCK</h2>
              <p className="text-slate-500 dark:text-slate-400 text-xs print:text-gray-600">Comprobante de Venta</p>
            </div>

            <div className="space-y-2 mb-6 text-slate-500 dark:text-slate-400 print:text-gray-800">
              <div className="flex justify-between">
                <span>Nº ORDEN:</span>
                <span className="text-slate-950 dark:text-white print:text-black font-medium">{sale.id?.split('-')[0].toUpperCase()}</span>
              </div>
              <div className="flex justify-between">
                <span>FECHA:</span>
                <span className="text-slate-950 dark:text-white print:text-black font-medium">{formatDate(saleDate)}</span>
              </div>
              <div className="flex justify-between">
                <span>CLIENTE:</span>
                <span className="text-slate-950 dark:text-white print:text-black font-medium">{clientName}</span>
              </div>
            </div>

            <div className="mb-4">
              <div className="grid grid-cols-12 gap-2 text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-white/10 pb-2 mb-2 font-bold text-xs print:border-black/20 print:text-gray-800">
                <div className="col-span-6">CANT x DESC</div>
                <div className="col-span-3 text-right">PRECIO</div>
                <div className="col-span-3 text-right">SUBT</div>
              </div>
              
              <div className="space-y-3">
                {sale.items?.map((item: any, idx: number) => {
                  const productName = item.product?.name || item.product_name || `Producto #${item.product_id?.split('-')[0]}`;
                  const qty = item.quantity;
                  const price = Number(item.unit_price);
                  const subtotal = Number(item.subtotal || (qty * price));
                  
                  return (
                    <div key={idx} className="grid grid-cols-12 gap-2 text-slate-950 dark:text-white print:text-black">
                      <div className="col-span-6 pr-2 leading-tight">
                        <span className="text-slate-500 dark:text-slate-400 print:text-gray-600">{qty}x</span> {productName}
                      </div>
                      <div className="col-span-3 text-right text-slate-500 dark:text-slate-400 print:text-gray-600">
                        ${price}
                      </div>
                      <div className="col-span-3 text-right font-medium">
                        ${subtotal}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="border-t border-dashed border-slate-300 dark:border-slate-700 my-4" />
            <div className="flex justify-between items-center text-lg font-black text-slate-950 dark:text-white print:text-black">
              <span>TOTAL</span>
              <span>{formatCurrency(Number(sale.total_amount || 0))}</span>
            </div>
          
            <div className="text-center mt-8 text-xs text-slate-500 dark:text-slate-400 print:text-gray-500">
              <p>¡Gracias por su compra!</p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-800 flex gap-3 print:hidden">
          <button 
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl font-medium border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            Cerrar
          </button>
          <button 
            onClick={handlePrint}
            className="flex-1 flex justify-center items-center gap-2 py-2.5 rounded-lg font-bold text-slate-950 bg-white hover:bg-slate-100 dark:hover:bg-slate-200 transition-colors"
          >
            <Printer className="w-4 h-4" /> Imprimir
          </button>
        </div>

        {/* CSS to print only the modal content */}
        <style dangerouslySetInnerHTML={{__html: `
          @media print {
            body * {
              visibility: hidden;
            }
            .print\\:bg-white {
              background-color: white !important;
            }
            .print\\:text-black {
              color: black !important;
            }
            .print\\:text-gray-800 {
              color: #1f2937 !important;
            }
            .print\\:text-gray-600 {
              color: #4b5563 !important;
            }
            .print\\:border-black\\/20 {
              border-color: rgba(0,0,0,0.2) !important;
            }
            .print\\:hidden {
              display: none !important;
            }
            .z-50 {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              transform: none !important;
              box-shadow: none !important;
              background: white !important;
            }
            .z-50 * {
              visibility: visible;
            }
          }
        `}} />
      </div>
    </div>
  );
}
