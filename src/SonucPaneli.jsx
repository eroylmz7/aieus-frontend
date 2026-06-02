import React, { useRef } from 'react';
import { Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer, Tooltip } from 'recharts';
import html2pdf from 'html2pdf.js';

// Radar grafiği için Supabase'den gelen verileri formatlayan yardımcı fonksiyon
const formatRadarData = (toplamSkor) => {
  // Gerçek projede her boyutun puanı ayrı ayrı DB'den çekilmelidir.
  // Bu örnekte toplam skora göre (MVP aşaması için) simüle edilmiş bir dağılım yapıyoruz.
  const base = Math.min(toplamSkor, 100); 
  
  return [
    { subject: 'Şeffaflık', A: Math.min(base + 5, 100), fullMark: 100 },
    { subject: 'Adalet', A: Math.max(base - 10, 0), fullMark: 100 },
    { subject: 'Güvenlik', A: Math.min(base + 15, 100), fullMark: 100 },
    { subject: 'Hesap Verilebilirlik', A: Math.max(base - 5, 0), fullMark: 100 },
    { subject: 'Mahremiyet', A: Math.min(base + 10, 100), fullMark: 100 },
    { subject: 'Sorumlu Çıktı Paylaşımı', A: base, fullMark: 100 },
  ];
};

const SonucPaneli = ({ sonucVerisi, kullaniciIsmi }) => {
  // PDF'e dönüştürülecek HTML alanını işaretlemek için referans
  const raporRef = useRef();

  if (!sonucVerisi) return <p className="text-center text-gray-500 mt-10">Henüz sonuç bulunamadı.</p>;

  const { toplam_skor, cmmi_seviyesi, sonuc_metni, tavsiye_metni } = sonucVerisi;
  const radarData = formatRadarData(toplam_skor);

  // PDF İndirme Fonksiyonu
  const pdfIndir = () => {
    const element = raporRef.current;
    const opt = {
      margin:       10,
      filename:     `AIEUS_Etik_Raporu_${kullaniciIsmi || 'Kullanici'}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    html2pdf().set(opt).from(element).save();
  };

  // Seviyeye Göre Renk Belirleme
  const getSeviyeRengi = (seviye) => {
    if (seviye <= 2) return 'text-red-600 bg-red-100';
    if (seviye === 3) return 'text-yellow-600 bg-yellow-100';
    return 'text-green-600 bg-green-100';
  };

  const seviyeRengi = getSeviyeRengi(cmmi_seviyesi);

  return (
    <div className="max-w-4xl mx-auto p-6 bg-gray-50 min-h-screen">
      
      {/* İndirme Butonu (PDF'de görünmeyecek, sadece ekranda) */}
      <div className="flex justify-end mb-4">
        <button 
          onClick={pdfIndir}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded-lg shadow-md transition duration-300 flex items-center"
        >
          <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
          PDF Olarak İndir
        </button>
      </div>

      {/* --- PDF'E DÖNÜŞECEK ALANIN BAŞLANGICI --- */}
      <div ref={raporRef} className="bg-white p-8 rounded-xl shadow-lg border border-gray-200">
        
        {/* Rapor Başlığı */}
        <div className="text-center mb-8 border-b pb-6">
          <h1 className="text-3xl font-extrabold text-gray-800 tracking-tight">AIEUS Etik Değerlendirme Raporu</h1>
          <p className="text-gray-500 mt-2">Kullanıcı: <span className="font-semibold text-indigo-600">{kullaniciIsmi || "Anonim Katılımcı"}</span></p>
          <p className="text-gray-400 text-sm mt-1">Tarih: {new Date().toLocaleDateString('tr-TR')}</p>
        </div>

        {/* Skor ve Seviye Özeti (Yan Yana) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-50 p-6 rounded-lg border flex flex-col justify-center items-center">
            <p className="text-gray-500 text-sm uppercase tracking-wide font-semibold">Toplam Etik Skoru</p>
            <p className="text-5xl font-black text-indigo-600 mt-2">{yuzluk_skor}<span className="text-2xl text-gray-400 font-medium">/100</span></p>
          </div>
          
          <div className={`p-6 rounded-lg border flex flex-col justify-center items-center ${seviyeRengi}`}>
            <p className="text-sm uppercase tracking-wide font-semibold">CMMI Olgunluk Seviyesi</p>
            <p className="text-5xl font-black mt-2">Seviye {cmmi_seviyesi}</p>
            <p className="text-center mt-2 font-medium">{sonuc_metni}</p>
          </div>
        </div>

        {/* Radar Grafiği (Recharts) */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">Etik Boyut Analizi (Radar Grafiği)</h2>
          <div className="w-full h-80 bg-gray-50 rounded-lg border flex justify-center items-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e5e7eb" />
                <PolarAngleAxis dataKey="subject" tick={{ fill: '#4b5563', fontSize: 12, fontWeight: 600 }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fill: '#9ca3af' }} />
                <Tooltip 
                  wrapperStyle={{ backgroundColor: 'white', borderRadius: '8px', border: '1px solid #e5e7eb' }}
                  itemStyle={{ color: '#4f46e5', fontWeight: 'bold' }}
                />
                <Radar name="Skor" dataKey="A" stroke="#4f46e5" strokeWidth={2} fill="#4f46e5" fillOpacity={0.4} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Müfettiş Tavsiyesi (Gemini Çıktısı) */}
        {tavsiye_metni && (
          <div>
            <h2 className="text-xl font-bold text-gray-800 mb-4 border-b pb-2">AI Aksiyon Planı</h2>
            <div className="bg-indigo-50 border-l-4 border-indigo-600 p-6 rounded-r-lg">
              <div className="prose prose-indigo max-w-none text-gray-700 whitespace-pre-wrap">
                {tavsiye_metni}
              </div>
            </div>
          </div>
        )}

      </div>
      {/* --- PDF'E DÖNÜŞECEK ALANIN BİTİŞİ --- */}

    </div>
  );
};

export default SonucPaneli;