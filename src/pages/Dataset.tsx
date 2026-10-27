import React, { useState } from 'react';
import { useAppContext } from '../lib/dataContext';
import { Download, ChevronLeft, ChevronRight, Search, Box } from 'lucide-react';
import { cn } from '../lib/utils';
import { SignalFeature3D } from '../components/three/SignalFeature3D';

export function Dataset() {
  const { dataset } = useAppContext();
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSampleIdx, setSelectedSampleIdx] = useState<number>(0);
  const [selectedBinIdx, setSelectedBinIdx] = useState<number | null>(null);
  
  if (!dataset) return null;

  const rowsPerPage = 15;
  const filteredIndices = dataset.labels
    .map((l, idx) => ({ label: l, idx }))
    .filter(({ label }) => label.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredIndices.length / rowsPerPage);
  const paginatedIndices = filteredIndices.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

  const safeSampleIdx =
    selectedSampleIdx >= 0 && selectedSampleIdx < dataset.features.length
      ? selectedSampleIdx
      : 0;
  const activeSampleFeatures = dataset.features[safeSampleIdx] || [];
  const activeSampleLabel = dataset.labels[safeSampleIdx] === 'R' ? 'Rock (R)' : 'Mine (M)';

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = '/sonar.csv';
    link.download = 'sonar_dataset.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 flex flex-col h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Dataset Explorer</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Browse, search, and inspect the 60 real frequency features of the UCI Sonar dataset in 3D.
          </p>
        </div>
        
        <button 
          onClick={handleDownload}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center space-x-2 cursor-pointer"
        >
          <Download size={16} />
          <span>Download CSV</span>
        </button>
      </div>

      {/* 3D Signal Feature Visualization of Selected UCI Sonar Row */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-mono text-slate-300 px-1">
          <div className="flex items-center gap-2">
            <Box size={14} className="text-emerald-400" />
            <span>
              Inspecting Real Dataset Sample <strong className="text-emerald-400">#{safeSampleIdx + 1}</strong> · Ground Truth:{' '}
              <strong className="text-cyan-300">{activeSampleLabel}</strong>
            </span>
          </div>
          <span className="text-slate-400">
            Click any row in the table below to load its 60 sonar features into the 3D scene
          </span>
        </div>

        <SignalFeature3D
          features={activeSampleFeatures}
          selectedBinIndex={selectedBinIdx}
          onSelectBin={(idx) => setSelectedBinIdx(idx)}
          sourceLabel={`UCI Sonar Dataset Sample #${safeSampleIdx + 1}`}
          classLabel={activeSampleLabel}
          heightClass="h-[340px] sm:h-[370px]"
        />
      </div>

      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 flex flex-col flex-1 overflow-hidden">
        {/* Toolbar */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center bg-black/20">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={16} />
            <input 
              type="text" 
              placeholder="Filter by class (R or M)..." 
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setPage(0);
              }}
              className="pl-9 pr-4 py-2 bg-black/50 border border-white/10 rounded-full text-sm focus:outline-none focus:border-green-400 w-64 text-white placeholder-slate-600 transition-colors"
            />
          </div>
          
          <div className="text-sm text-slate-500">
            Showing {filteredIndices.length > 0 ? page * rowsPerPage + 1 : 0} - {Math.min((page + 1) * rowsPerPage, filteredIndices.length)} of {filteredIndices.length}
          </div>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-black/40 sticky top-0 border-b border-white/10">
              <tr>
                <th className="px-6 py-3 font-medium">Index</th>
                <th className="px-6 py-3 font-medium">Class</th>
                {Array.from({length: 10}).map((_, i) => (
                  <th key={i} className="px-6 py-3 font-medium">F{i+1}</th>
                ))}
                <th className="px-6 py-3 font-medium text-slate-400">... (+50 more)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {paginatedIndices.map(({ label, idx }) => {
                const isSelectedRow = idx === safeSampleIdx;
                return (
                  <tr
                    key={idx}
                    onClick={() => setSelectedSampleIdx(idx)}
                    className={cn(
                      "transition-colors cursor-pointer",
                      isSelectedRow
                        ? "bg-emerald-500/15 hover:bg-emerald-500/20"
                        : "hover:bg-white/5"
                    )}
                  >
                    <td className="px-6 py-3 font-medium text-slate-300 font-mono">
                      #{idx + 1} {isSelectedRow && <span className="text-[10px] text-emerald-400 ml-1">(3D Active)</span>}
                    </td>
                    <td className="px-6 py-3">
                      <span className={cn(
                        "px-2 py-0.5 rounded text-[10px] uppercase font-bold border",
                        label === 'R' ? "bg-green-500/10 text-green-400 border-green-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                      )}>
                        {label === 'R' ? 'Rock' : 'Mine'}
                      </span>
                    </td>
                    {dataset.features[idx].slice(0, 10).map((val, i) => (
                      <td key={i} className="px-6 py-3 text-slate-400 tabular-nums">
                        {val.toFixed(4)}
                      </td>
                    ))}
                    <td className="px-6 py-3 text-slate-500">...</td>
                  </tr>
                );
              })}
              {paginatedIndices.length === 0 && (
                <tr>
                  <td colSpan={13} className="px-6 py-8 text-center text-slate-500">
                    No records found matching your filter.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-white/10 flex justify-end space-x-2 bg-black/20">
          <button 
            onClick={() => setPage(p => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-full border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-colors text-slate-300 cursor-pointer"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-full border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-colors text-slate-300 cursor-pointer"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
