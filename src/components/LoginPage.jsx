import { useState } from 'react';
import { api } from '../lib/api.js';

export default function LoginPage({ onLogin }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const user = await api.login(name, password);
      onLogin(user);
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#030508] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <div className="w-16 h-16 bg-gradient-to-br from-zinc-700 to-zinc-900 rounded-2xl flex items-center justify-center shadow-lg shadow-black/40 border border-white/10 mx-auto mb-6">
            <span className="text-white font-black italic text-3xl">L</span>
          </div>
          <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter">
            Liberty <span className="text-zinc-400">Command</span>
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-emerald-500/80">HIFA Launch Active</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-bold text-center">
              {error}
            </div>
          )}

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter your name"
              required
              autoFocus
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2 block">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              required
              className="w-full bg-white/5 border border-white/10 p-4 rounded-xl text-sm text-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 outline-none transition-all placeholder:text-zinc-700"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-900/40 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Authenticating...' : 'Sign In'}
          </button>
        </form>
      </div>
    </div>
  );
}
