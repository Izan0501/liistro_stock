import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { Loader2, User as UserIcon, Lock, Save } from 'lucide-react';

export default function Profile() {
  const { user } = useAuth();
  
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  
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
      // Assuming a backend endpoint to update profile exists
      await api.patch('/auth/me', { name });
      
      // Update local storage
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
    setLoadingPassword(true);
    setPasswordMessage({ type: '', text: '' });
    
    try {
      await api.patch('/auth/me/password', {
        current_password: currentPassword,
        new_password: newPassword
      });
      setPasswordMessage({ type: 'success', text: 'Contraseña actualizada correctamente.' });
      setCurrentPassword('');
      setNewPassword('');
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
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-accent-indigo overflow-hidden shadow-[0_0_15px_rgba(99,102,241,0.3)]">
          <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'Rodrigo'}`} alt="User Avatar" className="w-full h-full" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">{user?.name || 'Administrador'}</h1>
          <p className="text-text-secondary">{user?.role || 'Admin'}</p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Personal Details Form */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-white border-b border-white/5 pb-4">
            <UserIcon className="w-5 h-5 text-accent-indigo" />
            <h2 className="text-lg font-semibold">Detalles Personales</h2>
          </div>
          
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            {profileMessage.text && (
              <div className={`px-4 py-3 rounded-lg text-sm border ${profileMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}>
                {profileMessage.text}
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Nombre Completo</label>
              <input 
                type="text" 
                value={name}
                onChange={e => setName(e.target.value)}
                required
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Correo Electrónico (No Editable)</label>
              <input 
                type="email" 
                value={email}
                disabled
                className="w-full bg-black/40 border border-white/5 rounded-lg px-4 py-3 text-text-secondary cursor-not-allowed"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loadingProfile}
              className="w-full py-3 rounded-lg font-bold bg-white/5 hover:bg-white/10 text-white border border-white/10 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingProfile ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {loadingProfile ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </form>
        </div>

        {/* Security Form */}
        <div className="glass-card p-6">
          <div className="flex items-center gap-2 mb-6 text-white border-b border-white/5 pb-4">
            <Lock className="w-5 h-5 text-accent-indigo" />
            <h2 className="text-lg font-semibold">Seguridad</h2>
          </div>
          
          <form onSubmit={handleUpdatePassword} className="space-y-4">
            {passwordMessage.text && (
              <div className={`px-4 py-3 rounded-lg text-sm border ${passwordMessage.type === 'success' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-accent-red/10 text-accent-red border-accent-red/20'}`}>
                {passwordMessage.text}
              </div>
            )}
            
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Contraseña Actual</label>
              <input 
                type="password" 
                value={currentPassword}
                onChange={e => setCurrentPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium text-text-secondary block mb-1.5">Nueva Contraseña</label>
              <input 
                type="password" 
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full bg-black/20 border border-white/10 rounded-lg px-4 py-3 focus:outline-none focus:border-accent-indigo transition-colors"
              />
            </div>
            
            <button 
              type="submit" 
              disabled={loadingPassword}
              className="w-full py-3 rounded-lg font-bold bg-accent-indigo text-white shadow-[0_0_15px_rgba(99,102,241,0.3)] hover:brightness-110 transition-all mt-2 flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loadingPassword ? <Loader2 className="w-4 h-4 animate-spin" /> : <Lock className="w-4 h-4" />}
              {loadingPassword ? 'Actualizando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
