import React, { useState, useEffect, useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { ShieldCheck, Target, LayoutDashboard, Award, ArrowRight, Home, FileText, Settings, Bell, ChevronDown, Sun, Moon, Users, TrendingUp, AlertTriangle, FileSpreadsheet, MessageSquare, Send } from 'lucide-react';
import Login from './Login';
import { toPng } from 'html-to-image';
import jsPDF from 'jspdf';
import ExcelJS from 'exceljs';
import html2pdf from 'html2pdf.js';

const API_URL = "https://erolymz7-aieus-api.hf.space";

function App() {
  const [aktifKullanici, setAktifKullanici] = useState(null); 
  const [aktifSayfa, setAktifSayfa] = useState('anasayfa');
  const [isDarkMode, setIsDarkMode] = useState(true);
  
  const [sorular, setSorular] = useState([]);
  const [cevaplar, setCevaplar] = useState({});
  const [sonuc, setSonuc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [radarData, setRadarData] = useState([]);
  const [kurumsalOzet, setKurumsalOzet] = useState(null);
  const [kurumsalHata, setKurumsalHata] = useState('');
  const [gecmisRaporlar, setGecmisRaporlar] = useState([]);
  const [raporLoading, setRaporLoading] = useState(false);

  const [mevcutSayfa, setMevcutSayfa] = useState(1);
  const [eksikSorular, setEksikSorular] = useState([]);
// -- Test Sonucu Eğitim tavsiyesi için Stateler
  const [aksiyonPlani, setAksiyonPlani] = useState([]);
  const [egitimModalAcik, setEgitimModalAcik] = useState(false);
  const [seciliEgitim, setSeciliEgitim] = useState(null);
  const [llmLoading, setLlmLoading] = useState(false);

  // --- CHATBOT (RAG) STATE'LERİ ---
  const [mesajlar, setMesajlar] = useState([
    { rol: 'bot', metin: 'Merhaba! Ben AIEUS Etik Danışmanınızım. Yapay zeka etiği, kurum kuralları veya risk analiziniz hakkında bana her şeyi sorabilirsiniz.', kurallar: null }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    const timeoutZamanlayici = setTimeout(() => { setLoading(false); }, 3000);
    fetch('http://127.0.0.1:8000/api/sorular')
      .then(res => {
        if (!res.ok) throw new Error(`Sunucu Hatası: ${res.status}`);
        return res.json();
      })
      .then(data => { 
        if (data && data.sorular) { setSorular(data.sorular); }
        setLoading(false); 
        clearTimeout(timeoutZamanlayici);
      })
      .catch(err => {
        console.error("Bağlantı Hatası:", err);
        setLoading(false);
        clearTimeout(timeoutZamanlayici);
      });
    return () => clearTimeout(timeoutZamanlayici);
  }, []);

  const handleCevap = (soruId, puan) => setCevaplar({ ...cevaplar, [soruId]: puan });

  const verileriAnalizEt = () => {
    const boyutAnalizi = {};
    sorular.forEach(soru => {
      if (!boyutAnalizi[soru.boyut]) boyutAnalizi[soru.boyut] = { toplamPuan: 0, soruSayisi: 0 };
      if (cevaplar[soru.id]) {
        boyutAnalizi[soru.boyut].toplamPuan += cevaplar[soru.id];
        boyutAnalizi[soru.boyut].soruSayisi += 1;
      }
    });

    const formatliData = Object.keys(boyutAnalizi).map(boyut => ({
      subject: boyut,
      A: Math.round(((boyutAnalizi[boyut].toplamPuan / boyutAnalizi[boyut].soruSayisi) / 5) * 100),
      fullMark: 100,
    }));
    setRadarData(formatliData);

    const yeniAksiyonPlani = [];
    formatliData.forEach(item => {
      let seviye = ''; let etiket = ''; let renkTipi = ''; let dinamikMesaj = '';
      if (item.A < 60) {
        seviye = 'Kritik Zafiyet'; etiket = 'CRITICAL'; renkTipi = 'Kritik';
        dinamikMesaj = item.subject === 'Sorumlu Kullanım' 
          ? '"AI içeriklerini doğrulamadan kullanma" eğiliminiz, şirket kararlarında büyük bir algoritmik risk yaratıyor. Acil eğitim şart.'
          : 'AI çıktılarını izinsiz ve kaynaksız paylaşma durumunuz yüksek hukuki ve etik riskler (telif, veri gizliliği) taşıyor.';
      } else if (item.A < 80) {
        seviye = 'Orta Seviye Risk'; etiket = 'WARNING'; renkTipi = 'Orta';
        dinamikMesaj = item.subject === 'Sorumlu Kullanım'
          ? 'AI araçlarına güven seviyeniz yüksek, ancak teyit mekanizmalarınızı ve sorumluluk bilincinizi biraz daha artırmalısınız.'
          : 'Bilgi paylaşımında yapay zeka sınırlarını ve muhtemel algoritmik önyargıları daha şeffaf bir şekilde belirtmelisiniz.';
      } else if (item.A < 95) {
        seviye = 'Düşük Seviye Zafiyet'; etiket = 'NOTICE'; renkTipi = 'Düşük';
        dinamikMesaj = item.subject === 'Sorumlu Kullanım'
          ? 'Kullanım standartlarına genelde uyuyorsunuz, ancak bazı ince prosedürlerde ufak eksikler gözlemleniyor.'
          : 'Çıktı paylaşımlarınız genelde güvenli, ancak içerik doğruluğunu teyit süreçlerinde minik pürüzler olabilir.';
      }
      if (seviye !== '') {
        yeniAksiyonPlani.push({ boyut: item.subject, puan: item.A, seviyeBaslik: seviye, etiketYazisi: etiket, renkTipi: renkTipi, mesaj: dinamikMesaj });
      }
    });
    setAksiyonPlani(yeniAksiyonPlani);
  };

  const handleTestiBitir = async () => {
    const eksikler = [];
    sorular.forEach((soru, index) => { if (!cevaplar[soru.id]) eksikler.push(index + 1); });
    if (eksikler.length > 0) { setEksikSorular(eksikler); return; }

    verileriAnalizEt();
    const istek = { 
      kullanici_id: aktifKullanici.id,
      cevaplar: Object.keys(cevaplar).map(key => ({ soru_id: parseInt(key), puan: cevaplar[key] }))
    };
    try {
      const response = await fetch('http://127.0.0.1:8000/api/degerlendir', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(istek)
      });
      const data = await response.json();
      setSonuc(data);
      setAktifSayfa('sonuc');
    } catch (err) { console.error("Hata:", err); }
  };

  const eksikSorularaGit = () => {
    if (eksikSorular.length > 0) {
      const ilkEksik = eksikSorular[0]; 
      setMevcutSayfa(Math.ceil(ilkEksik / 3)); 
    }
    setEksikSorular([]); 
  };

  const handleKurumsalGecis = async () => {
    setAktifSayfa('kurumsal'); setKurumsalHata(''); setKurumsalOzet(null);
    try {
      const response = await fetch(`${API_URL}/api/kurumsal/${aktifKullanici.kurum_adi}`);
      const data = await response.json();
      if (data.hata) setKurumsalHata(data.hata); else setKurumsalOzet(data);
    } catch (err) { setKurumsalHata('Veriler çekilirken sunucuya ulaşılamadı.'); }
  };

  const handleRaporlaraGecis = async () => {
    setAktifSayfa('raporlar'); setRaporLoading(true);
    try {
      const response = await fetch(`http://127.0.0.1:8000/api/raporlar/${aktifKullanici.id}`);
      const data = await response.json();
      if (data.raporlar) setGecmisRaporlar(data.raporlar);
    } catch (err) { console.error("Raporlar çekilemedi", err); } 
    finally { setRaporLoading(false); }
  };

  const pdfIndir = async () => {
    try {
      const raporAlani = document.getElementById('pdf-rapor-alani');
      if (!raporAlani) return;
      const buton = document.getElementById('pdf-indir-btn');
      if(buton) buton.innerText = "Hazırlanıyor...";
      const filtre = (node) => node.id !== 'pdf-indir-btn' && node.id !== 'excel-indir-btn';
      const dataUrl = await toPng(raporAlani, { quality: 1, backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', filter: filtre });
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (raporAlani.offsetHeight * pdfWidth) / raporAlani.offsetWidth;
      pdf.addImage(dataUrl, 'PNG', 0, 10, pdfWidth, pdfHeight);
      const kurumAdiTemiz = aktifKullanici.kurum_adi ? aktifKullanici.kurum_adi.replace(/\s+/g, '_') : 'Kurum';
      pdf.save(`${kurumAdiTemiz}_AIEUS_Etik_Raporu.pdf`);
      if(buton) buton.innerText = "Sunum İndir (PDF)";
    } catch (error) { console.error("PDF oluşturulurken hata:", error); }
  };

  const excelIndir = async () => {
    if (!kurumsalOzet) return;
    try {
      const workbook = new ExcelJS.Workbook();
      const wsOzet = workbook.addWorksheet('Genel Özet');
      wsOzet.columns = [{ header: 'AIEUS Metrikleri', key: 'metrik', width: 45 }, { header: 'Değer', key: 'deger', width: 30 }];
      wsOzet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 12 };
      wsOzet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF8B5CF6' } };
      wsOzet.addRow({ metrik: 'Kurum Adı', deger: aktifKullanici.kurum_adi });
      wsOzet.addRow({ metrik: 'Testi Çözen Çalışan Sayısı', deger: `${kurumsalOzet.kisi_sayisi} Kişi` });
      wsOzet.addRow({ metrik: 'Genel Ortalama CMMI Seviyesi', deger: `${kurumsalOzet.ortalama_cmmi} / 5.0` });
      wsOzet.addRow({ metrik: 'En Yüksek Risk Tespit Edilen Boyut', deger: kurumsalOzet.en_riskli_boyut });

      const wsDetay = workbook.addWorksheet('Boyut Analizi');
      wsDetay.columns = [
        { header: 'Etik Boyutu', key: 'boyut', width: 35 }, { header: 'Şirket Ortalaması', key: 'sirket', width: 20 },
        { header: 'Sektör Ortalaması', key: 'sektor', width: 20 }, { header: 'Sektörel Fark', key: 'fark', width: 15 }
      ];
      wsDetay.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
      wsDetay.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF06B6D4' } };
      kurumsalOzet.grafik_verisi.forEach(item => {
        const fark = item.sirketOrtalamasi - item.sektorOrtalamasi;
        const satir = wsDetay.addRow({ boyut: item.name, sirket: item.sirketOrtalamasi, sektor: item.sektorOrtalamasi, fark: fark > 0 ? `+${fark}` : fark });
        satir.getCell('fark').font = { color: { argb: fark < 0 ? 'FFE11D48' : 'FF10B981' }, bold: true };
      });

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url;
      a.download = `${aktifKullanici.kurum_adi ? aktifKullanici.kurum_adi.replace(/\s+/g, '_') : 'Kurum'}_AIEUS_Analiz.xlsx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch (error) { console.error("Excel hatası:", error); }
  };

  // CHATBOT / RAG sistemi

  const mesajGonder = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    // Kullanıcının mesajını ekrana bas
    const yeniMesaj = { rol: 'kullanici', metin: chatInput, kurallar: null };
    setMesajlar(prev => [...prev, yeniMesaj]);
    setChatInput('');
    setChatLoading(true);

    try {
      const response = await fetch('http://127.0.0.1:8000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mesaj: yeniMesaj.metin })
      });
      const data = await response.json();

      if (data.hata) {
        setMesajlar(prev => [...prev, { rol: 'bot', metin: "Sunucuya ulaşılamadı. Lütfen bağlantınızı kontrol edin.", kurallar: null }]);
      } else {
        // Yapay zekanın cevabını ve REFERANS ALDIĞI KURALLARI ekrana bas
        setMesajlar(prev => [...prev, { rol: 'bot', metin: data.cevap, kurallar: data.kullanilan_kurallar }]);
      }
    } catch (err) {
      setMesajlar(prev => [...prev, { rol: 'bot', metin: "Ağ hatası oluştu.", kurallar: null }]);
    } finally {
      setChatLoading(false);
    }
  };

  // Oto-scroll için hedef referans
  const mesajlarinSonuRef = useRef(null);

  // En aşağı kaydırma fonksiyonu
  const asagiKaydir = () => {
    mesajlarinSonuRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Mesajlar listesi her değiştiğinde veya 'yazıyor...' animasyonu çıktığında tetikle
  useEffect(() => {
    asagiKaydir();
  }, [mesajlar, chatLoading]);

  const cikisYap = () => { setAktifKullanici(null); setAktifSayfa('anasayfa'); setCevaplar({}); setSonuc(null); setMevcutSayfa(1); };
  
  const etiketler = ["KESİNLİKLE KATILMIYORUM", "KATILMIYORUM", "KARARSIZIM", "KATILIYORUM", "KESİNLİKLE KATILIYORUM"];
  const progress = sorular.length > 0 ? Math.round((Object.keys(cevaplar).length / sorular.length) * 100) : 0;
  
  const sorularSayfaBasina = 3;
  const toplamSayfa = Math.ceil(sorular.length / sorularSayfaBasina);
  const gosterilenSorular = sorular.slice((mevcutSayfa - 1) * sorularSayfaBasina, mevcutSayfa * sorularSayfaBasina);

  const t = {
    appBg: isDarkMode ? "bg-[#0B0F19] text-slate-200" : "bg-[#EEF2F6] text-slate-800",
    meshViolet: isDarkMode ? "bg-violet-600/10 w-[40rem] h-[40rem] blur-[120px]" : "bg-violet-200 w-96 h-96 blur-[128px] opacity-60",
    meshCyan: isDarkMode ? "bg-cyan-600/10 w-[40rem] h-[40rem] blur-[120px]" : "bg-cyan-100 w-96 h-96 blur-[128px] opacity-60",
    glassPanel: isDarkMode ? "bg-white/5 border-white/10" : "bg-white/40 border-white/60 shadow-xl shadow-violet-500/5",
    textMain: isDarkMode ? "text-white" : "text-slate-900",
    textMuted: isDarkMode ? "text-slate-400" : "text-slate-500",
    navBtnActive: isDarkMode ? "bg-white/10 text-white border-white/10" : "bg-white text-violet-700 shadow-sm border-white",
    navBtnInactive: isDarkMode ? "text-slate-400 hover:bg-white/5 hover:text-white" : "text-slate-600 hover:bg-white/50 hover:text-slate-900",
    iconBtn: isDarkMode ? "bg-white/5 border-white/5 hover:text-white" : "bg-white border-slate-100 hover:text-violet-600 shadow-sm",
    banner: isDarkMode ? "bg-gradient-to-br from-[#1E1B4B] to-[#0F172A] border-white/10" : "bg-white/40 border-white/80",
    card: isDarkMode ? "bg-white/5 border-white/5 hover:bg-white/10" : "bg-white/60 border-white/80 hover:bg-white shadow-sm hover:shadow-lg",
    questionCard: isDarkMode ? "bg-[#1E293B]/80 border-white/10 hover:bg-[#1E293B]" : "bg-white/90 border-slate-200 hover:bg-white shadow-sm",
    optionBtn: isDarkMode ? "bg-white/5 text-slate-300 border-white/10 hover:border-violet-400/50 hover:bg-white/10" : "bg-slate-50 text-slate-600 border-slate-200 hover:border-violet-300 hover:bg-white",
    optionActive: isDarkMode ? "bg-violet-600 text-white border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.4)] scale-105" : "bg-violet-600 text-white border-violet-700 shadow-lg shadow-violet-500/30 scale-105",
    radarBg: isDarkMode ? "bg-[#0F172A] border-white/5" : "bg-slate-50 border-slate-100/50 shadow-inner",
    chartGrid: isDarkMode ? "#334155" : "#e2e8f0",
    chartText: isDarkMode ? "#cbd5e1" : "#475569",
  };

  if (loading) return <div className="h-screen flex items-center justify-center font-bold text-violet-400 bg-[#0B0F19]">AIEUS Yükleniyor...</div>;
  if (!aktifKullanici) return <Login onLoginSuccess={(userObj) => setAktifKullanici(userObj)} />;

  // GEÇMİŞ RAPORLARI İNDİRME KISMI

  const gecmisRaporuIndir = (rapor) => {
    const isim = aktifKullanici?.isim || 'Kullanıcı';
    const soyisim = aktifKullanici?.soyisim || '';
    const rol = aktifKullanici?.rol === 'admin' ? 'Yönetici' : 'Çalışan';

    // Veritabanından gelen veri isimlerinde uyuşmazlık olma ihtimaline karşı GÜVENLİK AĞI
    const skor = rapor.toplam_skor || rapor.puan || 0;
    const cmmi = rapor.cmmi_seviyesi || Math.max(1, Math.round(skor / 20));
    const islemTarihi = rapor.tarih || new Date().toLocaleDateString();
    const islemId = rapor.id || Math.floor(Math.random() * 10000);

    // 1. HTML'i bir DOM elementi olarak değil, doğrudan "Metin (String)" olarak tanımlıyoruz.
    // Böylece ekran dışına itme (left: -9999px) hatasından kurtuluyoruz.
    const htmlSablonu = `
      <div style="padding: 40px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; background-color: #ffffff; width: 800px;">
        
        <div style="border-bottom: 3px solid #7c3aed; padding-bottom: 20px; margin-bottom: 30px;">
          <h1 style="color: #4c1d95; margin: 0; font-size: 32px;">AIEUS Kurumsal Etik Raporu</h1>
          <p style="color: #64748b; margin-top: 8px; font-size: 14px;">Kurumsal Kurallar (RAG) Destekli Akıllı Değerlendirme Sistemi</p>
        </div>

        <div style="display: flex; justify-content: space-between; margin-bottom: 40px;">
          <div>
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Kullanıcı Bilgileri</p>
            <p style="margin: 5px 0 0 0; font-size: 18px; font-weight: 600;">${aktifKullanici.isim.toUpperCase()} ${aktifKullanici.soyisim.toUpperCase()}</p>
            <p style="margin: 5px 0 0 0; color: #475569;">Ünvan: ${rol}</p>
          </div>
          <div style="text-align: right;">
            <p style="margin: 0; color: #64748b; font-size: 12px; text-transform: uppercase; font-weight: bold;">Değerlendirme Tarihi</p>
            <p style="margin: 5px 0 0 0; font-size: 16px; font-weight: 600;">${islemTarihi}</p>
            <p style="margin: 5px 0 0 0; color: #475569;">Referans ID: #${islemId}</p>
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 30px; text-align: center; margin-bottom: 40px;">
          <p style="margin: 0; color: #475569; font-size: 14px; text-transform: uppercase; letter-spacing: 1px;">Ağırlıklı Olgunluk Puanı</p>
          <h2 style="font-size: 64px; color: #7c3aed; margin: 10px 0;">%${skor}</h2>
          
          <div style="display: inline-block; background-color: #ede9fe; color: #6d28d9; padding: 8px 24px; border-radius: 20px; font-weight: bold; margin-top: 10px;">
            CMMI Seviyesi: ${cmmi}
          </div>
        </div>

        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #94a3b8; text-align: center;">
          <p>Bu belge AIEUS platformu tarafından otomatik olarak üretilmiştir. Herhangi bir ıslak imza gerektirmez.</p>
          <p>© ${new Date().getFullYear()} AIEUS Etik Değerlendirme Sistemi</p>
        </div>

      </div>
    `;
    
    // 2. PDF Ayarları (html2canvas'a useCORS ekleyerek render hatalarını önledik)
    const opt = {
      margin:       10,
      filename:     `AIEUS_Raporu_${isim}_${islemTarihi.split(' ')[0]}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true }, 
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // 3. String'i (htmlSablonu) doğrudan fonksiyona yediriyoruz.
    // Eklemek ve çıkarmak için (appendChild vb.) kullandığımız kodları tamamen sildik.
    html2pdf().set(opt).from(htmlSablonu).save();
  };

  return (
    <div className={`flex h-screen font-sans overflow-hidden p-6 relative transition-colors duration-300 ${t.appBg}`}>
      <div className={`absolute top-0 left-1/4 rounded-full pointer-events-none transition-colors duration-300 ${t.meshViolet}`}></div>
      <div className={`absolute bottom-0 right-1/4 rounded-full pointer-events-none transition-colors duration-300 ${t.meshCyan}`}></div>

      {/* SOL MENÜ  BUTONLAR*/}
      <div className={`w-72 backdrop-blur-2xl rounded-3xl flex flex-col justify-between hidden md:flex z-20 border mr-6 shadow-2xl transition-colors duration-300 ${t.glassPanel}`}>
        <div>
          <div className="flex items-center gap-3 px-8 py-8 border-b border-white/10">
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 p-2.5 rounded-2xl shadow-lg shadow-violet-500/20">
              <ShieldCheck size={26} className="text-white" />
            </div>
            <h1 className={`text-3xl font-black tracking-tight transition-colors duration-300 ${t.textMain}`}>AIEUS</h1>
          </div>
          <nav className="px-5 pt-8 space-y-3">   
            <button onClick={() => setAktifSayfa('anasayfa')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-colors duration-300 ${aktifSayfa === 'anasayfa' ? t.navBtnActive : t.navBtnInactive}`}>
              <Home size={20} className={aktifSayfa === 'anasayfa' ? 'text-violet-500' : t.textMuted} /> Ana Ekran
            </button>
            <button onClick={() => setAktifSayfa('anket')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-colors duration-300 ${aktifSayfa === 'anket' ? t.navBtnActive : t.navBtnInactive}`}>
              <FileText size={20} className={aktifSayfa === 'anket' ? 'text-violet-500' : t.textMuted} /> Etik Analiz
            </button>
            <button onClick={handleRaporlaraGecis} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-colors duration-300 ${aktifSayfa === 'raporlar' ? t.navBtnActive : t.navBtnInactive}`}>
              <LayoutDashboard size={20} className={aktifSayfa === 'raporlar' ? 'text-violet-500' : t.textMuted} /> Raporlarım
            </button>
            <button onClick={() => setAktifSayfa('danisman')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-colors duration-300 ${aktifSayfa === 'danisman' ? t.navBtnActive : t.navBtnInactive}`}>
              <MessageSquare size={20} className={aktifSayfa === 'danisman' ? 'text-violet-500' : t.textMuted} /> Etik Danışmanım
            </button>

            {aktifKullanici.rol === 'admin' && (
              <div className="pt-4 mt-4 border-t border-white/10">
                <span className={`px-5 text-[10px] font-black uppercase tracking-widest opacity-50 mb-2 block ${t.textMuted}`}>Yönetici Modülü</span>
                <button onClick={handleKurumsalGecis} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-sm transition-colors duration-300 ${aktifSayfa === 'kurumsal' ? 'bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white shadow-lg shadow-violet-500/20' : t.navBtnInactive}`}>
                  <Users size={20} className={aktifSayfa === 'kurumsal' ? 'text-white' : t.textMuted} /> Kurumsal Takip
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* ÜST BİLGİ ÇUBUĞU */}
        <header className={`backdrop-blur-xl rounded-2xl mb-6 px-8 py-5 flex items-center justify-between z-10 border shadow-lg transition-colors duration-300 ${t.glassPanel}`}>
          <div className={`text-sm font-bold flex items-center gap-2 transition-colors duration-300 ${t.textMuted}`}>
            AIEUS <span className="opacity-50">/</span> <span className={`font-extrabold transition-colors duration-300 ${t.textMain}`}>
              {aktifSayfa === 'anasayfa' ? 'Özet Panel' : aktifSayfa === 'anket' ? 'Etik Değerlendirme' : aktifSayfa === 'kurumsal' ? 'Kurumsal Takip' : 'Raporlar' ? 'Etik Danışmanım' : aktifSayfa === 'danisman'}
            </span>
          </div>
          <div className="flex items-center gap-5">
            <button onClick={() => setIsDarkMode(!isDarkMode)} className={`p-2.5 rounded-xl border relative transition-colors duration-300 ${t.iconBtn}`} title="Tema Değiştir">
              {isDarkMode ? <Sun size={18} className="text-amber-400" /> : <Moon size={18} className="text-violet-600" />}
            </button>
            <div className="flex items-center gap-3 pl-5 border-l border-white/20 cursor-pointer group" onClick={cikisYap}>
              <div className="w-10 h-10 rounded-xl bg-violet-500/20 text-violet-500 font-extrabold flex items-center justify-center border border-violet-500/30 group-hover:bg-violet-500 group-hover:text-white transition-colors duration-300 uppercase">
                {aktifKullanici.isim ? aktifKullanici.isim.charAt(0) : 'U'}
              </div>
              <div className="text-left hidden md:block">
                <p className={`text-sm font-extrabold leading-tight transition-colors duration-300 ${t.textMain}`}>
                  {aktifKullanici.isim ? `${aktifKullanici.isim} ${aktifKullanici.soyisim}`.toUpperCase() : 'KULLANICI'}
                </p>
                <p className={`text-[11px] font-medium transition-colors duration-300 ${t.textMuted}`}>
                  {aktifKullanici.kurum_adi ? aktifKullanici.kurum_adi : 'Bağımsız'} / {aktifKullanici.rol === 'admin' ? 'Yönetici' : 'Çalışan'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10 relative">
          
          {/* ANA SAYFA - 3 KART GERİ GELDİ! */}
          {aktifSayfa === 'anasayfa' && (
             <div className="animate-fade-in-up max-w-6xl mx-auto space-y-8">
                <div className={`rounded-[2rem] p-12 relative overflow-hidden shadow-2xl border transition-colors duration-300 ${t.banner}`}>
                  <div className="absolute top-0 right-0 w-64 h-64 bg-violet-500/20 rounded-full blur-[80px]"></div>
                  <div className="relative z-10 md:w-3/4">
                    <span className={`bg-violet-500/20 ${isDarkMode ? 'text-violet-300' : 'text-violet-700 bg-white'} text-xs font-bold px-4 py-2 rounded-full mb-6 inline-block border border-violet-500/30 uppercase tracking-wider`}>
                      AIEUS CORE v1.0
                    </span>
                    <h2 className={`text-4xl md:text-5xl font-extrabold mb-6 leading-tight tracking-tight transition-colors duration-300 ${isDarkMode ? 'text-white' : 'text-slate-950'}`}>
                      Yapay Zekanın <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">Etik Sınırlarını Keşfedin</span>
                    </h2>
                    <p className={`text-lg mb-10 leading-relaxed font-medium max-w-2xl transition-colors duration-300 ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                      Sisteminizin şeffaflık, adalet ve güvenlik faktörlerindeki risk haritasını çıkartın. Algoritmalarınızın insanlığa uyumunu bilimsel verilerle ölçün.
                    </p>
                    <button onClick={() => setAktifSayfa('anket')} className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-4 px-10 rounded-2xl flex items-center gap-3 transition-colors duration-300 shadow-lg shadow-violet-600/30">
                      Değerlendirmeyi Başlat <ArrowRight size={20} />
                    </button>
                  </div>
              </div>

              {/* İŞTE O KAYBOLAN 3 KUTU BURADA */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                  { title: 'Çok Boyutlu Analiz', desc: 'Önyargı testleri ve hesap verilebilirlik standartlarını değerlendirin.', icon: Target, color: 'text-violet-500', bg: 'bg-violet-500/10' },
                  { title: 'Kurumsal Dashboard', desc: 'Zaman serisi trendleri ile risk haritanızı anlık görün.', icon: LayoutDashboard, color: 'text-fuchsia-500', bg: 'bg-fuchsia-500/10' },
                  { title: 'AI Gelişim Planı', desc: 'Sonuçlarınıza göre öncelikli aksiyon listesi oluşturun.', icon: Award, color: 'text-cyan-500', bg: 'bg-cyan-500/10' },
                ].map((item, i) => (
                  <div key={i} className={`backdrop-blur-xl p-8 rounded-3xl border transition-colors duration-300 ${t.card}`}>
                    <div className={`w-14 h-14 ${item.bg} ${item.color} rounded-2xl flex items-center justify-center mb-6 border border-white/10`}><item.icon size={28} /></div>
                    <h3 className={`text-xl font-extrabold mb-3 tracking-tight transition-colors duration-300 ${t.textMain}`}>{item.title}</h3>
                    <p className={`text-sm leading-relaxed font-medium transition-colors duration-300 ${t.textMuted}`}>{item.desc}</p>
                  </div>
                ))}
              </div>
             </div>
          )}

          {/* RAPORLARIM EKRANI */}
          {aktifSayfa === 'raporlar' && (
            <div className="animate-fade-in-up max-w-5xl mx-auto space-y-6 p-4">
              <div className="mb-8">
                <h2 className={`text-3xl font-extrabold tracking-tight mb-2 ${t.textMain}`}>Geçmiş Analizlerim</h2>
                <p className={`font-medium ${t.textMuted}`}>Daha önce çözdüğünüz tüm etik değerlendirme anketlerinin sonuçları ve gelişiminiz.</p>
              </div>

              {raporLoading ? (
                <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full"></div></div>
              ) : gecmisRaporlar.length === 0 ? (
                <div className="p-10 bg-white/5 border border-white/10 rounded-3xl text-center backdrop-blur-xl">
                  <FileText size={48} className="mx-auto text-violet-500/50 mb-4" />
                  <h3 className={`text-xl font-bold mb-2 ${t.textMain}`}>Henüz Raporunuz Yok</h3>
                  <p className={t.textMuted}>Sistemde kayıtlı bir etik analiz sonucunuz bulunmuyor. Hemen bir anket çözerek başlayabilirsiniz.</p>
                  <button onClick={() => setAktifSayfa('anket')} className="mt-6 bg-violet-600 text-white font-bold py-3 px-8 rounded-xl">Teste Başla</button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {gecmisRaporlar.map((rapor) => (
                    <div key={rapor.id} className={`backdrop-blur-xl p-6 rounded-3xl border transition-all duration-300 hover:-translate-y-1 ${t.glassPanel}`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-xl text-white shadow-lg ${
                            rapor.cmmi_seviyesi >= 4 ? 'bg-emerald-500 shadow-emerald-500/30' : 
                            rapor.cmmi_seviyesi === 3 ? 'bg-amber-500 shadow-amber-500/30' : 'bg-rose-500 shadow-rose-500/30'
                          }`}>
                            {rapor.cmmi_seviyesi}
                          </div>
                          <div>
                            <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>CMMI Seviyesi</p>
                            <h4 className={`text-lg font-bold ${t.textMain}`}>{rapor.tarih}</h4>
                          </div>
                        </div>
                        <div className="bg-white/5 px-3 py-1 rounded-lg border border-white/10 text-xs font-bold text-slate-400">
                          Skor: {rapor.toplam_skor}
                        </div>
                      </div>
                      <p className={`text-sm font-medium mb-6 line-clamp-2 ${t.textMuted}`}>
                        {rapor.sonuc_metni || "Etik risk analizi tamamlandı."}
                      </p>
                      <div className="flex gap-3">
                        <button onClick={() => gecmisRaporuIndir(rapor)} className="flex-1 bg-violet-600/10 hover:bg-violet-600/20 text-violet-500 border border-violet-500/30 font-bold py-2.5 rounded-xl transition-colors text-sm">
                          Raporu İndir
                        </button>
                        <button onClick={() => setAktifSayfa('anasayfa')} className="flex-1 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:opacity-90 text-white font-bold py-2.5 rounded-xl transition-colors shadow-lg shadow-violet-500/20 text-sm flex items-center justify-center gap-2">
                          <Award size={16} /> Paneli Gör
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ANKET EKRANI */}
          {aktifSayfa === 'anket' && (
            <div className="max-w-4xl mx-auto animate-fade-in-up space-y-6">
               <div className={`backdrop-blur-xl rounded-3xl p-8 border transition-colors duration-300 ${t.questionCard}`}>
                <div className="flex justify-between items-center mb-5">
                  <h2 className={`text-2xl font-extrabold tracking-tight transition-colors duration-300 ${t.textMain}`}>Etik Risk Değerlendirmesi</h2>
                  <span className={`text-sm font-bold bg-violet-500/20 px-4 py-2 rounded-full border border-violet-500/30 transition-colors duration-300 ${isDarkMode ? 'text-violet-300' : 'text-violet-700'}`}>{progress}% Tamamlandı</span>
                </div>
                <div className={`w-full rounded-full h-3 border transition-colors duration-300 ${isDarkMode ? 'bg-[#0F172A] border-white/5' : 'bg-slate-100 border-slate-200 p-0.5'}`}>
                  <div className={`h-full rounded-full transition-all duration-300 ${isDarkMode ? 'bg-gradient-to-r from-violet-500 to-cyan-400 shadow-[0_0_15px_rgba(139,92,246,0.5)]' : 'bg-gradient-to-r from-violet-500 to-fuchsia-400 shadow-sm'}`} style={{ width: `${progress}%` }}></div>
                </div>
              </div>

              {gosterilenSorular.map((soru, index) => {
                const gercekSoruNo = (mevcutSayfa - 1) * sorularSayfaBasina + index + 1;
                return (
                  <div key={soru.id} className={`backdrop-blur-xl rounded-3xl border p-8 transition-colors duration-300 ${t.questionCard}`}>
                    <h3 className={`text-lg font-bold mb-9 leading-snug transition-colors duration-300 ${t.textMain}`}>{gercekSoruNo}. {soru.soru_metni}</h3>
                    <div className="grid grid-cols-5 gap-4">
                      {[1, 2, 3, 4, 5].map((puan, i) => {
                        const seciliMi = cevaplar[soru.id] === puan;
                        return (
                          <div key={puan} className="flex flex-col items-center">
                            <button onClick={() => handleCevap(soru.id, puan)} className={`w-full py-5 rounded-2xl font-black text-xl border transition-colors duration-300 ${seciliMi ? t.optionActive : t.optionBtn}`}>
                              {puan}
                            </button>
                            <span className={`text-[11px] font-bold text-center mt-3.5 px-1 leading-tight h-8 flex items-center transition-colors duration-300 ${t.textMuted}`}>{etiketler[i]}</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
              
              <div className="mt-10 flex justify-between items-center pb-12">
                <button onClick={() => setMevcutSayfa(prev => Math.max(prev - 1, 1))} disabled={mevcutSayfa === 1} className={`px-8 py-4 rounded-2xl font-bold transition-colors duration-300 ${mevcutSayfa === 1 ? 'opacity-0 cursor-default' : (isDarkMode ? 'bg-white/10 text-white hover:bg-white/20' : 'bg-slate-200 text-slate-700 hover:bg-slate-300')}`}>
                  Önceki Sayfa
                </button>
                <div className={`font-bold text-sm ${t.textMuted}`}>Sayfa {mevcutSayfa} / {toplamSayfa}</div>
                {mevcutSayfa < toplamSayfa ? (
                  <button onClick={() => setMevcutSayfa(prev => Math.min(prev + 1, toplamSayfa))} className={`px-8 py-4 rounded-2xl font-bold text-white shadow-lg transition-colors duration-300 bg-violet-600 hover:bg-violet-500`}>
                    Sonraki Sayfa
                  </button>
                ) : (
                  <button onClick={handleTestiBitir} className={`px-8 py-4 rounded-2xl font-bold text-lg transition-colors duration-300 ${isDarkMode ? 'bg-cyan-500 text-slate-900 hover:bg-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)]' : 'bg-slate-900 text-white hover:bg-slate-800 shadow-xl'}`}>
                    Analizi Tamamla
                  </button>
                )}
              </div>
            </div>
          )}

          {/* SONUÇ EKRANI (Akıllı Gelişim Planı ve LLM Çağrısı Burada) */}
          {aktifSayfa === 'sonuc' && sonuc && (
            <div className="animate-fade-in-up max-w-6xl mx-auto space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                 <div className={`backdrop-blur-xl rounded-[2rem] p-12 flex flex-col items-center justify-center text-center border transition-colors duration-300 ${t.glassPanel}`}>
                  <div className={`w-36 h-36 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center text-6xl font-black text-white shadow-[0_0_30px_rgba(245,158,11,0.3)] mb-8 border-4 transition-colors duration-300 ${isDarkMode ? 'border-[#0B0F19]' : 'border-white'}`}>
                    {sonuc.cmmi_seviyesi}
                  </div>
                  <h2 className={`text-3xl font-extrabold mb-3 tracking-tight transition-colors duration-300 ${t.textMain}`}>Seviye {sonuc.cmmi_seviyesi}</h2>
                  <p className={`font-medium text-sm mb-10 transition-colors duration-300 ${t.textMuted}`}>Ağırlıklı Olgunluk Puanınız: <strong>%{Math.round((sonuc.toplam_skor / 60) * 100)}</strong></p>
                  <button onClick={() => setAktifSayfa('anasayfa')} className="text-violet-500 font-bold hover:text-violet-400 flex items-center gap-2 bg-violet-500/10 px-6 py-3 rounded-xl border border-violet-500/20 transition-colors duration-300">
                    <Home size={18}/> Ana Sayfaya Dön
                  </button>
                </div>

                <div className={`backdrop-blur-xl rounded-[2rem] p-10 border transition-colors duration-300 ${t.glassPanel}`}>
                  <h3 className={`text-2xl font-extrabold mb-8 tracking-tight flex items-center gap-3 transition-colors duration-300 ${t.textMain}`}>
                      <Target className="text-fuchsia-400" /> Etik Boyut Analizi
                  </h3>
                  <div className={`h-80 w-full rounded-3xl p-4 border transition-colors duration-300 ${t.radarBg}`}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={radarData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} vertical={false} />
                        <XAxis dataKey="subject" tick={{ fill: t.chartText, fontWeight: 600, fontSize: 13 }} axisLine={false} tickLine={false} />
                        <YAxis domain={[0, 100]} tick={{ fill: t.chartText }} axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: isDarkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#fff' : '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                        <Bar dataKey="A" name="Puan" fill="#8b5cf6" radius={[8, 8, 0, 0]} maxBarSize={80} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* GELİŞİM PLANI LİSTESİ */}
              <div className={`backdrop-blur-xl rounded-[2rem] p-10 border transition-colors duration-300 ${t.glassPanel}`}>
                <h2 className={`text-3xl font-extrabold mb-8 tracking-tight ${t.textMain}`}>Öncelikli Aksiyonlarınız</h2>
                
                {aksiyonPlani.length === 0 ? (
                  <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-4 text-emerald-400 font-bold">
                    <ShieldCheck size={28} /> Harika! Test sonuçlarınıza göre kritik etik zafiyet tespit edilmedi.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {aksiyonPlani.map((aksiyon, i) => {
                      const renkler = {
                        Kritik: { badgeBg: "bg-rose-500/20", badgeText: "text-rose-500", btnText: "text-rose-500", btnHover: "hover:text-rose-400", btnBg: "bg-rose-500/10" },
                        Orta: { badgeBg: "bg-amber-500/20", badgeText: "text-amber-500", btnText: "text-amber-500", btnHover: "hover:text-amber-400", btnBg: "bg-amber-500/10" },
                        Düşük: { badgeBg: "bg-blue-500/20", badgeText: "text-blue-500", btnText: "text-blue-500", btnHover: "hover:text-blue-400", btnBg: "bg-blue-500/10" }
                      };
                      const r = renkler[aksiyon.renkTipi];

                      return (
                        <div key={i} className={`p-6 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-6 transition-all ${isDarkMode ? 'bg-[#0F172A] border-white/5' : 'bg-slate-50 border-slate-200'}`}>
                          <div className="flex-1">
                             <div className="flex items-center gap-3 mb-3">
                                <span className={`${r.badgeBg} ${r.badgeText} text-[10px] font-black uppercase px-3 py-1 rounded-md border`}>{aksiyon.etiketYazisi}</span>
                                <span className={`text-xs font-bold ${t.textMuted}`}>{aksiyon.boyut}</span>
                             </div>
                             <h4 className={`text-xl font-bold mb-2 ${t.textMain}`}>{aksiyon.seviyeBaslik}</h4>
                          </div>
                          
                          <button 
                            onClick={async () => { 
                              setSeciliEgitim(aksiyon); 
                              setEgitimModalAcik(true); 
                              setLlmLoading(true);
                              try {
                                const response = await fetch('http://127.0.0.1:8000/api/llm_tavsiye', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ kullanici_ismi: aktifKullanici.isim, boyut_adi: aksiyon.boyut, puan: aksiyon.puan })
                                });
                                const data = await response.json();
                                if(data.hata) {
                                  setSeciliEgitim(prev => ({ ...prev, llm_tavsiyesi: "Hata: " + data.hata }));
                                } else {
                                  setSeciliEgitim(prev => ({ ...prev, llm_tavsiyesi: data.tavsiye, videolar: data.videolar }));
                                }
                              } catch(err) {
                                setSeciliEgitim(prev => ({ ...prev, llm_tavsiyesi: "Sisteme ulaşılamadı." }));
                              } finally {
                                setLlmLoading(false);
                              }
                            }}
                            className={`${r.btnText} font-bold ${r.btnHover} flex items-center gap-2 ${r.btnBg} px-5 py-3 rounded-xl`}
                          >
                            Eğitime Git <ArrowRight size={16} />
                          </button>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

              {/* RAG DESTEKLİ ETİK DANIŞMAN (CHATBOT) EKRANI */}
          {aktifSayfa === 'danisman' && (
            <div className="animate-fade-in-up max-w-4xl mx-auto h-[80vh] flex flex-col">
              
              {/* Chat Başlığı */}
              <div className={`backdrop-blur-xl p-6 rounded-t-3xl border-t border-x flex items-center gap-5 transition-colors duration-300 ${t.glassPanel}`}>
                <div className="w-14 h-14 bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-violet-500/30">
                  <MessageSquare size={28} />
                </div>
                <div>
                  <h2 className={`text-2xl font-black tracking-tight ${t.textMain}`}>Etik Danışmanım</h2>
                  <p className={`text-sm font-bold mt-1 ${t.textMuted}`}>Kurumsal Kurallar (RAG) Destekli Akıllı Asistan</p>
                </div>
              </div>

              {/* Mesajlaşma Alanı */}
              <div className={`flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8 border-x transition-colors duration-300 ${isDarkMode ? 'bg-[#0B0F19]/50 border-white/5' : 'bg-white/50 border-slate-200'}`}>
                {mesajlar.map((msg, i) => {
                  // msg.rol bazen 'kullanici' bazen 'user' gelebilir, ikisini de kapsıyoruz.
                  const isUser = msg.rol === 'kullanici' || msg.rol === 'user';
                  
                  return (
                    <div key={i} className={`flex w-full ${isUser ? 'justify-end' : 'justify-start'}`}>
                      
                      {/* YAPAY ZEKA AVATARI */}
                      {!isUser && (
                        <div className="flex-shrink-0 mr-4 mt-2">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-[#1E293B] border border-white/10' : 'bg-white border border-slate-200'}`}>
                            <ShieldCheck size={24} className="text-violet-500" />
                          </div>
                        </div>
                      )}

                      {/* MESAJ BALONU */}
                      <div className={`max-w-[80%] rounded-3xl p-6 shadow-md ${
                        isUser 
                          ? 'bg-violet-600 text-white rounded-br-sm shadow-violet-600/20' 
                          : (isDarkMode ? 'bg-[#1E293B] border border-white/10 text-slate-200 rounded-bl-sm' : 'bg-white border border-slate-200 text-slate-800 rounded-bl-sm')
                      }`}>
                        
                        {/* Metin Boyutu Büyütüldü (text-sm -> text-base) */}
                        <p className="text-base font-medium leading-relaxed whitespace-pre-wrap">{msg.metin || msg.mesaj}</p>
                        
                        {/* JÜRİYİ VURACAK KISIM: REFERANS KURALLAR (KAYNAKÇA) */}
                        {msg.kurallar && (
                          <div className={`mt-5 pt-4 text-xs font-semibold border-t ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                            <span className="flex items-center gap-2 mb-2 text-violet-400">
                              <ShieldCheck size={16}/> Yapay Zeka Bu Cevabı Şu Kurallara Bakarak Üretti:
                            </span>
                            {/* Sol tarafa şık bir çizgi eklendi */}
                            <div className="whitespace-pre-wrap opacity-90 leading-relaxed italic border-l-2 border-violet-500/30 pl-3 ml-1">
                              {msg.kurallar}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                
                {/* Yükleniyor Animasyonu */}
                {chatLoading && (
                  <div className="flex justify-start">
                    <div className="flex-shrink-0 mr-4 mt-2">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${isDarkMode ? 'bg-[#1E293B] border border-white/10' : 'bg-white border border-slate-200'}`}>
                        <ShieldCheck size={24} className="text-violet-500 animate-pulse" />
                      </div>
                    </div>
                    <div className={`max-w-[80%] rounded-3xl rounded-bl-sm p-6 flex items-center gap-3 ${isDarkMode ? 'bg-[#1E293B] border border-white/10' : 'bg-white border border-slate-200 shadow-sm'}`}>
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce"></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      <div className="w-2.5 h-2.5 rounded-full bg-violet-500 animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                    </div>
                  </div>
                )}
              {/* İŞTE BURAYA EKLİYORUZ: OTO-SCROLL İÇİN GÖRÜNMEZ HEDEF */}
              <div ref={mesajlarinSonuRef} />
              </div>

              {/* Mesaj Gönderme Çubuğu */}
              <form onSubmit={mesajGonder} className={`backdrop-blur-xl p-5 rounded-b-3xl border transition-colors duration-300 flex items-center gap-4 ${t.glassPanel}`}>
                <input
                  type="text"
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="Yapay zeka etiğiyle ilgili bir soru sorun..."
                  className={`flex-1 bg-transparent border-none focus:ring-0 text-base font-medium px-4 py-2 outline-none ${t.textMain} placeholder:text-slate-500`}
                />
                <button disabled={chatLoading || !chatInput.trim()} type="submit" className="w-14 h-14 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-2xl flex items-center justify-center transition-colors shadow-lg shadow-violet-500/30">
                  <Send size={24} />
                </button>
              </form>
              
            </div>
          )}

          {/* KURUMSAL KOKPİT - GERİ GELDİ! */}
          {aktifSayfa === 'kurumsal' && (
            <div id="pdf-rapor-alani" className="animate-fade-in-up max-w-6xl mx-auto space-y-8 p-4">
              <div className="flex justify-between items-end mb-4">
                <div>
                  <h2 className={`text-3xl font-extrabold tracking-tight mb-2 ${t.textMain}`}>
                    Kurumsal Etik Karnesi: <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-500 to-fuchsia-500">{aktifKullanici.kurum_adi}</span>
                  </h2>
                  <p className={`font-medium ${t.textMuted}`}>Şirketinizdeki tüm çalışanların anonimleştirilmiş etik skor ortalamaları.</p>
                </div>
                <div className="flex gap-3" data-html2canvas-ignore="true">
                  <button id="excel-indir-btn" onClick={excelIndir} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-emerald-500/20 transition-all text-sm flex items-center gap-2">
                    <FileSpreadsheet size={18} /> Verileri İndir (Excel)
                  </button>
                  <button id="pdf-indir-btn" onClick={pdfIndir} className="bg-violet-600 hover:bg-violet-500 text-white font-bold py-2.5 px-6 rounded-xl shadow-lg shadow-violet-500/20 transition-all text-sm flex items-center gap-2">
                    Sunum İndir (PDF)
                  </button>
                </div>
              </div>

              {kurumsalHata ? (
                <div className="p-8 bg-white/5 border border-white/10 rounded-3xl text-center backdrop-blur-xl">
                  <AlertTriangle size={48} className="mx-auto text-amber-500 mb-4 opacity-80" />
                  <h3 className={`text-xl font-bold mb-2 ${t.textMain}`}>Veri Yetersiz</h3>
                  <p className={t.textMuted}>{kurumsalHata}</p>
                </div>
              ) : kurumsalOzet ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in-up">
                    <div className={`backdrop-blur-xl p-6 rounded-3xl border flex items-center gap-5 transition-colors duration-300 ${t.glassPanel}`}>
                      <div className="w-14 h-14 bg-blue-500/20 text-blue-400 rounded-2xl flex items-center justify-center border border-blue-500/30"><Users size={28} /></div>
                      <div>
                        <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>Testi Çözen Çalışan</p>
                        <h4 className={`text-3xl font-black ${t.textMain}`}>{kurumsalOzet.kisi_sayisi} <span className="text-sm font-medium text-blue-400 ml-2">Kişi</span></h4>
                      </div>
                    </div>
                    <div className={`backdrop-blur-xl p-6 rounded-3xl border flex items-center gap-5 transition-colors duration-300 ${t.glassPanel}`}>
                      <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center border border-emerald-500/30"><TrendingUp size={28} /></div>
                      <div>
                        <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>Ortalama CMMI</p>
                        <h4 className={`text-3xl font-black ${t.textMain}`}>{kurumsalOzet.ortalama_cmmi} <span className="text-sm font-medium text-emerald-400 ml-2">/ 5.0</span></h4>
                      </div>
                    </div>
                    <div className={`backdrop-blur-xl p-6 rounded-3xl border flex items-center gap-5 transition-colors duration-300 ${t.glassPanel}`}>
                      <div className="w-14 h-14 bg-rose-500/20 text-rose-400 rounded-2xl flex items-center justify-center border border-rose-500/30"><AlertTriangle size={28} /></div>
                      <div>
                        <p className={`text-sm font-bold uppercase tracking-wider mb-1 ${t.textMuted}`}>En Yüksek Risk</p>
                        <h4 className={`text-2xl font-black ${t.textMain}`}>{kurumsalOzet.en_riskli_boyut}</h4>
                      </div>
                    </div>
                  </div>

                  <div className={`backdrop-blur-xl rounded-[2rem] p-10 border transition-colors duration-300 animate-fade-in-up delay-100 ${t.glassPanel}`}>
                    <h3 className={`text-xl font-extrabold mb-8 tracking-tight flex items-center gap-3 ${t.textMain}`}>
                      Boyut Bazlı Şirket İçi Ortalamalar
                    </h3>
                    <div className={`h-96 w-full rounded-3xl p-6 border transition-colors duration-300 ${t.radarBg}`}>
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={kurumsalOzet.grafik_verisi} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke={t.chartGrid} vertical={false} />
                          <XAxis dataKey="name" tick={{ fill: t.chartText, fontWeight: 600, fontSize: 13 }} axisLine={false} tickLine={false} />
                          <YAxis domain={[0, 100]} tick={{ fill: t.chartText }} axisLine={false} tickLine={false} />
                          <Tooltip cursor={{ fill: isDarkMode ? '#1e293b' : '#f1f5f9' }} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: isDarkMode ? '#0f172a' : '#ffffff', color: isDarkMode ? '#fff' : '#000', boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }} />
                          <Bar dataKey="sirketOrtalamasi" name="Şirket Ortalaması" fill="#8b5cf6" radius={[6, 6, 0, 0]} maxBarSize={50} />
                          <Bar dataKey="sektorOrtalamasi" name="Sektör Ortalaması" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={50} opacity={0.6} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                    {/* ÇALIŞAN TAKİBİ İÇİN TABLO */}
                  <div className={`mt-8 p-6 rounded-[2rem] border transition-colors duration-300 animate-fade-in-up delay-200 ${t.glassPanel}`}>
                    <h3 className={`text-xl font-extrabold mb-6 tracking-tight ${t.textMain}`}>Çalışan Etik Skor Tablosu</h3>
                    <div className="overflow-x-auto custom-scrollbar">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className={`border-b text-xs font-black uppercase tracking-widest ${isDarkMode ? 'border-white/10 text-slate-400' : 'border-slate-200 text-slate-500'}`}>
                            <th className="pb-4 pl-2">Çalışan Adı</th>
                            <th className="pb-4">Ünvan / Rol</th>
                            <th className="pb-4">Son Skor</th>
                            <th className="pb-4">CMMI Seviyesi</th>
                          </tr>
                        </thead>
                        <tbody className={t.textMain}>
                          {kurumsalOzet.calisanlar?.map((calisan) => (
                            <tr key={calisan.id} className={`border-b transition-colors hover:bg-black/5 ${isDarkMode ? 'border-white/5 hover:bg-white/5' : 'border-slate-100 hover:bg-slate-50'}`}>
                              <td className="py-4 pl-2 font-medium flex items-center gap-4">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 flex items-center justify-center text-white font-extrabold text-sm shadow-md">
                                  {calisan.isim_soyisim.charAt(0)}
                                </div>
                                {calisan.isim_soyisim}
                              </td>
                              <td className={`py-4 text-sm font-medium ${t.textMuted}`}>
                                {calisan.rol === 'admin' ? 'Yönetici' : 'Çalışan'}
                              </td>
                              <td className="py-4">
                                {calisan.puan === "Girilmedi" ? (
                                  <span className="text-rose-500 italic text-sm font-bold bg-rose-500/10 px-3 py-1 rounded-lg">Teste Girmedi</span>
                                ) : (
                                  <span className="font-extrabold text-emerald-500 text-lg">%{calisan.puan}</span>
                                )}
                              </td>
                              <td className="py-4">
                                {calisan.cmmi_seviyesi !== "-" && (
                                  <span className="bg-violet-500/10 text-violet-500 py-1.5 px-3 rounded-lg text-xs font-bold border border-violet-500/20 uppercase tracking-wider">
                                    Seviye {calisan.cmmi_seviyesi}
                                  </span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  </div>
                </>
              ) : (
                <div className="flex justify-center py-20"><div className="animate-spin w-10 h-10 border-4 border-violet-500 border-t-transparent rounded-full"></div></div>
              )}
            </div>
          )}

        </main>
        
        {/* EKSİK SORU MODALI */}
        {eksikSorular.length > 0 && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0F19]/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
            <div className={`w-full max-w-md rounded-3xl p-8 shadow-2xl border ${isDarkMode ? 'bg-[#1E293B] border-white/10' : 'bg-white border-slate-200'}`}>
              <div className="flex flex-col items-center text-center">
                <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-6 border border-rose-500/30">
                  <AlertTriangle size={32} />
                </div>
                <h3 className={`text-2xl font-black mb-2 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>Eksik Sorular Var!</h3>
                <p className={`text-base font-medium mb-8 leading-relaxed ${isDarkMode ? 'text-slate-300' : 'text-slate-600'}`}>
                  Analizi tamamlamadan önce lütfen aşağıdaki soruları cevaplayınız:<br/><br/>
                  <span className="font-extrabold text-rose-500 text-xl tracking-wider">{eksikSorular.join(', ')}. Sorular</span>
                </p>
                <button onClick={eksikSorularaGit} className="w-full py-4 rounded-xl font-bold text-white bg-rose-600 hover:bg-rose-500 transition-colors shadow-lg shadow-rose-500/30">
                  Tamam, İlk Eksik Soruya Git
                </button>
              </div>
            </div>
          </div>
        )}

        {/* EĞİTİM MODALI (IFRAME İLE) */}
        {egitimModalAcik && seciliEgitim && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0B0F19]/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <div className={`w-full max-w-xl max-h-[90vh] overflow-y-auto custom-scrollbar rounded-[2rem] p-8 shadow-2xl relative border ${isDarkMode ? 'bg-[#0B0F19] border-white/10 text-white' : 'bg-white border-slate-200 text-slate-900'}`}>
              
              <div className="flex items-center gap-3 mb-8 mt-2">
                <div className="w-12 h-12 bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 rounded-2xl flex items-center justify-center">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="10 8 16 12 10 16 10 8"></polygon></svg>
                </div>
                <div>
                  <h3 className="text-xl font-bold">Özel Eğitim Modülü</h3>
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">{seciliEgitim.boyut}</span>
                </div>
              </div>

              {llmLoading ? (
                <div className="py-16 flex flex-col items-center justify-center space-y-5">
                  <div className="animate-spin w-14 h-14 border-4 border-indigo-500 border-t-transparent rounded-full shadow-[0_0_15px_rgba(99,102,241,0.5)]"></div>
                  <p className="font-bold text-slate-400 animate-pulse text-center">Yapay Zeka raporunuzu analiz ediyor<br/>ve size özel videoları seçiyor...</p>
                </div>
              ) : (
                <div className="animate-fade-in-up">
                  <h2 className="text-2xl font-black mb-4">Gelişim Tavsiyesi</h2>
                  
                  {/* YENİ NESİL, OKUNABİLİR LLM UI KISMI (Maddeler Halinde Kartlar) */}
                  <div className="space-y-3 mb-8">
                    {seciliEgitim.llm_tavsiyesi.split('\n').filter(p => p.trim() !== '').map((paragraf, idx) => (
                      <div key={idx} className={`p-4 rounded-xl text-sm font-medium leading-relaxed shadow-sm border flex items-start gap-4 ${isDarkMode ? 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10' : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-white'} transition-colors duration-300`}>
                        {/* Küçük, parlayan mor bir nokta */}
                        <div className="w-2 h-2 rounded-full bg-violet-500 mt-1.5 shrink-0 shadow-[0_0_10px_rgba(139,92,246,0.8)]"></div>
                        <p>{paragraf.replace(/^[*-]\s*/, '').trim()}</p>
                      </div>
                    ))}
                  </div>

                  {/* VİDEO İFRAME KISMI (Buradan sonra aynen devam ediyor ama loading="lazy" ekliyoruz) */}
                  {seciliEgitim.videolar && seciliEgitim.videolar.length > 0 && (
                    <div className="space-y-5 mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <div className="w-2 h-6 bg-rose-500 rounded-full"></div>
                        <h4 className="font-bold text-lg">Önerilen Eğitim Videoları</h4>
                      </div>
                      
                      {seciliEgitim.videolar.map((video, idx) => (
                        <div key={idx} className={`rounded-2xl overflow-hidden border shadow-lg transition-all ${isDarkMode ? 'bg-[#1E293B] border-white/10 shadow-black/50' : 'bg-white border-slate-200'}`}>
                          <div className="relative pt-[56.25%]">
                            <iframe
                              className="absolute top-0 left-0 w-full h-full rounded-xl"
                              src={`https://www.youtube.com/embed/${video.id}?rel=0`}
                              title={video.title}
                              frameBorder="0"
                              loading="lazy" 
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            ></iframe>
                          </div>
                          <div className="p-4">
                            <p className="text-sm font-bold line-clamp-1 mb-1">{video.title}</p>
                            <span className="text-[10px] font-black uppercase bg-slate-500/20 text-slate-400 px-2 py-1 rounded-md">
                              Süre: {video.duration}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <button onClick={() => setEgitimModalAcik(false)} className="w-full py-4 font-bold text-white bg-slate-700 hover:bg-slate-600 rounded-xl transition-colors">
                    Eğitimi Kapat
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;