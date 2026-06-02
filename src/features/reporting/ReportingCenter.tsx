import React, { useEffect, useState } from 'react';
import { useWorkspaceStore } from '../../store/workspaceStore';
import { FileText, Database, HardDrive } from 'lucide-react';
import { invoke } from '@tauri-apps/api/tauri';

export default function ReportingCenterView() {
  const { activeWorkspaceId, reportingStats, loadReportingStats } = useWorkspaceStore();
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    if (activeWorkspaceId) {
      loadReportingStats();
    }
  }, [activeWorkspaceId]);

  if (!reportingStats) {
    return <div className="p-8 text-zinc-400">Loading reporting metrics...</div>;
  }

  // Export functions
  const handleExport = async (format: string) => {
    setIsExporting(true);
    try {
      if (typeof window !== 'undefined' && (window as any).__TAURI_METADATA__) {
        await invoke('export_report', { workspaceId: activeWorkspaceId, format });
        alert(`Successfully exported as ${format.toUpperCase()}`);
      } else {
        alert(`Mock Export: Saved report as ${format.toUpperCase()}`);
      }
    } catch (e) {
      console.error(e);
      alert('Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  // Build pie chart
  const categories = Object.entries(reportingStats.category_distribution);
  const totalCat = categories.reduce((acc, [_, count]) => acc + count, 0) || 1;
  let currentAngle = 0;
  const piePaths = categories.map(([name, count], i) => {
    const sliceAngle = (count / totalCat) * 360;
    // ensure no 360 slice drawing bug
    const effectiveAngle = sliceAngle === 360 ? 359.99 : sliceAngle; 
    const startAngle = currentAngle;
    const endAngle = currentAngle + effectiveAngle;
    currentAngle = endAngle;

    const x1 = 50 + 50 * Math.cos((Math.PI * startAngle) / 180);
    const y1 = 50 + 50 * Math.sin((Math.PI * startAngle) / 180);
    const x2 = 50 + 50 * Math.cos((Math.PI * endAngle) / 180);
    const y2 = 50 + 50 * Math.sin((Math.PI * endAngle) / 180);

    const largeArcFlag = effectiveAngle > 180 ? 1 : 0;
    const pathData = [
      `M 50 50`,
      `L ${x1} ${y1}`,
      `A 50 50 0 ${largeArcFlag} 1 ${x2} ${y2}`,
      `Z`
    ].join(' ');

    const colors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6'];
    return { name, count, path: pathData, color: colors[i % colors.length] };
  });

  return (
    <div className="p-8 h-full flex flex-col gap-6 text-zinc-200">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold font-display text-white">Reporting Center</h2>
          <p className="text-sm text-zinc-400 mt-1">Analytics and actionable intelligence for your documents.</p>
        </div>
        <div className="flex gap-2">
            <button onClick={() => handleExport('pdf')} disabled={isExporting} className="flex items-center gap-[6px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-[11px] font-semibold text-zinc-400 transition-all duration-200 hover:enabled:bg-white/10 hover:enabled:text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <FileText size={14} /> PDF
            </button>
            <button onClick={() => handleExport('xlsx')} disabled={isExporting} className="flex items-center gap-[6px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-[11px] font-semibold text-zinc-400 transition-all duration-200 hover:enabled:bg-white/10 hover:enabled:text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <Database size={14} /> XLSX
            </button>
            <button onClick={() => handleExport('csv')} disabled={isExporting} className="flex items-center gap-[6px] px-3 py-1.5 bg-white/5 border border-white/10 rounded-md text-[11px] font-semibold text-zinc-400 transition-all duration-200 hover:enabled:bg-white/10 hover:enabled:text-white disabled:opacity-50 disabled:cursor-not-allowed">
              <HardDrive size={14} /> CSV
            </button>
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard icon={<FileText />} label="Total Documents" value={reportingStats.total_files} />
        <StatCard icon={<HardDrive />} label="Data Footprint" value={(reportingStats.total_size_bytes / 1024 / 1024).toFixed(2) + ' MB'} />
        <StatCard icon={<Database />} label="Wasted Space" value={(reportingStats.wasted_size_bytes / 1024 / 1024).toFixed(2) + ' MB'} subtext={`${reportingStats.duplicate_count} duplicate groups`} />
      </div>

      <div className="grid grid-cols-2 gap-6 flex-1 min-h-0">
        {/* Category Chart */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-6 flex flex-col">
          <h3 className="text-sm font-semibold text-zinc-300 mb-6">Category Distribution</h3>
          <div className="flex flex-1 items-center gap-8">
            <svg viewBox="0 0 100 100" className="w-48 h-48 drop-shadow-xl transform -rotate-90">
              {piePaths.map((p, i) => (
                <path
                  key={i}
                  d={p.path}
                  fill={p.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer stroke-zinc-900 stroke-[0.5]"
                />
              ))}
            </svg>
            <div className="flex flex-col gap-2">
              {piePaths.map((p, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: p.color }}></div>
                  <span className="text-zinc-400 w-24 truncate">{p.name}</span>
                  <span className="font-semibold">{p.count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      
    </div>
  );
}

function StatCard({ icon, label, value, subtext }: { icon: React.ReactNode, label: string, value: string | number, subtext?: string }) {
  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-lg p-5 flex flex-col gap-2">
      <div className="flex items-center gap-2 text-zinc-500">
        <div className="[&>svg]:w-4 [&>svg]:h-4">{icon}</div>
        <span className="text-xs font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-2xl font-bold font-mono text-zinc-100">{value}</div>
      {subtext && <div className="text-xs text-zinc-500 font-medium">{subtext}</div>}
    </div>
  );
}
