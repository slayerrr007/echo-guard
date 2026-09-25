import React, { useState } from 'react';
import { useAppContext } from '../lib/dataContext';
import { Download, ChevronLeft, ChevronRight, Search } from 'lucide-react';
import { cn } from '../lib/utils';

export function Dataset() {
  const { dataset } = useAppContext();
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  
  if (!dataset) return null;

  const rowsPerPage = 15;
  const filteredIndices = dataset.labels
    .map((l, idx) => ({ label: l, idx }))
    .filter(({ label }) => label.toLowerCase().includes(searchTerm.toLowerCase()));

  const totalPages = Math.ceil(filteredIndices.length / rowsPerPage);
  const paginatedIndices = filteredIndices.slice(page * rowsPerPage, (page + 1) * rowsPerPage);

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
          <p className="text-slate-500 dark:text-slate-400 mt-1">Browse, search, and download the UCI Sonar dataset.</p>
        </div>
        
        <button 
          onClick={handleDownload}
          className="px-6 py-2 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-sm hover:opacity-90 transition-opacity flex items-center space-x-2"
        >
          <Download size={16} />
          <span>Download CSV</span>
        </button>
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
              {paginatedIndices.map(({ label, idx }) => (
                <tr key={idx} className="hover:bg-white/5 transition-colors">
                  <td className="px-6 py-3 font-medium text-slate-300">#{idx + 1}</td>
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
              ))}
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
            className="p-2 rounded-full border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-colors text-slate-300"
          >
            <ChevronLeft size={16} />
          </button>
          <button 
            onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-full border border-white/10 disabled:opacity-50 hover:bg-white/10 transition-colors text-slate-300"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
