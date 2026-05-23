"use client"
import React, { useState, useEffect, useRef } from 'react';
import { Play, Download, Edit, X, Disc } from 'lucide-react';
import { useParams } from 'next/navigation';
import { Particles } from '@/components/ui/particles';
import { LightRays } from '@/components/ui/light-rays';
import { CustomModal } from '@/components/CustomModal';

export default function SharedLinkPage() {
  const params = useParams();
  const token = params.token as string;
  
  const [fileData, setFileData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameData, setRenameData] = useState({ id: null, name: '' });
  const [renameError, setRenameError] = useState("");
  
  const audioRef = useRef<HTMLAudioElement>(null);

  const [modalConfig, setModalConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onClose?: () => void;
    variant?: "danger" | "info";
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, variant: "danger" | "info" = "info") => {
    setModalConfig({
      isOpen: true,
      title,
      message,
      confirmText: "ตกลง",
      variant,
      onConfirm: () => {},
    });
  };

  const fetchFileData = async () => {
    try {
      const res = await fetch(`/api/file/${token}`);
      if (!res.ok) {
        throw new Error('ไม่พบไฟล์ที่ต้องการหรือลิงก์อาจถูกลบไปแล้ว');
      }
      const data = await res.json();
      setFileData(data);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFileData();
  }, [token]);

  const confirmRename = async () => {
    if (!renameData.name.trim()) return;
    try {
      const res = await fetch(`/api/rename/${renameData.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ new_name: renameData.name })
      });
      const data = await res.json();
      if (res.ok) {
        setShowRenameModal(false);
        fetchFileData(); // Refresh data with new name
        showAlert("สำเร็จ", "เปลี่ยนชื่อไฟล์สำเร็จแล้ว", "info");
      } else {
        setRenameError(data.message || "เกิดข้อผิดพลาดในการเปลี่ยนชื่อ");
      }
    } catch (err: any) {
      setRenameError("เชื่อมต่อ Server ไม่ได้: " + err.message);
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  const [particleCount, setParticleCount] = useState(150);
  useEffect(() => {
    const updateCount = () => {
      setParticleCount(window.innerWidth < 768 ? 60 : 150);
    };
    updateCount();
    window.addEventListener('resize', updateCount);
    return () => window.removeEventListener('resize', updateCount);
  }, []);

  if (loading) {
    return <div className="min-h-screen bg-[#050505] flex items-center justify-center text-white/50 text-sm font-medium">กำลังโหลดข้อมูล...</div>;
  }

  if (errorMsg || !fileData) {
    return (
      <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4">
        <div className="bg-[#111111]/90 border border-white/10 rounded-[2rem] p-8 max-w-md w-full text-center shadow-2xl relative z-10 backdrop-blur-3xl">
          <div className="bg-white/5 p-4 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center border border-white/10">
            <X className="w-8 h-8 text-white/50" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">ข้อผิดพลาด</h2>
          <p className="text-white/60 mb-6 font-medium">{errorMsg || "File not found"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/30 p-4 flex items-center justify-center relative overflow-hidden">
      
      {/* Background Effects */}
      <Particles className="absolute inset-0 z-0" quantity={particleCount} ease={80} color="#ffffff" refresh />
      <LightRays className="absolute inset-0 z-0 opacity-40" color="rgba(255, 255, 255, 0.15)" />

      <CustomModal {...modalConfig} onClose={() => setModalConfig({ ...modalConfig, isOpen: false })} />

      {/* Rename Modal */}
      {showRenameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xl transition-all duration-300">
          <div className="bg-[#111111]/90 border border-white/10 rounded-[2rem] p-8 w-full max-w-md shadow-2xl relative transform transition-all scale-100 backdrop-blur-3xl">
            <button onClick={() => setShowRenameModal(false)} className="absolute top-6 right-6 text-white/60 hover:text-white transition-colors bg-white/5 p-2 rounded-full">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-2xl font-semibold text-white mb-6">เปลี่ยนชื่อไฟล์</h3>
            <input 
              type="text" 
              value={renameData.name}
              onChange={(e) => setRenameData({...renameData, name: e.target.value})}
              onKeyDown={(e) => {
                if (e.key === 'Enter') confirmRename();
              }}
              className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white focus:border-white/30 focus:ring-2 focus:ring-white/10 outline-none mb-6 transition-all"
              placeholder="ใส่ชื่อไฟล์ใหม่..."
              autoFocus
            />
            {renameError && <p className="text-red-400 text-sm mb-6">{renameError}</p>}
            <div className="flex justify-end gap-3">
              <button 
                onClick={() => setShowRenameModal(false)}
                className="px-6 py-3 rounded-2xl text-white/70 hover:bg-white/10 transition-colors font-medium"
              >
                ยกเลิก
              </button>
              <button 
                onClick={confirmRename}
                className="px-6 py-3 bg-white hover:bg-gray-200 text-black rounded-2xl font-semibold transition-all shadow-[0_4px_14px_rgba(255,255,255,0.2)]"
              >
                บันทึก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Single File UI */}
      <div className="bg-[#111111]/70 backdrop-blur-3xl border border-white/10 p-8 md:p-12 rounded-[2.5rem] shadow-2xl w-full max-w-2xl relative z-10 flex flex-col gap-6">
        
        <div className="flex justify-center mb-2">
          <div className="bg-white/10 p-6 rounded-full border border-white/10 shadow-[0_0_40px_rgba(255,255,255,0.05)] relative overflow-hidden">
            <LightRays className="absolute inset-0 opacity-20" color="rgba(255,255,255,0.5)" />
            <Disc className="w-16 h-16 text-white relative z-10 animate-[spin_10s_linear_infinite]" />
          </div>
        </div>

        <div className="text-center">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-4 truncate px-2 leading-tight" title={fileData.original_name}>
            {fileData.original_name}
          </h1>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-white/70 font-mono bg-black/40 px-3 py-1.5 rounded-lg border border-white/10 tracking-widest uppercase">
                {fileData.options?.bit_depth || '16'}-bit / {fileData.options?.bitrate}kbps / {fileData.options?.channels}
              </span>
          </div>
          <div className="text-xs text-white/50 mt-5 flex items-center justify-center gap-3 font-medium uppercase tracking-wider">
             <span>{formatBytes(fileData.size)}</span>
             <span className="w-1 h-1 bg-white/20 rounded-full"></span>
             <span>{fileData.date}</span>
          </div>
        </div>

        <div className="bg-white/5 backdrop-blur-md p-6 rounded-[2rem] border border-white/10 mt-4 shadow-inner">
          <audio 
            ref={audioRef} 
            controls 
            className="w-full h-12 rounded-xl outline-none" 
            style={{ filter: 'invert(0.9) hue-rotate(180deg) grayscale(0.5)' }} 
            src={`/api/stream/${encodeURIComponent(fileData.filename)}`}
            onError={() => {
              showAlert("ผิดพลาด", "ไม่สามารถโหลดไฟล์เสียงได้ (404 หรือไฟล์เสียหาย)", "danger");
            }}
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4 mt-4">
           <a 
             href={`/api/stream/${encodeURIComponent(fileData.filename)}`} 
             download={fileData.original_name + ".wav"} 
             className="flex-1 py-4 bg-white text-black hover:bg-gray-200 rounded-2xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-[0_4px_20px_rgba(255,255,255,0.2)]"
           >
             <Download className="w-5 h-5" /> DOWNLOAD AUDIO
           </a>
           
           <button 
             onClick={() => { setRenameData({ id: fileData.id, name: fileData.original_name }); setShowRenameModal(true); }} 
             className="md:flex-none px-6 py-4 bg-white/5 text-white/80 hover:bg-white/20 hover:text-white rounded-2xl text-sm font-bold tracking-wide uppercase flex items-center justify-center gap-2 transition-all border border-white/10"
           >
             <Edit className="w-5 h-5" /> RENAME
           </button>
        </div>

      </div>

    </div>
  );
}
