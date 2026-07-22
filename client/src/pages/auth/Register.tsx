import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Loader2 } from 'lucide-react';

export default function Register() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = {
        name,
        email,
        password,
        secret_key: secretKey // <-- Must be inside the JSON body object matching backend schema
      };
      
      const response = await api.post('/auth/register', payload);

      // The prompt states: "capture the returned access_token". 
      // If the backend returns access_token directly from register, use it.
      // If it doesn't, we might need to login immediately after. Let's check response.
      let token = response.data.access_token;
      
      if (!token) {
        // If register doesn't return token, we auto-login
        const loginRes = await api.post('/auth/login', { email, password });
        token = loginRes.data.access_token;
      }
      
      // Temporarily store token so the interceptor can inject it for /auth/me
      localStorage.setItem('access_token', token);
      
      const userResponse = await api.get('/auth/me');
      const user = userResponse.data;
      
      login(token, user);

    } catch (err: any) {
      console.error(err);
      
      const detail = err.response?.data?.detail;
      let errorMessage = 'Failed to register. Please try again.';
      
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
          <h1 className="text-3xl font-bold tracking-tight">System Initialization</h1>
          <p className="text-text-secondary mt-2">Register the Master Admin account</p>
        </div>

        <div className="glass-card p-6 md:p-8">
          <form onSubmit={handleRegister} className="space-y-4">
            {error && (
              <div className="bg-accent-red/10 text-accent-red px-4 py-3 rounded-lg text-sm border border-accent-red/20">
                {error}
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Full Name</label>
              <input 
                type="text" 
                required
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Name"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Email Address</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Password</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Secret Registration Key</label>
              <input 
                type="password" 
                required
                value={secretKey}
                onChange={e => setSecretKey(e.target.value)}
                placeholder="Required for admin registration"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors text-accent-red"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loading}
              className="w-full py-3 rounded-lg font-bold bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:brightness-110 transition-all mt-4 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 className="w-5 h-5 animate-spin" />}
              {loading ? 'Initializing...' : 'Initialize System'}
            </button>
          </form>

          <p className="text-center text-sm text-text-secondary mt-6">
            Already registered? <Link to="/login" className="text-accent-indigo font-medium hover:underline">Sign In</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
