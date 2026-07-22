import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Loader2 } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('rodrigo@liistro.com');
  const [password, setPassword] = useState('admin123'); // Reasonable default for easy testing
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Backend expects JSON according to OpenAPI schema
      const payload = {
        email: email,
        password: password
      };
      
      const response = await api.post('/auth/login', payload);
      
      const { access_token } = response.data;
      
      // Since the backend might return User info, we can optionally map it, but for now fallback if missing
      const user = response.data.user || {
        id: 1,
        email,
        name: 'Rodrigo Liistro',
        role: 'Admin'
      };
      
      login(access_token, user);
    } catch (err: any) {
      console.error(err);
      
      // Safely extract error message (FastAPI 422 returns an array in detail)
      const detail = err.response?.data?.detail;
      let errorMessage = 'Failed to login. Check your credentials.';
      
      if (typeof detail === 'string') {
        errorMessage = detail;
      } else if (Array.isArray(detail)) {
        errorMessage = detail.map((d: any) => d.msg).join(', ');
      } else if (detail) {
        errorMessage = JSON.stringify(detail);
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-obsidian">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-xl bg-accent-indigo flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4 shadow-[0_0_20px_rgba(99,102,241,0.4)]">
            L
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-text-secondary mt-2">Log in to manage your stock & sales</p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <form onSubmit={handleLogin} className="space-y-4">
            {error && (
              <div className="bg-accent-red/10 text-accent-red px-4 py-3 rounded-lg text-sm border border-accent-red/20">
                {error}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="rodrigo@liistro.com"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="text-sm font-medium text-text-secondary">Password</label>
                <a href="#" className="text-xs text-accent-indigo hover:underline">Forgot password?</a>
              </div>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:brightness-110 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Need to register your system? <Link to="/register" className="text-accent-indigo font-medium hover:underline">Create Admin Account</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
