import { useState, useEffect } from 'react';
import { readBinaryFile } from '@tauri-apps/api/fs';
import * as xlsx from 'xlsx';
import { Loader2, Table as TableIcon } from 'lucide-react';

interface ExcelPreviewerProps {
  filePath: string;
}

export default function ExcelPreviewer({ filePath }: ExcelPreviewerProps) {
  const [workbook, setWorkbook] = useState<xlsx.WorkBook | null>(null);
  const [activeSheet, setActiveSheet] = useState<string>('');
  const [htmlTable, setHtmlTable] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    const loadExcel = async () => {
      try {
        const buffer = await readBinaryFile(filePath);
        const wb = xlsx.read(buffer, { type: 'buffer' });
        
        if (isMounted) {
          setWorkbook(wb);
          if (wb.SheetNames.length > 0) {
            setActiveSheet(wb.SheetNames[0]);
            renderSheet(wb, wb.SheetNames[0]);
          }
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(err.message || 'Failed to render Spreadsheet');
          setLoading(false);
        }
      }
    };

    loadExcel();
    return () => { isMounted = false; };
  }, [filePath]);

  const renderSheet = (wb: xlsx.WorkBook, sheetName: string) => {
    const ws = wb.Sheets[sheetName];
    // Convert sheet to HTML string with custom classes for styling
    const html = xlsx.utils.sheet_to_html(ws, { id: 'excel-table' });
    setHtmlTable(html);
  };

  const handleSheetChange = (sheet: string) => {
    setActiveSheet(sheet);
    if (workbook) renderSheet(workbook, sheet);
  };

  return (
    <div className="flex flex-col h-full bg-zinc-950 text-zinc-300">
      <div className="flex items-center justify-between p-2 bg-zinc-900 border-b border-border-dark shrink-0">
        <div className="flex items-center gap-2 text-zinc-400">
          <TableIcon size={14} />
          <span className="text-xs font-semibold uppercase tracking-widest">Spreadsheet</span>
        </div>
      </div>

      {workbook && (
        <div className="flex items-center gap-1 overflow-x-auto bg-zinc-900 px-2 pt-2 border-b border-border-dark shrink-0">
          {workbook.SheetNames.map(name => (
            <button
              key={name}
              onClick={() => handleSheetChange(name)}
              className={`px-4 py-1.5 text-xs font-semibold rounded-t-lg transition-colors ${activeSheet === name ? 'bg-zinc-800 text-emerald-400 border-t-2 border-t-emerald-500' : 'text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800/50'}`}
            >
              {name}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-auto bg-zinc-950 relative">
        {loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-zinc-500">
            <Loader2 className="h-8 w-8 animate-spin mb-4" />
            <p className="text-xs">Parsing Spreadsheet...</p>
          </div>
        )}

        {error && !loading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400">
            <p className="text-sm font-bold mb-2">Error Loading Spreadsheet</p>
            <p className="text-xs">{error}</p>
          </div>
        )}

        {!loading && !error && htmlTable && (
          <div 
            className="p-4 excel-preview-content min-w-max"
            dangerouslySetInnerHTML={{ __html: htmlTable }}
          />
        )}
      </div>
    </div>
  );
}
