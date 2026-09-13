import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Lock, Mail, ArrowRight, ShieldCheck, UserCheck, Sparkles, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      addToast('Please enter both email and password', 'warning');
      return;
    }

    try {
      setLoading(true);
      await login(email, password);
      navigate('/dashboard');
    } catch (err) {
      // Error handled by AuthContext toast
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail, demoPass) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    addToast(`Loaded ${demoEmail} credentials. Click Sign In.`, 'info');
  };

  return (
    <div className="min-h-screen bg-[#f4f8f2] flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden font-sans">
      {/* Background Fluid Circles */}
      <div className="absolute -top-20 -right-20 w-96 h-96 bg-[#6a9c6a]/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-[#a0c396]/15 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header Back Link */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <Link to="/" className="inline-flex items-center gap-3 group">
          <img 
            src="/logo.png" 
            alt="Mother Dairy Rajajipuram" 
            className="w-14 h-14 object-contain rounded-full shadow-lg border-2 border-[#a0c396]/40 group-hover:scale-105 transition-transform" 
          />
          <div className="text-left">
            <span className="font-serif font-bold text-2xl text-[#1e3a1e] leading-none block">
              Mother Dairy
            </span>
            <span className="text-[10px] text-[#2d4a2d] font-bold uppercase tracking-widest block mt-0.5">
              Rajajipuram Outlet ERP
            </span>
          </div>
        </Link>
      </div>

      {/* Animated Login Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="sm:mx-auto sm:w-full sm:max-w-md px-4"
      >
        <div className="bg-white py-8 px-6 sm:px-10 rounded-[2rem] border border-[#a0c396]/30 shadow-hero space-y-6">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#1e3a1e] tracking-tight">
              Sign In to ERP Portal
            </h2>
            <p className="text-xs text-[#3f5a3f] mt-1">
              Authorized Mother Dairy Administrator and Outlet Staff credentials.
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-[#1e3a1e] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  required
                  placeholder="admin@dairy.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#f4f8f2] border border-[#a0c396]/40 rounded-2xl text-xs sm:text-sm font-medium text-[#1e3a1e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a1e] focus:bg-white transition-all shadow-inner"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#1e3a1e] mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-[#f4f8f2] border border-[#a0c396]/40 rounded-2xl text-xs sm:text-sm font-medium text-[#1e3a1e] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#1e3a1e] focus:bg-white transition-all shadow-inner"
                />
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-[#1e3a1e] hover:bg-[#2d4a2d] disabled:opacity-50 text-[#f8f5f0] rounded-full font-bold text-sm shadow-lg shadow-[#1e3a1e]/20 transition-all hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2 mt-2 cursor-pointer"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Verifying Credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-4 h-4 text-[#9bc09b]" />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <span className="text-[11px] font-bold text-[#6a9c6a] block text-center uppercase tracking-wider">
              1-Click Demo Access
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('admin@dairy.com', 'admin123')}
                className="p-2.5 rounded-2xl bg-[#ebf5eb] hover:bg-[#d8e8d8] border border-[#a0c396]/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#1e3a1e]">
                  <ShieldCheck className="w-3.5 h-3.5 text-[#6a9c6a]" />
                  <span>Admin User</span>
                </div>
                <div className="text-[10px] text-[#3f5a3f] mt-0.5 truncate">admin@dairy.com</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickFill('staff@dairy.com', 'staff123')}
                className="p-2.5 rounded-2xl bg-[#ebf5eb] hover:bg-[#d8e8d8] border border-[#a0c396]/40 text-left transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-1 text-[11px] font-bold text-[#2d4a2d]">
                  <UserCheck className="w-3.5 h-3.5 text-[#6a9c6a]" />
                  <span>Staff User</span>
                </div>
                <div className="text-[10px] text-[#3f5a3f] mt-0.5 truncate">staff@dairy.com</div>
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>

  );
};

export default Login;
