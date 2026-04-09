import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, execSync } from 'child_process';
import next from 'next';
import { parse } from 'url';
import 'dotenv/config';

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const PORT = Number(process.env.PORT) || 3000;
const app = next({ dev, hostname, port: PORT });
const handle = app.getRequestHandler();

const BASE_DIR = process.cwd();

// Storage Configuration Logic
let UPLOAD_FOLDER: string;
let PROCESSED_FOLDER: string;
let DB_FILE: string;

const BASE_STORAGE_PATH = process.env.BASE_STORAGE_PATH;

if (BASE_STORAGE_PATH) {
  // AUTO-GENERATION MODE
  const randomSuffix = crypto.randomBytes(8).toString('hex'); // 16 characters
  const rootStorage = path.isAbsolute(BASE_STORAGE_PATH) 
    ? path.join(BASE_STORAGE_PATH, `server_storage_${randomSuffix}`)
    : path.join(BASE_DIR, BASE_STORAGE_PATH, `server_storage_${randomSuffix}`);
  
  UPLOAD_FOLDER = path.join(rootStorage, 'uploads');
  PROCESSED_FOLDER = path.join(rootStorage, 'processed');
  DB_FILE = path.join(rootStorage, 'history.json');
  
  console.log(`[AUTO-STORAGE] Created unique storage at: ${rootStorage}`);
} else {
  // MANUAL MODE WITH STRICT VALIDATION
  const uploadDir = process.env.UPLOAD_DIR || 'storage/uploads';
  const processedDir = process.env.PROCESSED_DIR || 'storage/processed';
  const historyDbPath = process.env.HISTORY_DB_PATH || 'storage/history.json';

  UPLOAD_FOLDER = path.isAbsolute(uploadDir) 
    ? uploadDir 
    : path.join(BASE_DIR, uploadDir);

  PROCESSED_FOLDER = path.isAbsolute(processedDir) 
    ? processedDir 
    : path.join(BASE_DIR, processedDir);

  DB_FILE = path.isAbsolute(historyDbPath) 
    ? historyDbPath 
    : path.join(BASE_DIR, historyDbPath);
}

// Ensure directories exist
[UPLOAD_FOLDER, PROCESSED_FOLDER, path.dirname(DB_FILE)].forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`[STORAGE] Created directory: ${dir}`);
  }
});

// History Management
function loadHistory() {
  if (!fs.existsSync(DB_FILE)) return [];
  try {
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function saveFullHistory(historyList: any[]) {
  fs.writeFileSync(DB_FILE, JSON.stringify(historyList, null, 4), 'utf-8');
  broadcast({ type: 'HISTORY_UPDATE', data: historyList });
}

function saveHistory(data: any) {
  let current = loadHistory();
  current = current.filter((item: any) => item.id !== data.id);
  current.unshift(data);
  saveFullHistory(current);
}

function deleteFromHistory(fileId: string) {
  let current = loadHistory();
  current = current.filter((item: any) => String(item.id) !== String(fileId));
  saveFullHistory(current);
  return current;
}

// WS Broadcasting
let wss: WebSocketServer;
function broadcast(message: any) {
  if (!wss) return;
  const msgStr = JSON.stringify(message);
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(msgStr);
    }
  });
}

// FFmpeg Logic
function getBestAudioStreamIndex(filepath: string): number {
  try {
    const output = execSync(`ffprobe -v quiet -print_format json -show_streams -select_streams a "${filepath}"`, { encoding: 'utf-8' });
    const data = JSON.parse(output);
    let bestIndex = -1;
    let maxChannels = 0;

    if (!data.streams) return -1;

    for (const stream of data.streams) {
      const idx = stream.index;
      let channels = parseInt(stream.channels || '0', 10);
      
      if (channels === 0 && stream.channel_layout) {
        const layout = stream.channel_layout;
        if (layout.includes('7.1')) channels = 8;
        else if (layout.includes('5.1')) channels = 6;
        else if (layout.includes('stereo')) channels = 2;
      }

      if (channels > maxChannels) {
        maxChannels = channels;
        bestIndex = idx;
      }
    }
    return bestIndex;
  } catch (e) {
    console.error(`Error probing streams:`, e);
    return -1;
  }
}

async function processVideoTask(tempFilepath: string, originalFilename: string, options: any, fileId: string) {
  const outputFilename = `${path.parse(originalFilename).name.replace(/[<>:"/\\|?*#%]/g, '')}_${fileId}.wav`;
  const outputPath = path.join(PROCESSED_FOLDER, outputFilename);
  
  broadcast({ type: 'EXTRACTION_PROGRESS', fileId, status: 'กำลังวิเคราะห์ไฟล์...' });

  const bestStreamIdx = getBestAudioStreamIndex(tempFilepath);
  
  let targetChannelsStr = '2';
  if (options.channels === '4.0') targetChannelsStr = '4';
  else if (options.channels === '7.0') targetChannelsStr = '7';
  else if (options.channels === '7.1') targetChannelsStr = '8';

  const bitDepth = options.bit_depth || '16';
  
  let codec = 'pcm_s16le';
  if (bitDepth === '8') codec = 'pcm_u8';
  else if (bitDepth === '24') codec = 'pcm_s24le';
  else if (bitDepth === '32') codec = 'pcm_s32le';

  const args = ['-y', '-threads', '0', '-i', tempFilepath, '-vn'];
  
  if (bestStreamIdx !== -1) {
    args.push('-map', `0:${bestStreamIdx}`);
  }

  args.push('-acodec', codec, '-ar', '48000', '-ac', targetChannelsStr, '-f', 'wav', outputPath);

  broadcast({ type: 'EXTRACTION_PROGRESS', fileId, status: 'กำลังแยกเสียง (FFmpeg)...' });

  const ffmpeg = spawn('ffmpeg', args);

  ffmpeg.on('close', (code) => {
    if (fs.existsSync(tempFilepath)) fs.unlinkSync(tempFilepath);
    
    if (code === 0) {
      const stats = fs.statSync(outputPath);
      const historyEntry = {
        id: fileId,
        original_name: originalFilename,
        filename: outputFilename,
        size: stats.size,
        date: new Date().toISOString().replace('T', ' ').substring(0, 19),
        options
      };
      saveHistory(historyEntry);
      broadcast({ type: 'EXTRACTION_COMPLETE', fileId, success: true });
    } else {
      console.error(`FFmpeg exited with code ${code}`);
      broadcast({ type: 'EXTRACTION_COMPLETE', fileId, success: false, error: `FFmpeg failed with code ${code}` });
    }
  });
}

async function backgroundAssemblyTask(fileId: string, totalChunks: number, filename: string, options: any) {
  const tempDir = path.join(UPLOAD_FOLDER, fileId);
  const finalVideoPath = path.join(UPLOAD_FOLDER, `${fileId}_${filename}`);
  
  broadcast({ type: 'EXTRACTION_PROGRESS', fileId, status: 'กำลังรวมไฟล์...' });

  try {
    // Clear final file if it exists
    if (fs.existsSync(finalVideoPath)) fs.unlinkSync(finalVideoPath);

    for (let i = 0; i < totalChunks; i++) {
      const chunkPath = path.join(tempDir, `chunk_${i}`);
      if (fs.existsSync(chunkPath)) {
        const data = fs.readFileSync(chunkPath);
        fs.appendFileSync(finalVideoPath, data);
        fs.unlinkSync(chunkPath);
      } else {
        throw new Error(`Chunk ${i} missing`);
      }
    }
    
    try { fs.rmSync(tempDir, { recursive: true, force: true }); } catch (e) {}
    processVideoTask(finalVideoPath, filename, options, fileId);
  } catch (e: any) {
    console.error(`Assembly Error:`, e);
    broadcast({ type: 'EXTRACTION_COMPLETE', fileId, success: false, error: e.message });
  }
}

app.prepare().then(() => {
  const expressApp = express();
  const server = http.createServer(expressApp);
  wss = new WebSocketServer({ server });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'HISTORY_UPDATE', data: loadHistory() }));
  });

  expressApp.use(express.json());
  const upload = multer({ dest: path.join(UPLOAD_FOLDER, 'tmp') });

  // API Routes
  expressApp.get('/api/history', (req, res) => {
    res.json(loadHistory());
  });

  expressApp.get('/api/check_chunks/:file_id', (req, res) => {
    const tempDir = path.join(UPLOAD_FOLDER, req.params.file_id);
    if (!fs.existsSync(tempDir)) return res.json({ chunks: [] });
    try {
      const files = fs.readdirSync(tempDir);
      const chunks = files.filter(f => f.startsWith('chunk_')).map(f => parseInt(f.split('_')[1], 10));
      res.json({ chunks });
    } catch {
      res.json({ chunks: [] });
    }
  });

  expressApp.delete('/api/clear_chunks/:file_id', (req, res) => {
    const tempDir = path.join(UPLOAD_FOLDER, req.params.file_id);
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    res.json({ status: 'ok' });
  });

  expressApp.post('/api/upload_chunk', upload.single('file'), (req, res) => {
    try {
      const file = req.file;
      const { file_id, chunk_index } = req.body;
      if (!file) return res.status(400).json({ status: 'error', message: 'No file' });

      const tempDir = path.join(UPLOAD_FOLDER, file_id);
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
      
      const destPath = path.join(tempDir, `chunk_${chunk_index}`);
      fs.renameSync(file.path, destPath);
      
      res.json({ status: 'ok', chunk: parseInt(chunk_index, 10) });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  expressApp.post('/api/assemble', (req, res) => {
    try {
      const { file_id, total_chunks, filename, options } = req.body;
      backgroundAssemblyTask(file_id, total_chunks, filename, options);
      res.json({ status: 'processing' });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  expressApp.post('/api/rename/:file_id', (req, res) => {
    try {
      const fileId = req.params.file_id;
      let newNameStem = req.body.new_name?.trim();
      if (!newNameStem) return res.status(400).json({ status: 'error', message: 'กรุณาระบุชื่อไฟล์' });

      newNameStem = newNameStem.replace(/[<>:"/\\|?*]/g, '');
      const history = loadHistory();
      const targetEntry = history.find((item: any) => String(item.id) === fileId);

      if (!targetEntry) return res.status(404).json({ status: 'error', message: 'ไม่พบไฟล์ในประวัติ' });

      const oldFilename = targetEntry.filename;
      const ext = path.extname(oldFilename);
      const newFilename = `${newNameStem}${ext}`;

      if (history.some((item: any) => item.filename === newFilename && String(item.id) !== fileId)) {
        return res.status(409).json({ status: 'error', message: 'ชื่อไฟล์นี้มีอยู่แล้วในระบบ' });
      }

      const oldPath = path.join(PROCESSED_FOLDER, oldFilename);
      const newPath = path.join(PROCESSED_FOLDER, newFilename);

      if (fs.existsSync(newPath)) return res.status(409).json({ status: 'error', message: 'ชื่อไฟล์นี้มีอยู่แล้วบน Server' });
      if (!fs.existsSync(oldPath)) return res.status(404).json({ status: 'error', message: 'ไม่พบไฟล์ต้นฉบับบน Server' });

      fs.renameSync(oldPath, newPath);
      targetEntry.filename = newFilename;
      targetEntry.original_name = newNameStem;
      
      saveFullHistory(history);
      res.json({ status: 'ok', new_name: newFilename });
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  expressApp.delete('/api/delete/:file_id', (req, res) => {
    try {
      const fileId = req.params.file_id;
      const history = loadHistory();
      const target = history.find((item: any) => String(item.id) === fileId);
      
      if (target) {
        const wavPath = path.join(PROCESSED_FOLDER, target.filename);
        if (fs.existsSync(wavPath)) fs.unlinkSync(wavPath);
        deleteFromHistory(fileId);
        res.json({ status: 'ok' });
      } else {
        res.status(404).json({ status: 'error' });
      }
    } catch (e: any) {
      res.status(500).json({ status: 'error', message: e.message });
    }
  });

  expressApp.get('/api/stream/:filename', (req, res) => {
    const filePath = path.join(PROCESSED_FOLDER, req.params.filename);
    if (!fs.existsSync(filePath)) return res.status(404).send('File not found');

    const stat = fs.statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10) || 0;
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      
      if (start >= fileSize) {
        res.status(416).send('Requested range not satisfiable');
        return;
      }

      const chunksize = (end - start) + 1;
      const file = fs.createReadStream(filePath, { start, end });
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'audio/wav',
      };
      res.writeHead(206, head);
      file.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.end();
      });
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'audio/wav',
      };
      res.writeHead(200, head);
      const file = fs.createReadStream(filePath);
      file.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) res.end();
      });
      file.pipe(res);
    }
  });

  // Next.js request handler
  expressApp.all(/.*/, (req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`> Ready on http://localhost:${PORT}`);
  });
});
