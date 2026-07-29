import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';

export const exportInventoryToExcel = async (data: any) => {
  const products = Array.isArray(data) ? data : (data?.items || []);
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'LiistroStock System';
  const sheet = workbook.addWorksheet('Reporte de Inventario', {
    views: [{ showGridLines: false }]
  });

  // 1. Corporate Master Title
  sheet.mergeCells('A1:E1');
  const titleCell = sheet.getCell('A1');
  titleCell.value = 'L I I S T R O  S T O C K   —   REPORTE DE INVENTARIO';
  titleCell.font = { name: 'Inter', size: 16, bold: true, color: { argb: 'FFFFFFFF' }, letterSpacing: 2 } as any;
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0F172A' } }; // Slate 950
  titleCell.alignment = { vertical: 'middle', horizontal: 'center' };
  sheet.getRow(1).height = 35;

  // 2. Subtitle with Date
  sheet.mergeCells('A2:E2');
  const subTitleCell = sheet.getCell('A2');
  subTitleCell.value = `Generado el: ${new Date().toLocaleString('es-AR')}`;
  subTitleCell.font = { name: 'Inter', size: 10, italic: true, color: { argb: 'FF64748B' } }; // Slate 500
  subTitleCell.alignment = { vertical: 'middle', horizontal: 'right' };
  sheet.getRow(2).height = 20;

  // 3. Table Headers
  const headerRow = sheet.addRow(['CÓDIGO / ID', 'PRODUCTO', 'CATEGORÍA', 'PRECIO', 'STOCK']);
  headerRow.height = 30;
  headerRow.eachCell((cell) => {
    cell.font = { name: 'Inter', size: 11, bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } }; // Indigo 600
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'medium', color: { argb: 'FF3730A3' } },
      bottom: { style: 'medium', color: { argb: 'FF3730A3' } }
    };
  });

  // 4. Inject Data Rows with Zebra Striping & Breathing Room
  products.forEach((product: any, index: number) => {
    const price = Number(product.sell_price ?? product.sellPrice ?? 0);
    const stock = Number(product.available_quantity ?? product.stock ?? 0);
    
    const row = sheet.addRow([
      product.id || '-',
      product.name || 'Sin Nombre',
      product.category || 'General',
      price,
      stock
    ]);
    
    row.height = 24; // Breathing room for data
    const isEven = index % 2 === 0;

    row.eachCell((cell, colNumber) => {
      cell.font = { name: 'Inter', size: 10, color: { argb: 'FF0F172A' } };
      cell.alignment = { vertical: 'middle', horizontal: colNumber >= 4 ? 'center' : 'left' };
      
      // Zebra Striping Fill
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: isEven ? 'FFF8FAFC' : 'FFFFFFFF' } // Slate 50 vs White
      };

      // Subtle borders
      cell.border = {
        left: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        right: { style: 'thin', color: { argb: 'FFF1F5F9' } },
        bottom: { style: 'thin', color: { argb: 'FFF1F5F9' } }
      };
      
      // Format Price (Accounting style)
      if (colNumber === 4) cell.numFmt = '"$"#,##0.00_-';
      
      // Format Stock with strict Conditional Colors
      if (colNumber === 5) {
        cell.font = { bold: true, color: { argb: stock <= 10 ? 'FFDC2626' : 'FF059669' } };
      }
    });
  });

  // 5. Expand Column Widths Drastically
  sheet.columns = [
    { width: 40 }, // ID (Ensures UUIDs never cut off)
    { width: 45 }, // Product Name
    { width: 25 }, // Category
    { width: 18 }, // Price
    { width: 15 }  // Stock
  ];

  // 6. Generate File
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Inventario_LiistroStock_${new Date().toISOString().split('T')[0]}.xlsx`);
};
