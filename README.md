# Choke Extractor - Real-Time Audio Engine

A high-performance web application for extracting high-quality audio from video files using **Next.js**, **Node.js**, and **FFmpeg**. Designed for universal compatibility across Linux, Windows, Android, and iOS.

---

## 🇬🇧 English Documentation

### 🌟 Features
- **Universal Compatibility:** Works on Linux, Windows, Android, and iOS.
- **High-Quality Extraction:** Extract audio in various bitrates (up to 2048 kbps) and bit depths (up to 32-bit).
- **Multi-Channel Support:** Supports Stereo, 4.0, 7.0, and 7.1 surround sound.
- **Large File Support:** Handles files over 100GB using chunked uploads.
- **Resume Capability:** Automatically resumes interrupted uploads.
- **Real-Time Metadata:** Inspects file technical details (bitrate, resolution, codec) before processing.
- **Glass Morphism UI:** Modern, responsive interface with particle effects.

### 🏗️ How It Works (Architecture)
This project is built to be easily modified and hosted by anyone:
- **Frontend (Next.js & React):** Handles the user interface, file selection, and splits large video files into smaller chunks (4MB each) before uploading. This prevents memory crashes on large files.
- **Backend (Express on Node.js):** A custom server (`server.ts`) runs alongside Next.js. It receives file chunks, assembles them back into a complete video, and spawns an **FFmpeg** child process to extract the audio based on user settings.
- **Real-Time Communication:** Uses **WebSocket (`ws`)** to broadcast extraction progress, success/error messages, and history updates to all connected clients instantly.

### 📖 Detailed Usage Instructions
1. **Open the Application:** Access the web interface via your browser.
2. **Configure Audio Settings:** Select your desired `Bitrate`, `Channels`, and `Resolution` (Bit Depth) from the dropdown menus.
3. **Select Video:** Click the upload area to browse for a video file, or simply drag and drop a video file into the dashed box.
4. **Start Extraction:** Click the **"START EXTRACTION"** button.
5. **Monitor Progress:** Watch the real-time progress bar. The system will upload chunks, assemble them, and process the audio via FFmpeg.
6. **Manage Audio:** Once finished, the extracted `.wav` file will appear in the **"History & Player"** panel. You can play, download, rename, or delete the file directly from the interface.

### ⚙️ Installation & Setup
1. **Requirements:** Node.js (v18+) and **FFmpeg** installed on your system.
2. **Install Dependencies:** 
   ```bash
   npm install
   npm install dotenv express ws multer tsx
   ```
3. **Configure Environment:** Copy `.env.example` to `.env` and adjust paths if needed.
4. **Run Development:** 
   ```bash
   npm run dev
   ```
5. **Build & Run Production:** 
   ```bash
   npm run build
   npm run start
   ```
   ```bash
### 📂 Storage Configuration
Set storage paths in your `.env` file:
- **Mode 1 (Auto):** Set `BASE_STORAGE_PATH` (e.g., `G:\my_projects`). The system creates a unique folder automatically.
- **Mode 2 (Manual):** Leave `BASE_STORAGE_PATH` empty and define `UPLOAD_DIR`, `PROCESSED_DIR`, and `HISTORY_DB_PATH` manually.




### 👨‍💻 Credits & Support
- **Developer:** Chok
- **Support & Contact:** [https://support.chokedatacenter.com](https://support.chokedatacenter.com)

---

## 🇹🇭 คู่มือการใช้งานภาษาไทย

### 🌟 คุณสมบัติเด่น
- **รองรับทุกอุปกรณ์:** ใช้งานได้ทั้งบน Linux, Windows, Android และ iPhone (iOS)
- **คุณภาพเสียงระดับสตูดิโอ:** เลือก Bitrate ได้สูงสุด 2048 kbps และ Bit Depth สูงสุด 32-bit
- **รองรับระบบเสียงรอบทิศทาง:** เลือกได้ทั้ง Stereo, 4.0, 7.0 และ 7.1
- **รองรับไฟล์ยักษ์:** จัดการไฟล์ขนาดใหญ่กว่า 100GB+ ได้ด้วยระบบแบ่งส่วน (Chunked Upload)
- **ระบบอัปโหลดต่อเนื่อง:** หากเน็ตหลุดหรือปิดแอป สามารถกลับมาอัปโหลดต่อจากเดิมได้อัตโนมัติ
- **วิเคราะห์ไฟล์ละเอียด:** แสดงข้อมูล Bitrate, Resolution และ Codec ของไฟล์ต้นฉบับทันทีที่เลือกไฟล์
- **ดีไซน์ทันสมัย:** อินเทอร์เฟซแบบ Glass Morphism พร้อมเอฟเฟกต์อนุภาคที่สวยงาม

### 🏗️ หลักการทำงาน (สำหรับนักพัฒนาที่ต้องการนำไปแก้)
โปรเจกต์นี้ออกแบบมาให้แก้ไขและนำไปใช้งานต่อได้ง่าย:
- **หน้าบ้าน (Frontend - Next.js & React):** จัดการหน้าเว็บและ UI เมื่อผู้ใช้อัปโหลดไฟล์ ระบบจะทำการหั่นไฟล์วิดีโอเป็นชิ้นเล็กๆ (Chunk ละ 4MB) ก่อนส่งไปหลังบ้าน เพื่อป้องกันปัญหาเซิร์ฟเวอร์ค้างเมื่อเจอไฟล์ขนาดใหญ่
- **หลังบ้าน (Backend - Express & Node.js):** ใช้ Custom Server (`server.ts`) รับไฟล์ที่ถูกหั่น นำมาประกอบกลับเป็นไฟล์วิดีโอที่สมบูรณ์ จากนั้นจะเรียกใช้คำสั่ง **FFmpeg** เพื่อทำการแยกเสียงตามการตั้งค่าที่ผู้ใช้เลือก
- **การสื่อสารแบบเรียลไทม์:** ใช้ **WebSocket (`ws`)** ในการส่งข้อมูลความคืบหน้า (Progress) และอัปเดตประวัติการแปลงไฟล์ไปยังหน้าจอผู้ใช้แบบสดๆ ทันที

### 📖 วิธีการใช้งานอย่างละเอียด
1. **เปิดหน้าเว็บ:** เข้าสู่แอปพลิเคชันผ่านเบราว์เซอร์
2. **ตั้งค่าคุณภาพเสียง:** เลือก `Bitrate`, `Channels` (ระบบเสียง), และ `Resolution` (Bit Depth) ที่ต้องการจากเมนู Dropdown
3. **เลือกไฟล์วิดีโอ:** คลิกที่กล่องอัปโหลดเพื่อเลือกไฟล์ หรือลากไฟล์วิดีโอมาวางในกล่อง (Drag & Drop)
4. **เริ่มการแยกเสียง:** กดปุ่ม **"START EXTRACTION"**
5. **รอระบบทำงาน:** ระบบจะแสดงแถบความคืบหน้าแบบเรียลไทม์ ตั้งแต่การอัปโหลดไฟล์ ประกอบไฟล์ และแยกเสียงด้วย FFmpeg
6. **จัดการไฟล์เสียง:** เมื่อเสร็จสิ้น ไฟล์เสียง `.wav` จะปรากฏในส่วน **"History & Player"** ด้านขวา คุณสามารถกดเล่น (Play), ดาวน์โหลด (Download), เปลี่ยนชื่อ (Rename) หรือลบไฟล์ (Delete) ได้ทันที

### ⚙️ วิธีการติดตั้งและตั้งค่า
1. **สิ่งที่ต้องมี:** ติดตั้ง Node.js (v18+) และ **FFmpeg** ในเครื่องเซิร์ฟเวอร์
2. **ติดตั้ง Library:** 
   ```bash
   npm install
   npm install dotenv express ws multer tsx
   ```
3. **ตั้งค่าระบบ:** คัดลอกไฟล์ `.env.example` เป็น `.env` และแก้ไข Path ตามต้องการ
4. **เริ่มรันโปรแกรม (โหมดนักพัฒนา):** 
   ```bash
   npm run dev
   ```
5. **สร้างไฟล์และรัน (โหมดใช้งานจริง):** 
   ```bash
   npm run build
   npm run start
   ```

### 📂 การตั้งค่าที่เก็บข้อมูล (Storage)
ตั้งค่าในไฟล์ `.env`:
- **โหมด 1 (อัตโนมัติ):** ระบุ `BASE_STORAGE_PATH` (เช่น `G:\my_projects`) ระบบจะสร้างโฟลเดอร์สุ่มให้เอง
- **โหมด 2 (กำหนดเอง):** ปล่อย `BASE_STORAGE_PATH` ให้ว่างไว้ แล้วระบุ `UPLOAD_DIR`, `PROCESSED_DIR`, และ `HISTORY_DB_PATH` ด้วยตัวเอง

### 👨‍💻 เครดิตและการสนับสนุน
- **พัฒนาโดย:** Chok
- **ติดต่อสอบถามและสนับสนุน:** [https://support.chokedatacenter.com](https://support.chokedatacenter.com)
   ```bash