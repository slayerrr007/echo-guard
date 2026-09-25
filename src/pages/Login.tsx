import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    navigate('/');
  };

  return (
    <div className="flex-1 flex items-center justify-center p-4 w-full min-h-[80vh]">
      <div className="w-full max-w-md bg-black/40 backdrop-blur-md border border-white/10 p-8 rounded-3xl shadow-2xl">
        <div className="flex flex-col items-center mb-8 space-y-3">
          <div className="w-12 h-12 bg-gradient-to-br from-green-400/20 to-cyan-400/20 rounded-full flex items-center justify-center">
            <Lock className="w-6 h-6 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Operator Login</h1>
          <p className="text-slate-400 text-sm text-center">Enter your credentials to access the Echo-Guard network.</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-3 text-white focus:border-b-green-400 focus:ring-0 focus:outline-none placeholder-slate-600 transition-colors rounded-t-lg"
              placeholder="OP-ID-774"
              required
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/50 border-b-2 border-white/10 border-x-transparent border-t-transparent px-4 py-3 text-white focus:border-b-green-400 focus:ring-0 focus:outline-none placeholder-slate-600 transition-colors rounded-t-lg"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            className="w-full py-4 mt-4 rounded-full bg-gradient-to-r from-green-400 to-cyan-400 text-black font-bold text-lg hover:opacity-90 transition-opacity shadow-[0_0_15px_rgba(74,222,128,0.3)]"
          >
            Authenticate
          </button>
        </form>
      </div>
    </div>
  );
}
