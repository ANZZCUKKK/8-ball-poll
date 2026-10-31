# AsasainPoll — Clone 1:1 AdamzXNinja
## Telegram: https://t.me/anzzseturr

---

## ARSITEKTUR SISTEM

```
┌─────────────────────────────────────────────┐
│              ASASAIN POLL APK               │
│                                             │
│  Flutter UI (Dart)                          │
│  ├── HomeScreen (ESP/AutoPlay/AutoQueue)    │
│  ├── KeyScreen (License validation)         │
│  └── MethodChannel                          │
│           ↓                                 │
│  Kotlin Native Layer                        │
│  ├── NinjaEngine.kt (JNI bridge)           │
│  ├── DaemonService.kt (keep-alive)         │
│  ├── VirtualAppManager.kt (sandbox)        │
│  └── ProxyActivity/Service/Provider x50    │
│           ↓                                 │
│  libninja.so (NDK C)                       │
│  ├── nativeInit()                          │
│  ├── nativeInjectHook(pid) → IL2CPP hook   │
│  ├── nativeActivateCheat(esp,auto,queue)   │
│  └── nativeDeactivateCheat()               │
│           ↓                                 │
│  8 Ball Pool (berjalan di sandbox)          │
│  └── libil2cpp.so → physics hook           │
└─────────────────────────────────────────────┘
           ↕ HTTPS
┌─────────────────────────────────────────────┐
│              API SERVER (VPS)               │
│  ├── /status      → cek server             │
│  ├── /validate-key → validasi license      │
│  ├── /version     → cek update             │
│  ├── /log         → log aktivitas          │
│  └── /admin/*     → generate key, logs     │
└─────────────────────────────────────────────┘
```

---

## STRUKTUR FOLDER

```
AsasainPoll/
├── BASE_APK/                    ← Source Flutter (build jadi APK)
│   ├── android/
│   │   └── app/src/main/
│   │       ├── kotlin/com/asasain/poll/
│   │       │   ├── engine/
│   │       │   │   ├── App.kt              ← Application class
│   │       │   │   ├── NinjaEngine.kt      ← Core engine + JNI
│   │       │   │   ├── DaemonService.kt    ← Keep-alive service
│   │       │   │   └── StubReceiver.kt     ← Broadcast intercept
│   │       │   ├── proxy/
│   │       │   │   ├── VirtualAppManager.kt ← Sandbox manager
│   │       │   │   ├── ProxyActivity.kt    ← 50 proxy slots
│   │       │   │   ├── ProxyService.kt     ← 20 proxy services
│   │       │   │   └── ProxyContentProvider.kt
│   │       │   ├── base/
│   │       │   │   ├── SystemCallProvider.kt ← IPC bridge
│   │       │   │   └── FileProvider.kt
│   │       │   └── view/
│   │       │       ├── main/MainActivity.kt
│   │       │       ├── main/WelcomeActivity.kt
│   │       │       └── update/UpdateRequiredActivity.kt
│   │       ├── res/xml/
│   │       │   ├── network_security_config.xml
│   │       │   └── file_provider_paths.xml
│   │       └── AndroidManifest.xml
│   ├── lib/
│   │   ├── main.dart
│   │   ├── screens/
│   │   │   ├── home_screen.dart    ← UI utama (ESP/AutoPlay/AutoQueue)
│   │   │   └── key_screen.dart     ← Input license key
│   │   ├── services/
│   │   │   ├── engine_service.dart ← Bridge ke native
│   │   │   └── api_service.dart    ← Komunikasi ke VPS
│   │   └── widgets/
│   │       ├── feature_toggle.dart
│   │       └── status_dot.dart
│   └── pubspec.yaml
│
├── NATIVE_LIB/                  ← Native C source untuk libninja.so
│   ├── jni/libninja.c           ← Hook engine IL2CPP 8BP
│   └── CMakeLists.txt           ← Build config NDK
│
├── API_SERVER/                  ← Backend Node.js (deploy ke VPS)
│   ├── index.js                 ← Server utama
│   ├── keylist.json             ← Daftar license key
│   ├── vps.json                 ← Config server
│   ├── database.json
│   ├── logUser.txt
│   └── package.json
│
└── README.md
```

---

## LANGKAH 1 — DEPLOY API SERVER

### Install di VPS (Ubuntu/Debian)
```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo bash -
sudo apt-get install -y nodejs

# Upload folder API_SERVER ke VPS, lalu:
cd API_SERVER
npm install

# Jalankan langsung
node index.js

# Atau permanen dengan PM2
npm install -g pm2
pm2 start index.js --name asasainpoll-api
pm2 save && pm2 startup
```

### Buka port firewall
```bash
sudo ufw allow 3000/tcp
sudo ufw reload
```

### Edit konfigurasi
Buka `vps.json`, ganti:
```json
{
  "adminToken": "TOKEN_RAHASIA_MU_DISINI"
}
```

### Generate license key
```bash
curl -X POST http://IP_VPS:3000/admin/generate-key \
  -H "Content-Type: application/json" \
  -d '{"adminToken":"TOKEN_RAHASIA","username":"user1","durationDays":30}'
```
→ Respons: `{ "key": "AP-XXXXXXXXXXXX", "expiresAt": "..." }`

---

## LANGKAH 2 — BUILD APK

### Siapkan environment (PC/Laptop)
```bash
# Install Flutter SDK
# https://docs.flutter.dev/get-started/install

# Install Android NDK r25
# Di Android Studio: SDK Manager → NDK (Side by Side) → 25.2.9519653

# Edit local.properties di BASE_APK/android/
# Isi:
# flutter.sdk=/path/ke/flutter
# sdk.dir=/path/ke/android-sdk
# ndk.dir=/path/ke/ndk/25.2.9519653
```

### Build APK
```bash
cd BASE_APK
flutter pub get

# Build release (dengan ProGuard + NDK stripped)
flutter build apk --release

# APK ada di:
# build/app/outputs/flutter-apk/app-release.apk
```

### Cara alternatif: Telegram APK Builder
1. Zip seluruh folder `BASE_APK/`
2. Upload ke bot Telegram APK Builder
3. Download APK hasil build

---

## LANGKAH 3 — INSTALL & SETUP DI HP

### Install APK
1. Download `app-release.apk` ke HP
2. Buka file → install (izinkan sumber tidak dikenal)

### Setup pertama
1. Buka **AsasainPoll**
2. Tap tombol **NO KEY** di pojok kanan atas
3. Isi **API Server URL**: `http://IP_VPS:3000`
4. Isi **License Key**: (key yang kamu generate tadi)
5. Tap **VALIDASI**

### Aktifkan permission (WAJIB)
APK akan meminta 2 permission:

**Permission Overlay:**
- Pengaturan → Aplikasi → AsasainPoll → Tampil di Atas Aplikasi Lain → Izinkan

**Tidak perlu Accessibility** (sistem ini pakai VirtualApp sandbox bukan accessibility)

---

## LANGKAH 4 — CARA PAKAI

1. Pastikan status **SERVER ONLINE** (dot biru)
2. Pastikan **KEY ✓** tervalidasi
3. Install 8 Ball Pool di HP (jika belum ada)
4. Di menu AsasainPoll, pilih fitur yang mau diaktifkan:
   - **ESP** → lihat posisi semua bola lewat overlay
   - **AUTO PLAY** → tembakan otomatis ke pocket terbaik
   - **AUTO QUEUE** → pilih bola + pocket optimal secara otomatis
5. Sesuaikan slider **AKURASI** (85-100% recommended)
6. Tap tombol **▶ LAUNCH**
7. 8 Ball Pool akan terbuka di dalam sandbox AsasainPoll
8. Semua cheat aktif saat game berjalan

---

## FITUR

| Fitur | Deskripsi | Method |
|-------|-----------|--------|
| **ESP** | Lihat posisi semua bola + indikator pocket | Native overlay via libninja.so |
| **AUTO PLAY** | Aim + shoot otomatis ke pocket terbaik | IL2CPP ShootFunc hook |
| **AUTO QUEUE** | Pilih bola + pocket optimal | Physics calculation |
| **AKURASI** | Presisi kalkulasi 50-100% | Configurable float |
| **DAEMON** | Engine tetap aktif di background | DaemonService + InnerService |
| **LICENSE** | Validasi key via API server | Server-side validation |
| **UPDATE** | Cek versi terbaru otomatis | /version endpoint |

---

## BYPASS ANTI-CHEAT

| Method | Deskripsi |
|--------|-----------|
| VirtualApp Sandbox | 8BP berjalan di proses kita — anti-cheat tidak bisa detect host |
| Zero memory scan | Tidak ada scan /proc/mem dari luar proses |
| ProGuard R8 | Semua class name di-obfuscate saat release build |
| NDK symbol strip | libninja.so di-strip semua symbol di release |
| No accessibility | Tidak perlu accessibility service — lebih stealth |
| Log removal | Semua Log.d/v dihapus di release build |

---

## TROUBLESHOOT

| Masalah | Solusi |
|---------|--------|
| SERVER OFFLINE | Cek VPS hidup, port 3000 terbuka, PM2 running |
| NATIVE ✗ | libninja.so belum di-build — build dulu via NDK |
| Key tidak valid | Cek URL API benar, key belum expired |
| 8BP tidak terbuka | Cek 8BP sudah terinstall di HP |
| Cheat tidak aktif | Pastikan LAUNCH berhasil (SERVER ONLINE + KEY ✓) |
| APK crash saat buka | Izinkan storage permission di settings |

---

## UPDATE KEY FORMAT

Key prefix: `AP-` diikuti 16 karakter hex uppercase
Contoh: `AP-A3F9B2C1D4E5F601`

Test key bawaan (tidak expired): `AP-TESTKEY00000000`
