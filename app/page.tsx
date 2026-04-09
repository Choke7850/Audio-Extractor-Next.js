"use client"
import React, { useState, useEffect, useRef } from 'react';
import { get, set, del } from 'idb-keyval';
import { ChevronDown, History, HardDrive, Play, Download, Trash, Edit, X, Zap, UploadCloud, FileVideo, Plus, Loader2, Cpu } from 'lucide-react';
import { Particles } from '../components/ui/particles';
import { LightRays } from '../components/ui/light-rays';
import { ProgressiveBlur } from '../components/ProgressiveBlur';
import { CustomModal } from '../components/CustomModal';

const WS_URL = typeof window !== 'undefined' && (window.location.protocol === 'file:' || window.location.hostname === 'localhost')
  ? 'ws://localhost:3000' 
  : typeof window !== 'undefined' ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}` : '';

const CustomSelect = ({ label, value, options, onChange }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, []);

  const selectedLabel = options.find((opt: any) => opt.value === value)?.label || value;

  return (
    <div className="relative" ref={ref}>
      <label className="text-xs text-white/60 mb-1.5 block font-medium tracking-wide uppercase">{label}</label>
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white/5 backdrop-blur-md border ${isOpen ? 'border-white/30 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'border-white/10'} rounded-2xl p-3 text-sm text-left flex justify-between items-center transition-all duration-300 outline-none hover:bg-white/10`}
      >
        <span className="truncate text-white font-medium">{selectedLabel}</span>
        <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isOpen ? 'rotate-180 text-white' : 'text-white/60'}`} />
      </button>
      
      <div className={`absolute z-[100] w-full mt-2 bg-[#151515]/95 backdrop-blur-3xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden transition-all duration-300 origin-top ${isOpen ? 'opacity-100 scale-y-100' : 'opacity-0 scale-y-95 pointer-events-none'}`}>
        <div className="py-1 max-h-60 overflow-y-auto custom-scrollbar">
          {options.map((opt: any) => (
            <div 
              key={opt.value}
              onClick={() => {
                onChange({ target: { value: opt.value } });
                setIsOpen(false);
              }}
              className={`px-4 py-3 text-sm cursor-pointer transition-colors ${value === opt.value ? 'bg-white/10 text-white font-semibold' : 'text-white/70 hover:bg-white/5 hover:text-white'}`}
            >
              {opt.label}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [file, setFile] = useState<File | null>(null);
  const [fileMetadata, setFileMetadata] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMsg, setStatusMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [history, setHistory] = useState<any[]>([]);
  const [playingFile, setPlayingFile] = useState<{ filename: string, display: string } | null>(null);
  
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameData, setRenameData] = useState({ id: null, name: '' });
  const [renameError, setRenameError] = useState("");

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

  const confirmModal = (config: Omit<typeof modalConfig, "isOpen" | "onConfirm" | "onClose">): Promise<boolean> => {
    return new Promise((resolve) => {
      setModalConfig({
        ...config,
        isOpen: true,
        onConfirm: () => resolve(true),
        onClose: () => resolve(false),
      });
    });
  };

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
  
  const [bitrate, setBitrate] = useState("320");
  const [channels, setChannels] = useState("Stereo");
  const [bitDepth, setBitDepth] = useState("16");

  const audioRef = useRef<HTMLAudioElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    connectWebSocket();

    const checkPendingUpload = async () => {
      try {
        const handle = await get('pending_upload_handle');
        if (handle) {
          const resume = await confirmModal({
            title: "พบไฟล์ค้างอยู่",
            message: `พบไฟล์ที่อัปโหลดค้างไว้ (${handle.name}) ต้องการอัปโหลดต่อหรือไม่?\n\nระบบจะขอสิทธิ์เข้าถึงไฟล์เพื่ออัปโหลดต่ออัตโนมัติ`,
            confirmText: "อัปโหลดต่อ",
            cancelText: "เริ่มใหม่",
            variant: "info",
          });

          if (resume) {
            try {
              const perm = await handle.requestPermission({ mode: 'read' });
              if (perm === 'granted') {
                const f = await handle.getFile();
                setFile(f);
                setStatusMsg("กู้คืนไฟล์สำเร็จ กด START EXTRACTION เพื่ออัปโหลดต่อ");
              } else {
                showAlert("ไม่ได้รับสิทธิ์", "ไม่ได้รับสิทธิ์เข้าถึงไฟล์ กรุณาเลือกไฟล์ใหม่", "danger");
                await del('pending_upload_handle');
              }
            } catch (e) {
              console.error(e);
              showAlert("เข้าถึงไฟล์ไม่ได้", "ไม่สามารถเข้าถึงไฟล์เดิมได้ อาจถูกย้ายหรือลบไปแล้ว", "danger");
              await del('pending_upload_handle');
            }
          } else {
            await del('pending_upload_handle');
          }
        }
      } catch (err) {
        console.error("Failed to check pending upload", err);
      }
    };
    checkPendingUpload();

    return () => {
      if (wsRef.current) wsRef.current.close();
    };
  }, []);

  const connectWebSocket = () => {
    if (!WS_URL) return;
    const ws = new WebSocket(WS_URL);
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'HISTORY_UPDATE') {
          setHistory(data.data);
        } else if (data.type === 'EXTRACTION_PROGRESS') {
          setStatusMsg(data.status);
        } else if (data.type === 'EXTRACTION_COMPLETE') {
          if (data.success) {
            setStatusMsg("เสร็จสิ้น! ไฟล์พร้อมใช้งานแล้ว");
            setTimeout(() => setStatusMsg(""), 5000);
          } else {
            setErrorMsg(`เกิดข้อผิดพลาด: ${data.error}`);
            setStatusMsg("");
          }
        }
      } catch (e) {
        console.error("WS Parse Error", e);
      }
    };
    ws.onclose = () => {
      setTimeout(connectWebSocket, 3000); // Reconnect
    };
    wsRef.current = ws;
  };

  const bitrateOptions = [
    { value: "128", label: "128 kbps" },
    { value: "192", label: "192 kbps" },
    { value: "320", label: "320 kbps" },
    { value: "512", label: "512 kbps (High)" },
    { value: "1024", label: "1024 kbps (Super)" },
    { value: "2048", label: "2048 kbps (Ultra)" }
  ];
  
  const channelOptions = [
    { value: "Stereo", label: "Stereo (2.0)" },
    { value: "4.0", label: "Quad (4.0)" },
    { value: "7.0", label: "Surround (7.0)" },
    { value: "7.1", label: "Surround (7.1)" }
  ];

  const bitDepthOptions = [
    { value: "8", label: "8-bit (Low Res)" },
    { value: "16", label: "16-bit (Standard CD)" },
    { value: "24", label: "24-bit (Studio Quality)" },
    { value: "32", label: "32-bit (Ultra High Dynamic)" }
  ];

  const extractMetadata = (f: File) => {
    const ext = f.name.split('.').pop()?.toUpperCase() || 'UNKNOWN';
    const metadata: any = {
      name: f.name,
      size: f.size,
      extension: ext,
      type: f.type,
    };

    if (f.type.startsWith('video/') || f.type.startsWith('audio/')) {
      const url = URL.createObjectURL(f);
      const media = f.type.startsWith('video/') ? document.createElement('video') : document.createElement('audio');
      media.src = url;
      media.onloadedmetadata = () => {
        metadata.duration = media.duration;
        if (media instanceof HTMLVideoElement) {
          metadata.resolution = `${media.videoWidth}x${media.videoHeight}`;
        }
        // Estimate bitrate: (size in bits) / duration
        if (media.duration > 0) {
          metadata.bitrate = Math.round((f.size * 8) / media.duration / 1000);
        }
        setFileMetadata({ ...metadata });
        URL.revokeObjectURL(url);
      };
    } else {
      setFileMetadata(metadata);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const f = e.target.files[0];
      setFile(f);
      extractMetadata(f);
      setProgress(0);
      setStatusMsg("พร้อมอัปโหลด (ระบบ Resume รองรับ)");
      setErrorMsg("");
      await del('pending_upload_handle');
    }
  };

  const handleSelectFileClick = async (e: React.MouseEvent) => {
    if ('showOpenFilePicker' in window) {
      e.preventDefault();
      try {
        const [fileHandle] = await (window as any).showOpenFilePicker({
          types: [
            {
              description: 'Video Files',
              accept: {
                'video/*': ['.mp4', '.mkv', '.avi', '.mov', '.webm']
              }
            }
          ]
        });
        const f = await fileHandle.getFile();
        setFile(f);
        extractMetadata(f);
        setProgress(0);
        setStatusMsg("พร้อมอัปโหลด (ระบบ Resume รองรับ)");
        setErrorMsg("");
        await set('pending_upload_handle', fileHandle);
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          console.error(err);
          document.getElementById('fileInput')?.click();
        }
      }
    } else {
      // Fallback for mobile and other browsers that don't support File System Access API
      document.getElementById('fileInput')?.click();
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      const item = e.dataTransfer.items[0];
      if (item.kind === 'file') {
        const fileHandle = await (item as any).getAsFileSystemHandle?.();
        const f = item.getAsFile();
        if (f) {
          setFile(f);
          extractMetadata(f);
          setProgress(0);
          setStatusMsg("พร้อมอัปโหลด (ระบบ Resume รองรับ)");
          setErrorMsg("");
          if (fileHandle) {
            await set('pending_upload_handle', fileHandle);
          } else {
            await del('pending_upload_handle');
          }
        }
      }
    }
  };

  const generateFileId = (f: File) => {
    const str = `${f.name}-${f.size}-${f.lastModified}`;
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash = hash & hash; 
    }
    return `file-${Math.abs(hash).toString(16)}-${f.size.toString(16)}`;
  };

  const uploadChunkWithRetry = async (formData: FormData, retries = 5): Promise<void> => {
    for (let i = 0; i < retries; i++) {
      try {
        const res = await fetch('/api/upload_chunk', { method: 'POST', body: formData });
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        return;
      } catch (e) {
        if (i === retries - 1) throw e;
        await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i))); // Exponential backoff
      }
    }
  };

  const uploadFile = async () => {
    if (!file) return;

    setUploading(true);
    setErrorMsg("");
    setStatusMsg("กำลังตรวจสอบไฟล์...");

    try {
      const CHUNK_SIZE = 4 * 1024 * 1024; 
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
      const fileId = generateFileId(file);

      let existingChunks = new Set<number>();
      try {
        const checkRes = await fetch(`/api/check_chunks/${fileId}`);
        if (checkRes.ok) {
          const checkData = await checkRes.json();
          existingChunks = new Set(checkData.chunks);
        }
      } catch(e) {
        console.log("New upload or check failed, starting fresh.");
      }

      if (existingChunks.size > 0 && existingChunks.size < totalChunks) {
        const resume = await confirmModal({
          title: "อัปโหลดต่อ?",
          message: `คุณเคยอัปโหลดไฟล์นี้ค้างไว้ (${Math.round((existingChunks.size / totalChunks) * 100)}%) ต้องการอัปโหลดต่อหรือไม่?`,
          confirmText: "อัปโหลดต่อ",
          cancelText: "เริ่มใหม่",
          variant: "info",
        });

        if (!resume) {
          await fetch(`/api/clear_chunks/${fileId}`, { method: 'DELETE' });
          existingChunks.clear();
        }
      }

      setStatusMsg(`กำลังเริ่ม... (0/${totalChunks})`);

      for (let i = 0; i < totalChunks; i++) {
        if (existingChunks.has(i)) {
          const percent = Math.round(((i + 1) / totalChunks) * 100);
          setProgress(percent);
          setStatusMsg(`ข้ามข้อมูลเดิม... ${percent}% (Chunk ${i+1}/${totalChunks})`);
          continue;
        }

        const start = i * CHUNK_SIZE;
        const end = Math.min(file.size, start + CHUNK_SIZE);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append("file", chunk);
        formData.append("file_id", fileId);
        formData.append("chunk_index", i.toString());

        await uploadChunkWithRetry(formData);

        const percent = Math.round(((i + 1) / totalChunks) * 100);
        setProgress(percent);
        setStatusMsg(`กำลังอัปโหลด... ${percent}% (Chunk ${i+1}/${totalChunks})`);
      }

      setStatusMsg("กำลังรวมไฟล์และเริ่มแปลงเสียง...");
      
      const assembleRes = await fetch('/api/assemble', {
        method: "POST",
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: fileId,
          total_chunks: totalChunks,
          filename: file.name,
          options: { bitrate, channels, bit_depth: bitDepth }
        })
      });
      
      if (!assembleRes.ok) {
        const errText = await assembleRes.text();
        throw new Error(`Assembly Failed: ${errText}`);
      }
      
      setFile(null);
      await del('pending_upload_handle');

    } catch (err: any) {
      console.error("Upload Error:", err);
      setStatusMsg("");
      setErrorMsg(`เกิดข้อผิดพลาด: ${err.message}`); 
    } finally {
      setUploading(false);
    }
  };

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
      } else {
        setRenameError(data.message || "เกิดข้อผิดพลาด");
      }
    } catch (err: any) {
      setRenameError("เชื่อมต่อ Server ไม่ได้: " + err.message);
    }
  };

  const deleteFile = async (id: string, name: string) => {
    const confirm = await confirmModal({
      title: "ยืนยันการลบ",
      message: `ยืนยันการลบไฟล์ "${name}"?\n\nการกระทำนี้ไม่สามารถกู้คืนได้!`,
      confirmText: "ลบไฟล์",
      cancelText: "ยกเลิก",
      variant: "danger",
    });

    if (!confirm) return;

    try {
      const res = await fetch(`/api/delete/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (playingFile && playingFile.filename.includes(id)) {
          setPlayingFile(null);
          if (audioRef.current) {
            audioRef.current.pause();
            audioRef.current.src = "";
          }
        }
      } else {
        showAlert("ผิดพลาด", "ลบไม่สำเร็จ", "danger");
      }
    } catch (err) {
      showAlert("ผิดพลาด", "เชื่อมต่อ Server ไม่ได้", "danger");
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

  const playAudio = (filename: string, originalName: string) => {
    const url = `/api/stream/${encodeURIComponent(filename)}`;
    setPlayingFile({ filename, display: originalName });
    if (audioRef.current) {
      audioRef.current.src = url;
      audioRef.current.load();
      audioRef.current.play().catch(err => {
        console.error("Playback failed:", err);
        showAlert("เล่นไฟล์ไม่ได้", "ไม่สามารถเล่นไฟล์เสียงได้ กรุณาลองใหม่อีกครั้ง", "danger");
      });
    }
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

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-white/30 p-4 md:p-8 flex flex-col items-center relative overflow-hidden">
      
      {/* New Glass Background Effects */}
      <Particles className="absolute inset-0 z-0" quantity={particleCount} ease={80} color="#ffffff" refresh />
      <LightRays className="absolute inset-0 z-0 opacity-40" color="rgba(255, 255, 255, 0.15)" />

      <CustomModal
        {...modalConfig}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
      />

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
                if (e.key === 'Enter') {
                  confirmRename();
                }
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

      <header className="w-full max-w-5xl mb-10 flex items-center justify-between bg-[#111111]/60 backdrop-blur-3xl border border-white/10 p-5 rounded-[2rem] shadow-2xl relative z-10">
        <div className="flex items-center gap-4 pl-2">
          <div className="bg-white/10 p-3 rounded-2xl shadow-lg border border-white/5">
            <Zap className="text-white w-6 h-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white">Choke Extractor</h1>
            <p className="text-xs text-white/60 font-medium mt-0.5 tracking-wide">REAL-TIME AUDIO ENGINE</p>
          </div>
        </div>
        <div className="hidden md:block text-right text-xs text-white/50 font-mono bg-white/5 px-4 py-2 rounded-xl border border-white/5">
          NEXT.JS & FFMPEG<br/>
          VER 2.1 (GLASS THEME)
        </div>
      </header>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* UPLOAD SECTION */}
        <div className="lg:col-span-5 bg-[#111111]/60 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col gap-8 relative">
          <h2 className="text-xl font-semibold flex items-center gap-3 text-white">
            <div className="bg-white/10 p-2 rounded-xl border border-white/5"><UploadCloud className="w-5 h-5 text-white" /></div>
            Upload Video
          </h2>
          
          <div className="grid grid-cols-2 gap-5 relative z-50">
            <div>
              <CustomSelect label="Bitrate" value={bitrate} options={bitrateOptions} onChange={(e: any) => setBitrate(e.target.value)} />
            </div>
            <div>
              <CustomSelect label="Channels" value={channels} options={channelOptions} onChange={(e: any) => setChannels(e.target.value)} />
            </div>
            <div className="col-span-2">
              <CustomSelect label="Resolution" value={bitDepth} options={bitDepthOptions} onChange={(e: any) => setBitDepth(e.target.value)} />
            </div>
          </div>

          <div 
            className={`border-2 border-dashed rounded-[2rem] p-10 flex flex-col items-center justify-center transition-all duration-300 relative z-10 cursor-pointer ${file ? 'border-white/30 bg-white/5' : 'border-white/10 hover:border-white/30 bg-white/5'}`}
            onClick={!file ? handleSelectFileClick : undefined}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input type="file" id="fileInput" className="hidden" accept="video/*" onChange={handleFileChange} />
            {file ? (
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="bg-white/10 p-4 rounded-full border border-white/5">
                    <FileVideo className="w-10 h-10 text-white" />
                  </div>
                </div>
                <p className="font-medium text-sm truncate max-w-[220px] mx-auto text-white">{file.name}</p>
                <p className="text-xs text-white/60 mt-1">{formatBytes(file.size)}</p>
                
                {/* File Metadata Display */}
                {fileMetadata && (
                  <div className="mt-4 p-3 bg-white/5 border border-white/10 rounded-xl text-[10px] text-left space-y-1 font-mono">
                    <div className="flex justify-between">
                      <span className="text-white/40">FORMAT:</span>
                      <span className="text-white">{fileMetadata.extension}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">SIZE:</span>
                      <span className="text-white">{formatBytes(fileMetadata.size)}</span>
                    </div>
                    {fileMetadata.resolution && (
                      <div className="flex justify-between">
                        <span className="text-white/40">RESOLUTION:</span>
                        <span className="text-white">{fileMetadata.resolution}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-white/40">CHANNELS:</span>
                      <span className="text-white">{fileMetadata.channels || 'AUTO DETECT'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/40">BIT DEPTH:</span>
                      <span className="text-white">{fileMetadata.bitDepth || 'AUTO (8/16/24)'}</span>
                    </div>
                    {fileMetadata.duration && (
                      <div className="flex justify-between">
                        <span className="text-white/40">DURATION:</span>
                        <span className="text-white">{Math.floor(fileMetadata.duration / 60)}m {Math.floor(fileMetadata.duration % 60)}s</span>
                      </div>
                    )}
                    {fileMetadata.bitrate && (
                      <div className="flex justify-between">
                        <span className="text-white/40">EST. BITRATE:</span>
                        <span className="text-white">~{fileMetadata.bitrate} kbps</span>
                      </div>
                    )}
                    <div className="pt-1 mt-1 border-t border-white/5 flex justify-between opacity-50 italic">
                      <span className="">CODEC:</span>
                      <span className="">{fileMetadata.type.split('/')[1]?.toUpperCase() || 'RAW'}</span>
                    </div>
                  </div>
                )}

                <button 
                  onClick={(e) => { e.stopPropagation(); setFile(null); setFileMetadata(null); del('pending_upload_handle'); }} 
                  className="mt-4 text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 px-4 py-1.5 rounded-full transition-colors"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <label htmlFor="fileInput" className="cursor-pointer text-center group pointer-events-none">
                <div className="w-16 h-16 bg-white/5 group-hover:bg-white/10 border border-white/5 rounded-full flex items-center justify-center mx-auto mb-4 transition-all shadow-lg">
                  <Plus className="text-white w-8 h-8" />
                </div>
                <p className="text-sm font-semibold text-white">แตะเพื่อเลือกไฟล์วิดีโอ</p>
                <p className="text-xs text-white/50 mt-2">รองรับไฟล์ขนาดใหญ่ (100GB+)</p>
              </label>
            )}
          </div>
          
          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/30 p-4 rounded-2xl text-red-400 text-xs font-mono break-all relative z-10">
              <strong className="block mb-1 font-sans">ERROR:</strong>
              {errorMsg}
            </div>
          )}

          {uploading && (
            <div className="relative z-10">
              <div className="flex justify-between text-xs mb-2 text-white/80 font-medium">
                <span>Uploading...</span>
                <span>{progress}%</span>
              </div>
              <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
                <div className="bg-white h-full transition-all duration-300 ease-out" style={{width: `${progress}%`}}></div>
              </div>
            </div>
          )}
          
          <button 
            onClick={uploadFile}
            disabled={!file || uploading}
            className={`w-full py-4 rounded-2xl font-semibold flex items-center justify-center gap-2 transition-all relative z-10 ${!file || uploading ? 'bg-white/5 text-white/40 cursor-not-allowed border border-white/5' : 'bg-white hover:bg-gray-200 text-black shadow-[0_4px_20px_rgba(255,255,255,0.2)]'}`}
          >
            {uploading ? <span className="animate-spin"><Loader2 className="w-5 h-5" /></span> : <Cpu className="w-5 h-5" />}
            {uploading ? 'PROCESSING...' : 'START EXTRACTION'}
          </button>
          
          {statusMsg && !errorMsg && <p className="text-center text-xs text-white/80 font-medium animate-pulse relative z-10">{statusMsg}</p>}
        </div>

        {/* HISTORY SECTION */}
        <div className="lg:col-span-7 bg-[#111111]/60 backdrop-blur-3xl border border-white/10 p-8 rounded-[2.5rem] shadow-2xl flex flex-col h-[950px] relative overflow-hidden">
          <h2 className="text-xl font-semibold flex items-center gap-3 text-white mb-6 relative z-10">
            <div className="bg-white/10 p-2 rounded-xl border border-white/5"><History className="w-5 h-5 text-white" /></div>
            History & Player
          </h2>
          
          <div className="bg-white/5 backdrop-blur-md p-5 rounded-[2rem] mb-6 border border-white/10 relative z-10 shadow-inner">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold tracking-wider text-white/80 uppercase">Now Playing</span>
              {playingFile && <span className="text-xs text-white/80 truncate max-w-[200px] font-medium">{playingFile.display}</span>}
            </div>
            <audio 
              ref={audioRef} 
              controls 
              className="w-full h-10 rounded-xl outline-none" 
              style={{ filter: 'invert(0.9) hue-rotate(180deg) grayscale(0.5)' }} 
              onError={() => {
                showAlert("ผิดพลาด", "ไม่สามารถโหลดไฟล์เสียงได้ (404 หรือไฟล์เสียหาย)", "danger");
                setPlayingFile(null);
              }}
            />
          </div>
          
          <div className="flex-1 relative overflow-hidden">
            <div className="absolute inset-0 overflow-y-auto pr-2 pt-36 pb-32 space-y-4 custom-scrollbar z-10">
              {history.length === 0 ? (
                <div className="text-center text-white/40 mt-20 flex flex-col items-center">
                  <div className="bg-white/5 p-6 rounded-full mb-4 border border-white/5">
                    <HardDrive className="w-12 h-12 opacity-50" />
                  </div>
                  <p className="font-medium">ยังไม่มีไฟล์ในระบบ</p>
                </div>
              ) : (
                history.map((item: any) => (
                  <div key={item.id} className="bg-white/5 backdrop-blur-sm p-5 rounded-[1.5rem] border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all group shadow-sm">
                    <div className="flex justify-between items-start mb-4">
                      <div className="truncate max-w-[75%]">
                        <p className="font-semibold text-sm truncate text-white mb-1">{item.original_name}</p>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-white/60 font-mono bg-black/30 px-2 py-0.5 rounded-md border border-white/10">
                            {item.options?.bit_depth || '16'}-bit | {item.options?.bitrate}k | {item.options?.channels}
                          </span>
                          <span className="text-[10px] text-white/50">{formatBytes(item.size)}</span>
                        </div>
                      </div>
                      <span className="text-[10px] text-white/50 bg-black/30 px-2.5 py-1 rounded-full border border-white/10 font-medium">{item.date.split(' ')[1]}</span>
                    </div>
                    
                    <div className="flex gap-2.5">
                      <button onClick={() => playAudio(item.filename, item.original_name)} className="flex-1 py-2 bg-white/10 text-white hover:bg-white hover:text-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                        <Play className="w-3.5 h-3.5" /> Play
                      </button>
                      <a href={`/api/stream/${encodeURIComponent(item.filename)}`} download={item.original_name + ".wav"} className="flex-1 py-2 bg-white/10 text-white hover:bg-white hover:text-black rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition-all">
                        <Download className="w-3.5 h-3.5" /> Download
                      </a>
                      <button onClick={() => { setRenameData({ id: item.id, name: item.original_name }); setShowRenameModal(true); }} className="px-3 py-2 bg-white/5 text-white/70 hover:bg-white/20 hover:text-white rounded-xl text-xs flex items-center justify-center transition-all" title="Rename">
                        <Edit className="w-4 h-4" />
                      </button>
                      <button onClick={() => deleteFile(item.id, item.original_name)} className="px-3 py-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl text-xs flex items-center justify-center transition-all" title="Delete">
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <ProgressiveBlur position="top" height="100px" blurLevels={[4, 8, 16, 32, 64]} className="z-20" />
            <ProgressiveBlur position="bottom" height="100px" blurLevels={[4, 8, 16, 32, 64]} className="z-20" />
          </div>
        </div>
      </div>
    </div>
  );
}
