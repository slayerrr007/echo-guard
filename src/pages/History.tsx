import React, { useEffect, useState } from 'react';
import { Download, Trash2, History as HistoryIcon } from 'lucide-react';

interface HistoryItem {
  timestamp: string;
  result: string;
  confidence: number;
  inputs: number[];
}

export function History() {
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    const data = localStorage.getItem('predictHistory');
    if (data) {
      setHistory(JSON.parse(data).reverse()); // newest first
    }
  }, []);

  const clearHistory = () => {
    if (confirm('Are you sure you want to clear all prediction history?')) {
      localStorage.removeItem('predictHistory');
      setHistory([]);
    }
  };

  const exportCSV = () => {
    if (history.length === 0) return;
    
    // Create CSV header
    const headers = ['Timestamp', 'Prediction', 'Confidence'];
    for(let i=1; i<=60; i++) headers.push(`F${i}`);
    
    const rows = history.map(item => [
      new Date(item.timestamp).toLocaleString(),
      item.result,
      item.confidence.toFixed(4),
      ...item.inputs
    ]);
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `echo_guard_history_${Date.now()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <header className="flex flex-col">
          <span className="text-sm text-slate-500">Logs</span>
          <h2 className="text-2xl font-bold text-white tracking-tight">Prediction History</h2>
        </header>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCSV}
            disabled={history.length === 0}
            className="px-4 py-2 bg-black/40 hover:bg-white/5 text-white rounded-full font-medium transition-colors flex items-center gap-2 disabled:opacity-50 border border-white/10"
          >
            <Download size={16} />
            Export CSV
          </button>
          <button 
            onClick={clearHistory}
            disabled={history.length === 0}
            className="p-2 text-cyan-400 hover:bg-cyan-500/10 rounded-full transition-colors disabled:opacity-50"
            title="Clear History"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <div className="bg-black/40 backdrop-blur-md rounded-3xl border border-white/10 flex-1 overflow-hidden flex flex-col">
        {history.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 text-slate-500 space-y-4 py-20">
            <HistoryIcon className="w-16 h-16 opacity-20" />
            <p>No predictions run yet.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-[10px] text-slate-400 uppercase tracking-wider bg-black/40 border-b border-white/10">
                <tr>
                  <th className="px-6 py-4 font-bold">Date & Time</th>
                  <th className="px-6 py-4 font-bold">Result</th>
                  <th className="px-6 py-4 font-bold">Confidence</th>
                  <th className="px-6 py-4 font-bold">F1-F3 Preview</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {history.map((item, idx) => (
                  <tr key={idx} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 text-slate-300">
                      {new Date(item.timestamp).toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                        item.result === 'ROCK' 
                          ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                          : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
                      }`}>
                        {item.result}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {(item.confidence * 100).toFixed(1)}%
                    </td>
                    <td className="px-6 py-4 text-slate-500 tabular-nums">
                      [{item.inputs[0].toFixed(3)}, {item.inputs[1].toFixed(3)}, {item.inputs[2].toFixed(3)}...]
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
