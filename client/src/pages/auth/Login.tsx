import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { api } from '../../services/api';
import { Loader2, ArrowRight, BarChart3, Package, TrendingUp } from 'lucide-react';
import { AppInput } from '../../components/ui/AppInput';

// ─── Animated submit button ───────────────────────────────────────────────────
const SubmitButton = ({ loading, label }: { loading: boolean; label: string }) => (
  <button
    type="submit"
    disabled={loading}
    className="group relative w-full overflow-hidden rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition-colors transition-opacity transition-shadow duration-300 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
  >
    {/* Skew shine on hover */}
    <span className="absolute inset-0 -translate-x-full skew-x-12 bg-white/10 transition-transform duration-500 group-hover:translate-x-full" />
    <span className="relative flex items-center justify-center gap-2 text-sm">
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : (
        <>
          {label}
          <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-1" />
        </>
      )}
    </span>
  </button>
);

// ─── Floating stat badge ──────────────────────────────────────────────────────
const StatBadge = ({ icon: Icon, label, value, color }: any) => (
  <div className="relative z-10 flex items-center gap-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-4 py-3 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-xl">
    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${color}`}>
      <Icon className="w-4 h-4 text-white" />
    </div>
    <div>
      <div className="text-xs text-slate-500 dark:text-slate-400">{label}</div>
      <div className="text-sm font-bold text-slate-950 dark:text-white">{value}</div>
    </div>
  </div>
);

// ─── Main Login Page ──────────────────────────────────────────────────────────
export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Cursor-tracking glow state
  const formWrapperRef = useRef<HTMLDivElement>(null);
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!formWrapperRef.current) return;
    const rect = formWrapperRef.current.getBoundingClientRect();
    setGlowPos({
      x: ((e.clientX - rect.left) / rect.width) * 100,
      y: ((e.clientY - rect.top) / rect.height) * 100,
    });
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const payload = { email, password };
      const response = await api.post('/auth/login', payload);
      const { access_token } = response.data;

      localStorage.setItem('auth:v1', access_token);
      const userResponse = await api.get('/auth/me');
      const user = userResponse.data;
      login(access_token, user);
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let errorMessage = 'Failed to login. Check your credentials.';
      if (typeof detail === 'string') errorMessage = detail;
      else if (Array.isArray(detail)) errorMessage = detail.map((d: any) => d.msg).join(', ');
      else if (detail) errorMessage = JSON.stringify(detail);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 flex h-[100dvh] w-[100vw] flex-col overflow-hidden overscroll-none touch-none bg-slate-50 dark:bg-slate-950 sm:flex-row transition-colors duration-300">

      {/* ── Left: Form Panel ─────────────────────────────────────────── */}
      <section
        ref={formWrapperRef}
        onMouseMove={handleMouseMove}
        className="relative flex h-full w-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-6 lg:px-16"
      >
        {/* Background radial glow tracking cursor */}
        <div
          className="pointer-events-none absolute inset-0 transition-colors duration-500"
          style={{
            background: `radial-gradient(600px circle at ${glowPos.x}% ${glowPos.y}%, rgba(99,102,241,0.08), transparent 60%)`,
          }}
        />

        {/* Ambient gradient orbs */}
        <div className="pointer-events-none absolute top-0 left-0 w-72 h-72 rounded-full bg-purple-500/10 blur-3xl -translate-x-1/2 -translate-y-1/2" />
        <div className="pointer-events-none absolute bottom-0 right-0 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 w-full max-w-sm overflow-y-auto py-12 touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Logo */}
          <div className="mb-10">
            <div className="flex items-center gap-3 bg-transparent mb-8 overflow-hidden">
              <img src="/logo.png" alt="NAVE24 Logo" className="relative z-10 h-12 w-auto object-contain rounded-xl shadow-sm sm:h-14" />
              <span className="mt-1 text-2xl font-semibold leading-none tracking-widest text-slate-900 dark:text-white transition-colors duration-200 sm:text-3xl">
                NAVE24
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">Bienvenido de nuevo</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Inicia al dashboard de gestion</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <AppInput
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="you@company.com"
              accentColor="indigo"
            />

            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label htmlFor="login-password" className="text-xs font-semibold uppercase tracking-widest text-slate-500 dark:text-slate-400">
                  Password
                </label>
              </div>
              <AppInput
                id="login-password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                accentColor="indigo"
              />
            </div>

            <div className="pt-2">
              <SubmitButton loading={loading} label="Iniciar al Dashboard" />
            </div>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Necesitas registrarte?{' '}
            <Link to="/register" className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
              Crear Administrador
            </Link>
          </p>
        </div>
      </section>

      <aside className="relative hidden h-full min-h-0 min-w-0 flex-1 overflow-hidden lg:flex bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        {/* Hero image */}
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop"
          alt="Warehouse operations"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
        />
        {/* Premium Gradient Fade: Blends the seam between the form and image */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-50 dark:from-slate-950 via-slate-50/20 dark:via-slate-950/20 to-transparent z-0" />

        {/* Floating stat badges */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-10 gap-3">
          <StatBadge icon={BarChart3} label="Today's Revenue" value="$12,480" color="bg-indigo-600" />
          <StatBadge icon={Package} label="Active SKUs" value="342 products" color="bg-violet-600" />
          <StatBadge icon={TrendingUp} label="Monthly Growth" value="+18.4%" color="bg-emerald-600" />
        </div>
      </aside>

    </main>
  );
}
