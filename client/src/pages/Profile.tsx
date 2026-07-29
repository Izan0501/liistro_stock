import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Loader2, User as UserIcon, Lock, Save, Shield, Mail, Key } from 'lucide-react';
import { HoverButton } from '../components/ui/HoverButton';
import { AppInput } from '../components/ui/AppInput';
import { useNotificationStore } from '../hooks/useNotificationStore';
import { toast } from 'sonner';

export default function Profile() {
  const { user } = useAuth();
  const addActivityEvent = useNotificationStore((state) => state.addActivityEvent);
  
  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  // Security Form State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secretKey, setSecretKey] = useState('');
  
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
    }
  }, [user]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoadingProfile(true);
    setProfileMessage({ type: '', text: '' });
    
    try {
      await api.patch('/auth/me', { name });
      
      const updatedUser = { ...user, name };
      localStorage.setItem('user', JSON.stringify(updatedUser));
      
      setProfileMessage({ type: 'success', text: 'Perfil actualizado correctamente.' });
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let msg = 'Error al actualizar perfil.';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d: any) => d.msg).join(', ');
      setProfileMessage({ type: 'error', text: msg });
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: 'error', text: 'Las contraseñas no coinciden.' });
      return;
    }
    
    setLoadingPassword(true);
    setPasswordMessage({ type: '', text: '' });
    
    try {
      await api.patch('/auth/me/password', {
        secret_key: secretKey,
        new_password: newPassword
      });
      
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      toast.success("Seguridad Actualizada", { description: "Tu contraseña ha sido cambiada con éxito." });
      
      addActivityEvent({
        type: 'security',
        user: 'Sistema de Seguridad',
        message: 'Se ha actualizado la contraseña de tu cuenta.',
      });
      
      setNewPassword('');
      setConfirmPassword('');
      setSecretKey('');
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail;
      let msg = 'Error al actualizar contraseña.';
      if (typeof detail === 'string') msg = detail;
      else if (Array.isArray(detail)) msg = detail.map((d: any) => d.msg).join(', ');
      setPasswordMessage({ type: 'error', text: msg });
    } finally {
      setLoadingPassword(false);
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-8">
      {/* ── Header Area ── */}
      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg p-6 sm:p-8 transition-colors">
        <div className="relative flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-slate-950 dark:bg-white border-[4px] border-white dark:border-slate-900 shadow-[0_8px_16px_rgb(0,0,0,0.12)] dark:shadow-[0_8px_16px_rgb(255,255,255,0.1)] overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent dark:from-black/10 dark:to-transparent opacity-50 rounded-full pointer-events-none"></div>
          <span className="relative text-4xl font-bold uppercase tracking-widest text-white dark:text-slate-950">
            {user?.name ? user.name.substring(0, 1) : 'A'}
          </span>
        </div>
        <div className="text-center sm:text-left flex-1">
          <h1 className="text-2xl font-bold text-slate-950 dark:text-white leading-none">{user?.name || 'Administrador'}</h1>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-3">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-600 border border-indigo-200 dark:bg-indigo-500/10 dark:text-indigo-400 dark:border-indigo-500/20 lowercase tracking-wide">
              {user?.role || 'admin'}
            </span>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/10 dark:text-emerald-400 dark:border-emerald-500/20">
              <Shield className="h-3 w-3" /> Verificado
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* ── Personal Details Form ── */}
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg p-6 sm:p-8 transition-colors">
          <div className="flex items-center gap-3 mb-8 text-slate-950 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 flex items-center justify-center">
              <UserIcon className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Personal Information</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Update your account details</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-5">
            {profileMessage.text && (
              <div className={`px-4 py-3 rounded-lg text-sm border ${profileMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {profileMessage.text}
              </div>
            )}
            
            <AppInput 
              label="Nombre Completo"
              icon={<UserIcon className="w-4 h-4" />}
              value={name}
              onChange={e => setName(e.target.value)}
              required
              placeholder="Ej. John Doe"
              accentColor="indigo"
            />
            
            <AppInput 
              label="Correo Electrónico (No Editable)"
              icon={<Mail className="w-4 h-4" />}
              type="email"
              value={email}
              disabled
              accentColor="indigo"
            />
            
            <div className="pt-4">
              <HoverButton 
                type="submit" 
                disabled={loadingProfile}
                className="w-full"
                glowColor="#6366f1"
                backgroundColor="#0f172a"
              >
                {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                {loadingProfile ? 'Guardando...' : 'Guardar Cambios'}
              </HoverButton>
            </div>
          </form>
        </div>

        {/* ── Security Center Form ── */}
        <div className="bg-white dark:bg-slate-900/50 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-lg p-6 sm:p-8 transition-colors">
          <div className="flex items-center gap-3 mb-8 text-slate-950 dark:text-white border-b border-slate-200 dark:border-slate-800 pb-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Security Center</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Manage your password and keys</p>
            </div>
          </div>
          
          <form onSubmit={handleUpdatePassword} className="space-y-5">
            {passwordMessage.text && (
              <div className={`px-4 py-3 rounded-lg text-sm border ${passwordMessage.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                {passwordMessage.text}
              </div>
            )}
            
            <AppInput 
              label="New Password"
              icon={<Lock className="w-4 h-4" />}
              type="password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              placeholder="••••••••"
              accentColor="emerald"
            />
            
            <AppInput 
              label="Confirm New Password"
              icon={<Lock className="w-4 h-4" />}
              type="password"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              required
              placeholder="••••••••"
              accentColor="emerald"
            />
            
            <AppInput 
              label="System Registration Key"
              icon={<Key className="w-4 h-4" />}
              type="password"
              value={secretKey}
              onChange={e => setSecretKey(e.target.value)}
              required
              placeholder="Admin Master Key"
              accentColor="indigo"
            />
            
            <div className="pt-4">
              <HoverButton
                type="submit"
                disabled={loadingPassword}
                className="w-full"
                glowColor="#10b981"
                backgroundColor="#0f172a"
              >
                {loadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {loadingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
              </HoverButton>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
