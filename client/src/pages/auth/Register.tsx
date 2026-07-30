import { useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Loader2, ArrowRight, ShieldCheck, Lock, Cpu } from 'lucide-react';
import { AppInput } from '../../components/ui/AppInput';
import { toast } from 'sonner';

// ─── Animated submit button ───────────────────────────────────────────────────
const SubmitButton = ({ loading, label }: { loading: boolean; label: string }) => (
  <button
    type="submit"
    disabled={loading}
    className="group relative w-full overflow-hidden rounded-xl bg-indigo-600 px-6 py-3.5 font-semibold text-white transition-colors transition-opacity transition-shadow duration-300 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 hover:shadow-[0_0_30px_rgba(99,102,241,0.4)] disabled:opacity-60 disabled:cursor-not-allowed"
  >
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

// ─── Feature card on hero panel ──────────────────────────────────────────────
const FeatureBadge = ({ icon: Icon, title, description, color }: any) => (
  <div className="relative z-10 flex items-center gap-4 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md px-5 py-4 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-xl">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
    <div>
      <div className="text-sm font-semibold text-slate-950 dark:text-white">{title}</div>
      <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{description}</div>
    </div>
  </div>
);

// ─── Main Register Page ───────────────────────────────────────────────────────
export default function Register() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
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

  const validateForm = () => {
    if (password.length < 8) {
      toast.error("Contraseña débil", { description: "Debe tener al menos 8 caracteres." });
      return false;
    }
    if (!/[A-Z]/.test(password)) {
      toast.error("Contraseña débil", { description: "Debe incluir al menos una letra mayúscula." });
      return false;
    }
    if (!/[a-z]/.test(password)) {
      toast.error("Contraseña débil", { description: "Debe incluir al menos una letra minúscula." });
      return false;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
      toast.error("Contraseña débil", { description: "Debe incluir al menos un símbolo (!@#$)." });
      return false;
    }
    if (password !== confirmPassword) {
      toast.error("Error de coincidencia", { description: "Las contraseñas no son iguales." });
      return false;
    }
    if (!secretKey) {
      toast.error("Llave requerida", { description: "Debes ingresar la llave del sistema." });
      return false;
    }
    return true;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');

    try {
      const payload = { 
        full_name: name, 
        email: email, 
        password: password, 
        confirm_password: confirmPassword, 
        secret_key: secretKey 
      };
      const response = await api.post('/auth/register', payload);

      let token = response.data.access_token;
      if (!token) {
        const loginRes = await api.post('/auth/login', { email, password });
        token = loginRes.data.access_token;
      }

      localStorage.setItem('auth:v1', token);
      const userResponse = await api.get('/auth/me');
      const user = userResponse.data;
      login(token, user);
    } catch (error: any) {
      console.error(error);
      if (error.response?.status === 422) {
        console.error("Validation Error Details:", error.response.data.detail);
        const details = error.response.data.detail;
        if (Array.isArray(details)) {
          toast.error("Error en los datos", { 
            description: `Verifica el campo: ${details[0]?.loc?.[1] || 'desconocido'}` 
          });
        } else {
          toast.error("Error de validación", { description: "Revisa los campos enviados." });
        }
      } else {
        toast.error("Error de servidor", { description: error.response?.data?.detail || "No se pudo completar el registro." });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="fixed inset-0 flex h-[100dvh] w-[100vw] flex-col overflow-hidden overscroll-none touch-none bg-slate-50 dark:bg-slate-950 sm:flex-row transition-colors duration-300">

      {/* ── Right: Hero Image Panel (shown first for register, so form is on right) ── */}
      <aside className="relative hidden h-full min-h-0 min-w-0 flex-1 overflow-hidden lg:flex bg-slate-100 dark:bg-slate-900 transition-colors duration-300">
        <img
          src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?q=80&w=1200&auto=format&fit=crop"
          alt="Warehouse logistics"
          className="absolute inset-0 w-full h-full object-cover object-center opacity-80"
        />
        {/* Premium Gradient Fade: Blends the seam between the form and image */}
        <div className="absolute inset-0 bg-gradient-to-l from-slate-50 dark:from-slate-950 via-slate-50/20 dark:via-slate-950/20 to-transparent z-0" />

        {/* Overlay content */}
        <div className="absolute inset-0 z-20 flex flex-col justify-end p-10 gap-3">
          <FeatureBadge
            icon={Cpu}
            title="Real-time Inventory Sync"
            description="Stock levels update across all views instantly"
            color="bg-indigo-600"
          />
          <FeatureBadge
            icon={ShieldCheck}
            title="Role-based Access Control"
            description="Secure admin authentication system"
            color="bg-violet-600"
          />
          <FeatureBadge
            icon={Lock}
            title="Encrypted Credentials"
            description="Passwords hashed with bcrypt at rest"
            color="bg-emerald-600"
          />
        </div>
      </aside>

      {/* ── Right (mobile) / Right (desktop): Form Panel ─── */}
      <section
        ref={formWrapperRef}
        onMouseMove={handleMouseMove}
        className="relative flex h-full w-full min-h-0 min-w-0 flex-1 flex-col items-center justify-center px-6 lg:px-16"
      >
        {/* Cursor glow */}
        <div
          className="pointer-events-none absolute inset-0 transition-colors duration-500"
          style={{
            background: `radial-gradient(600px circle at ${glowPos.x}% ${glowPos.y}%, rgba(99,102,241,0.08), transparent 60%)`,
          }}
        />

        {/* Ambient orbs */}
        <div className="pointer-events-none absolute top-0 right-0 w-72 h-72 rounded-full bg-violet-500/10 blur-3xl translate-x-1/2 -translate-y-1/2" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl -translate-x-1/2 translate-y-1/2" />

        <div className="relative z-10 w-full max-w-sm overflow-y-auto py-12 touch-pan-y [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          {/* Logo */}
          <div className="mb-8">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white text-lg font-black shadow-[0_0_20px_rgba(99,102,241,0.5)]">
                L
              </div>
              <span className="text-xl font-bold text-slate-950 dark:text-white tracking-tight">
                Liistro<span className="text-slate-500 dark:text-slate-400 font-medium">Stock</span>
              </span>
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-white">System Initialization</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-2 text-sm">Register the Master Admin account</p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <AppInput
              label="Full Name"
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="John Smith"
              accentColor="indigo"
            />

            <AppInput
              label="Email Address"
              type="email"
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@company.com"
              accentColor="indigo"
            />

            <div>
              <AppInput
                label="Password"
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                accentColor="indigo"
              />
              <p className="text-[10px] text-slate-500 mt-1">Mínimo 8 caracteres, incluyendo mayúsculas, minúsculas y un símbolo.</p>
            </div>

            <AppInput
              label="Confirm Password"
              type="password"
              required
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="••••••••"
              accentColor="indigo"
            />

            {/* Secret key — styled as a danger field */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="secret-key" className="text-xs font-semibold uppercase tracking-widest text-slate-400">
                Secret Registration Key
              </label>
              <div className="relative rounded-xl overflow-hidden border border-red-500/30 bg-slate-950/70">
                <input
                  id="secret-key"
                  type="password"
                  required
                  value={secretKey}
                  onChange={e => setSecretKey(e.target.value)}
                  placeholder="Required for admin registration"
                  className="w-full bg-transparent px-4 py-3.5 text-sm text-red-400 placeholder:text-red-900 focus:outline-none"
                />
              </div>
              <p className="text-[10px] text-red-500/60">This key is set by your system administrator.</p>
            </div>

            <div className="pt-2">
              <SubmitButton loading={loading} label="Initialize System" />
            </div>
          </form>

          <p className="text-center text-sm text-slate-500 mt-8">
            Already registered?{' '}
            <Link to="/login" className="text-indigo-400 font-medium hover:text-indigo-300 transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </section>

    </main>
  );
}
