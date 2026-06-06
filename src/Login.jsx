import React, { useState } from 'react';
import { Building2, Lock, ArrowRight, ShieldCheck, Mail, Users, User, ChevronDown, AlertTriangle } from 'lucide-react';

const API_URL = "https://erolymz7-aieus-api.hf.space";

const Login = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [hata, setHata] = useState('');
  const [loading, setLoading] = useState(false);
  const [capsLockAcik, setCapsLockAcik] = useState(false);

  // STATE GÜNCELLEMESİ: Email + Rol + İsim + Soyisim
  const [formData, setFormData] = useState({ 
    isim: '', 
    soyisim: '', 
    email: '', 
    sifre: '', 
    kurum_adi: '', 
    rol: 'bireysel'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const checkCapsLock = (e) => {
  if (e.getModifierState('CapsLock')) {
    setCapsLockAcik(true);
  } else {
    setCapsLockAcik(false);
  }
}; //CAPSLOCK CONTROL

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHata('');
    setLoading(true);

    const endpoint = isLoginMode ? '/api/giris' : '/api/kayit';

    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.hata) {
        setHata(data.hata);
      } else {
        onLoginSuccess({
            id: data.id,
            isim: data.isim,
            soyisim: data.soyisim,
            kurum_adi: data.kurum_adi,
            rol: data.rol
        });
      }
    } catch (err) {
      setHata('Sunucuya bağlanılamadı. Lütfen bağlantınızı kontrol edin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 font-sans">
      <div className="max-w-4xl w-full flex flex-col md:flex-row bg-[#1E293B] rounded-3xl shadow-2xl overflow-hidden border border-slate-700">
        
        {/* Sol Taraf: Marka ve Vizyon */}
        <div className="w-full md:w-5/12 bg-gradient-to-br from-indigo-600 to-blue-800 p-10 text-white flex flex-col justify-center relative overflow-hidden">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
              <ShieldCheck size={40} className="text-cyan-300" />
              <h1 className="text-3xl font-black tracking-wider">AIEUS</h1>
            </div>
            <h2 className="text-2xl font-bold mb-4">Yapay Zeka Etik Risk Ölçeği</h2>
            <p className="text-indigo-100 font-medium leading-relaxed">
              Kurumunuzun yapay zeka süreçlerini değerlendirmek ve etik risk haritasını çıkarmak için güvenli sisteme giriş yapın.
            </p>
          </div>
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-48 h-48 rounded-full bg-cyan-400 opacity-20 blur-2xl"></div>
        </div>

        {/* Sağ Taraf: Giriş Formu */}
        <div className="w-full md:w-7/12 p-10 md:p-14 bg-white">
          <h3 className="text-2xl font-bold text-slate-800 mb-2">
            {isLoginMode ? 'Sisteme Giriş' : 'Yeni Hesap Oluştur'}
          </h3>
          <p className="text-slate-500 mb-8 font-medium">
            {isLoginMode 
              ? 'Lütfen giriş bilgilerinizi girin.' 
              : 'Etik değerlendirme dünyasına katılın.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            
            {/* ROL SEÇİMİ (Sadece Kayıt Modunda) */}
            {!isLoginMode && (
              <div className="space-y-3 mb-6">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Hesap Türü</label>
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-2xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: 'bireysel' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      formData.rol === 'bireysel' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                    }`}
                  >
                    <Users size={16} /> Bireysel
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, rol: 'admin' })}
                    className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-sm transition-all ${
                      formData.rol === 'admin' ? 'bg-indigo-600 text-white shadow-md' : 'text-slate-500'
                    }`}
                  >
                    <ShieldCheck size={16} /> Kurumsal Admin
                  </button>
                </div>
              </div>
            )}

            {/* AD & SOYAD ALANI (Yan Yana) */}
            {!isLoginMode && (
              <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Adınız</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                      <User size={20} className="text-slate-400" />
                    </div>
                    <input
                      type="text"
                      name="isim"
                      value={formData.isim}
                      onChange={handleChange}
                      required
                      placeholder="Ahmet"
                      className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 font-medium"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">Soyadınız</label>
                  <input
                    type="text"
                    name="soyisim"
                    value={formData.soyisim}
                    onChange={handleChange}
                    required
                    placeholder="Yılmaz"
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 font-medium"
                  />
                </div>
              </div>
            )}

            {/* EMAIL ALANI */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">E-posta Adresi</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Mail size={20} className="text-slate-400" />
                </div>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  placeholder="ornek@sirket.com"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 font-medium"
                />
              </div>
            </div>

            {/* KURUM ADI ALANI (Açılır Liste - Select) */}
            {!isLoginMode && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="block text-sm font-bold text-slate-700 mb-2">
                  {formData.rol === 'admin' ? 'Kurumunuz (Zorunlu)' : 'Çalıştığınız Kurum (Opsiyonel)'}
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Building2 size={20} className="text-slate-400" />
                  </div>
                  <select
                    name="kurum_adi"
                    value={formData.kurum_adi}
                    onChange={handleChange}
                    required={formData.rol === 'admin'}
                    className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 font-medium appearance-none cursor-pointer"
                  >
                    <option value="" disabled>Kurum Seçiniz...</option>
                    <option value="Trendyol">Trendyol</option>
                    <option value="Aselsan">Aselsan</option>
                    <option value="Baykar">Baykar</option>
                    <option value="TUSAŞ">TUSAŞ</option>
                    <option value="Diğer">Diğer / Bağımsız Çalışan</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 pr-4 flex items-center pointer-events-none">
                    <ChevronDown size={18} className="text-slate-400" />
                  </div>
                </div>
              </div>
            )}

            {/* ŞİFRE ALANI */}
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Şifre</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <Lock size={20} className="text-slate-400" />
                </div>
                <input
                  type="password"
                  name="sifre"
                  value={formData.sifre}
                  onChange={handleChange}
                  onKeyUp={checkCapsLock} /* CapsLock! */
                  required
                  placeholder="••••••••"
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 transition-all text-slate-800 font-medium"
                />
              </div>
              
              {/* CAPS LOCK UYARISI */}
              {capsLockAcik && (
                <div className="flex items-center gap-2 text-amber-500 text-xs font-bold mt-3 animate-in fade-in duration-300">
                  <AlertTriangle size={14} />
                  <span>Caps Lock açık!</span>
                </div>
              )}
            </div>

            {hata && (
              <div className="p-3 bg-rose-50 text-rose-600 text-sm font-bold rounded-lg border border-rose-100">
                {hata}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2 group"
            >
              {loading ? 'İşleniyor...' : (isLoginMode ? 'Sisteme Giriş Yap' : 'Kaydı Tamamla')}
              {!loading && <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-slate-100 pt-6">
            <p className="text-slate-500 font-medium text-sm">
              {isLoginMode ? 'Sistemde henüz kaydınız yok mu? ' : 'Zaten bir hesabınız var mı? '}
              <button 
                type="button"
                onClick={() => { setIsLoginMode(!isLoginMode); setHata(''); }}
                className="text-indigo-600 font-bold hover:text-indigo-800 transition-colors"
              >
                {isLoginMode ? 'Yeni Hesap Oluşturun' : 'Giriş Yapın'}
              </button>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;