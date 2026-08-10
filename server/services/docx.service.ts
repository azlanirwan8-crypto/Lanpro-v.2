import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  HeadingLevel, 
  WidthType, 
  AlignmentType, 
  BorderStyle,
  Header,
  Footer,
  PageNumber
} from "docx";

export async function generateBrdDocx(): Promise<Buffer> {
  const primaryColor = "1e293b"; // Slate 800 (Dark Navy/Slate)
  const secondaryColor = "2563eb"; // Blue 600 (Royal Blue)
  const textColor = "334155"; // Slate 700 (Charcoal)
  const textMutedColor = "64748b"; // Slate 500 (Muted)
  const borderColor = "e2e8f0"; // Slate 200 (Light Border)
  const zebraColor = "f8fafc"; // Slate 50 (Zebra Background)
  const tableHeaderBg = "1e293b"; // Dark Slate

  // Helper to create beautiful headings
  const createTitle = (text: string) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 240, after: 120 },
    children: [
      new TextRun({
        text,
        bold: true,
        size: 56, // 28pt
        font: "Calibri",
        color: primaryColor,
      })
    ]
  });

  const createSubtitle = (text: string) => new Paragraph({
    alignment: AlignmentType.CENTER,
    spacing: { before: 120, after: 480 },
    children: [
      new TextRun({
        text,
        italics: true,
        size: 28, // 14pt
        font: "Calibri",
        color: secondaryColor,
      })
    ]
  });

  const createHeading1 = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 400, after: 120, beforeAutoSpacing: false, afterAutoSpacing: false },
    keepNext: true,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 32, // 16pt
        font: "Calibri",
        color: primaryColor,
      })
    ]
  });

  const createHeading2 = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 100 },
    keepNext: true,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 24, // 12pt
        font: "Calibri",
        color: secondaryColor,
      })
    ]
  });

  const createHeading3 = (text: string) => new Paragraph({
    heading: HeadingLevel.HEADING_3,
    spacing: { before: 180, after: 80 },
    keepNext: true,
    children: [
      new TextRun({
        text,
        bold: true,
        size: 20, // 10pt
        font: "Calibri",
        color: "475569",
      })
    ]
  });

  const createBodyText = (text: string, options: { bold?: boolean; italics?: boolean; color?: string; before?: number; after?: number } = {}) => new Paragraph({
    spacing: { before: options.before !== undefined ? options.before : 60, after: options.after !== undefined ? options.after : 60 },
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italics,
        size: 22, // 11pt
        font: "Calibri",
        color: options.color || textColor,
      })
    ]
  });

  const createBullet = (text: string, boldPrefix?: string) => new Paragraph({
    bullet: {
      level: 0
    },
    spacing: { before: 40, after: 40 },
    children: [
      ...(boldPrefix ? [new TextRun({ text: boldPrefix + ": ", bold: true, size: 22, font: "Calibri", color: textColor })] : []),
      new TextRun({
        text,
        size: 22,
        font: "Calibri",
        color: textColor,
      })
    ]
  });

  const createCodeBlock = (text: string) => {
    const lines = text.split("\n");
    return lines.map(line => new Paragraph({
      spacing: { before: 20, after: 20 },
      children: [
        new TextRun({
          text: line,
          font: "Consolas",
          size: 18, // 9pt
          color: "1e293b",
        })
      ]
    }));
  };

  const createTableCell = (text: string, options: { bold?: boolean; bg?: string; align?: any; color?: string; widthPercent?: number } = {}) => {
    return new TableCell({
      width: options.widthPercent ? { size: options.widthPercent, type: WidthType.PERCENTAGE } : undefined,
      shading: options.bg ? { fill: options.bg } : undefined,
      children: [
        new Paragraph({
          alignment: options.align || AlignmentType.LEFT,
          spacing: { before: 80, after: 80 },
          children: [
            new TextRun({
              text,
              bold: options.bold,
              size: 20, // 10pt
              font: "Calibri",
              color: options.color || (options.bg === tableHeaderBg ? "ffffff" : textColor),
            })
          ]
        })
      ],
      borders: {
        top: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        bottom: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        left: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
        right: { style: BorderStyle.SINGLE, size: 4, color: borderColor },
      }
    });
  };

  const doc = new Document({
    creator: "Lead Systems Architect & TPM",
    title: "LanPro BRD & Technical Documentation",
    description: "Sistem Manajemen SDLC LanPro - Platform Kolaborasi Engineering Kelas Enterprise",
    sections: [
      {
        properties: {},
        headers: {
          default: new Header({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                spacing: { after: 200 },
                children: [
                  new TextRun({
                    text: "LanPro SDLC Platform | Business Requirement Document & Technical Specifications",
                    size: 16, // 8pt
                    font: "Calibri",
                    color: textMutedColor,
                  })
                ]
              })
            ]
          })
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [
                  new TextRun({
                    text: "Halaman ",
                    size: 18,
                    font: "Calibri",
                    color: textMutedColor,
                  }),
                  new TextRun({
                    children: [PageNumber.CURRENT],
                    size: 18,
                    font: "Calibri",
                    color: textMutedColor,
                  }),
                  new TextRun({
                    text: " dari ",
                    size: 18,
                    font: "Calibri",
                    color: textMutedColor,
                  }),
                  new TextRun({
                    children: [PageNumber.TOTAL_PAGES],
                    size: 18,
                    font: "Calibri",
                    color: textMutedColor,
                  }),
                ]
              })
            ]
          })
        },
        children: [
          // ==========================================
          // COVER PAGE
          // ==========================================
          new Paragraph({ spacing: { before: 1440 } }), // Spacer
          createTitle("BUSINESS REQUIREMENT DOCUMENT (BRD) & DOKUMENTASI TEKNIS"),
          createSubtitle("LanPro - Platform Manajemen SDLC Kelas Enterprise"),
          new Paragraph({ spacing: { before: 240, after: 240 } }), // Spacer
          
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 120 },
            children: [
              new TextRun({
                text: "Dokumen Panduan Utama & Spesifikasi Arsitektur",
                bold: true,
                size: 24,
                font: "Calibri",
                color: primaryColor,
              })
            ]
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 720 },
            children: [
              new TextRun({
                text: "Versi 1.5 (Production Ready)",
                bold: true,
                size: 20,
                font: "Calibri",
                color: "16a34a", // Green
              })
            ]
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Atribut Dokumen", { bold: true, bg: tableHeaderBg, widthPercent: 30 }),
                  createTableCell("Detail Deskripsi", { bold: true, bg: tableHeaderBg, widthPercent: 70 }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Nama Aplikasi", { bold: true, bg: zebraColor }),
                  createTableCell("LanPro (Professional-Grade SDLC Collaboration Platform)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Pemilik Dokumen", { bold: true }),
                  createTableCell("Lead Systems Architect, Senior System Analyst & Technical Product Manager"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Tanggal Publikasi", { bold: true, bg: zebraColor }),
                  createTableCell("3 Juli 2026 (Waktu Lokal Server)"),
                ]
              }),
              createTableRowWithCells([
                createTableCell("Status Kelayakan", { bold: true }),
                createTableCell("APPROVED & SIGNED (Single Source of Truth untuk Re-Engineering)")
              ]),
              createTableRowWithCells([
                createTableCell("Klasifikasi", { bold: true, bg: zebraColor }),
                createTableCell("CONFIDENTIAL - Internal Engineering Team Only")
              ])
            ]
          }),

          new Paragraph({ pageBreakBefore: true }),

          // ==========================================
          // SEKSI 1: EXECUTIVE SUMMARY & OBJECTIVE
          // ==========================================
          createHeading1("1. EXECUTIVE SUMMARY & OBJECTIVE"),
          
          createHeading2("1.1. Latar Belakang & Deskripsi Bisnis"),
          createBodyText(
            "LanPro adalah sebuah platform manajemen Software Development Life Cycle (SDLC) kelas enterprise yang dirancang khusus untuk memenuhi standar keandalan, akuntabilitas, dan kolaborasi teknis tingkat tinggi di departemen rekayasa perangkat lunak. Masalah utama yang sering dihadapi oleh tim pengembang besar adalah fragmentasi alat (siloed tools) — di mana perencanaan sprint dilakukan di satu aplikasi, visualisasi arsitektur di aplikasi lain, komunikasi tim di aplikasi ketiga, dan pencatatan kepatuhan dilakukan secara manual."
          ),
          createBodyText(
            "LanPro memecahkan tantangan ini dengan mengintegrasikan manajemen proyek agile berbasis Scrum/Kanban, ruang kolaborasi chat instan real-time, wiki dokumentasi teknis interaktif, editor diagram alur (flowchart) arsitektur, pelacakan roadmap strategis, serta manajemen hak akses berbasis peran (RBAC) 5-level dalam satu kesatuan sistem yang kohesif. Sistem ini dirancang untuk memaksimalkan efisiensi rekayasa perangkat lunak sekaligus menyediakan transparansi dan kepatuhan audit secara penuh."
          ),

          createHeading2("1.2. Tujuan Pengembangan Uang (Objective of Re-Engineering)"),
          createBodyText(
            "Tujuan utama dari inisiatif penulisan ulang (rewriting/re-engineering) ini adalah meningkatkan ketahanan teknis sistem agar mampu menangani pertumbuhan pengguna dan transaksi yang masif. Fokus utama meliputi:"
          ),
          createBullet("Mencapai latensi API di bawah 200 milidetik untuk operasi baca (GET) dan di bawah 300 milidetik untuk penulisan (POST/PUT).", "Optimasi Performa"),
          createBullet("Implementasi Connection Pooling teruji (DB_CONNECTION_LIMIT=100, DB_MAX_IDLE=50) untuk mencegah starvation thread database pada saat beban puncak konkurensi.", "Skalabilitas Database"),
          createBullet("Penyediaan isolasi data multi-penyewa (multi-tenant) yang tangguh dan pelacakan audit (audit trail) terperinci untuk memenuhi standar kepatuhan industri.", "Kepatuhan Keamanan"),
          createBullet("Pengembangan arsitektur real-time yang andal menggunakan Socket.io dengan redundansi Redis Adapter, memastikan sinkronisasi instan tanpa membebani thread utama server.", "Sinkronisasi Real-time"),

          createHeading2("1.3. Batasan Sistem (Scope of Work)"),
          createHeading3("Di Dalam Cakupan (In Scope)"),
          createBullet("Manajemen Pengguna terenkripsi dengan hashing BCrypt dan autentikasi berbasis JWT token dengan siklus hidup kedaluwarsa 24 jam.", "Autentikasi & Otorisasi"),
          createBullet("Scrum Backlog, Perencanaan Sprint (Sprints), Pelacakan Task (Epics, Tasks, Subtasks, Bugs, Meeting, Document, Approval) lengkap dengan Story Points dan Kriteria Penerimaan (Acceptance Criteria).", "Manajemen Proyek Agile"),
          createBullet("Visualisasi Kanban Board interaktif yang mendukung Drag & Drop dinamis dengan pembaruan status instan ke seluruh klien aktif.", "Visualisasi Kolaboratif"),
          createBullet("Roadmap proyek dan Gantt Chart berakurasi hari untuk pelacakan target milestone penting.", "Perencanaan Strategis"),
          createBullet("Papan Wiki internal yang mendukung visualisasi dokumen berbasis Markdown, unggahan file fisik (PDF, DOCX, XLSX), serta integrasi sematan iframe Google Docs ber-sandbox ketat.", "Dokumentasi & Wiki"),
          createBullet("Sistem chat instan per proyek untuk komunikasi real-time, dilengkapi integrasi bot simulasi balasan otomatis untuk alur kerja otomatis.", "Kolaborasi Real-time"),
          createBullet("Enterprise Audit Trail yang mencatat setiap aktivitas mutasi data penting lengkap dengan IP address, detail payload, pengidentifikasi aktor, dan timestamp berskala milidetik.", "Log Audit Perusahaan"),

          createHeading3("Di Luar Cakupan (Out of Scope)"),
          createBullet("LanPro tidak bertindak sebagai penyedia hosting repositori internal (seperti GitHub/GitLab), melainkan hanya mengintegrasikan URL referensi eksternal.", "Hosting Kode Sumber"),
          createBullet("Platform tidak melakukan eksekusi deployment atau pengelolaan server cloud pelanggan secara langsung.", "Automated CI/CD Execution"),
          createBullet("Sistem tidak menyediakan penggajian otomatis, manajemen pajak, atau modul keuangan di luar anggaran proyek.", "Manajemen Payroll & Invoicing"),

          new Paragraph({ pageBreakBefore: true }),

          // ==========================================
          // SEKSI 2: ACTOR & ROLE-BASED ACCESS CONTROL (RBAC)
          // ==========================================
          createHeading1("2. ACTOR & ROLE-BASED ACCESS CONTROL (RBAC)"),
          createBodyText(
            "LanPro mengadopsi model Role-Based Access Control (RBAC) yang ketat untuk mengamankan data proyek dari akses yang tidak berwenang. Terdapat 5 peran (role) utama dalam sistem. Matriks hak akses detail didefinisikan sebagai berikut:"
          ),

          // RBAC Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Aktor (Role)", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Deskripsi Tanggung Jawab", { bold: true, bg: tableHeaderBg, widthPercent: 35 }),
                  createTableCell("Modul Utama Diakses", { bold: true, bg: tableHeaderBg, widthPercent: 25 }),
                  createTableCell("Hak Akses (CRUD)", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Admin", { bold: true, bg: zebraColor }),
                  createTableCell("Superuser pengelola sistem global, pemulihan database, audit keamanan, dan manajemen lisensi pengguna.", { bg: zebraColor }),
                  createTableCell("Seluruh Modul + Database Explorer + System Restore", { bg: zebraColor }),
                  createTableCell("FULL ACCESS (C, R, U, D)", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Head of Engineering", { bold: true }),
                  createTableCell("Eksekutif teknis yang memantau produktivitas tim, menyetujui milestone proyek, dan meninjau log audit kepatuhan."),
                  createTableCell("Dashboard Metrik, Gantt Roadmap, Enterprise Audit"),
                  createTableCell("READ ALL, CREATE / UPDATE MILESTONE (R, U)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Manager (Project/Product Manager)", { bold: true, bg: zebraColor }),
                  createTableCell("Pemilik taktis proyek. Mengatur sprint backlog, menetapkan estimasi story points, menetapkan tenggat waktu, dan mengelola anggota tim.", { bg: zebraColor }),
                  createTableCell("Planning, Kanban Board, Wiki, Sprints, Team Setup", { bg: zebraColor }),
                  createTableCell("CREATE, READ, UPDATE, DELETE PROJECT DATA (C, R, U, D)", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("User (Developer/QA/Designer)", { bold: true }),
                  createTableCell("Eksekutor teknis. Bertanggung jawab memperbarui status task harian, mencatat isu baru, menulis komentar, dan berkolaborasi di chat."),
                  createTableCell("Kanban Board, Issue List, Wiki, Chat, Sprints"),
                  createTableCell("CREATE/UPDATE TASKS & CHAT, READ ALL (C, R, U)"),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("Viewer (Stakeholder/Auditor)", { bold: true, bg: zebraColor }),
                  createTableCell("Pihak ketiga atau eksternal yang memantau progres pengembangan proyek tanpa hak manipulasi data apa pun.", { bg: zebraColor }),
                  createTableCell("Kanban Board (Read), Gantt Roadmap (Read), Wiki (Read)", { bg: zebraColor }),
                  createTableCell("READ ONLY (R)", { bg: zebraColor }),
                ]
              }),
            ]
          }),

          createHeading2("2.1. Spesifikasi Izin Modul (Module Granular Permissions)"),
          createBodyText(
            "Setiap peran dipetakan ke objek izin dinamis UserPermissions di tingkat basis data. Ini memungkinkan validasi hak akses yang sangat rinci saat runtime Express API menggunakan middleware otorisasi. Aturan dasar meliputi:"
          ),
          createBullet("Izin penulisan (Create/Update/Delete) pada modul 'Planning' dan 'Sprints' dibatasi hanya untuk peran 'Admin', 'Head', dan 'Manager'. Anggota tim biasa ('User') hanya memiliki izin baca (Read).", "Modul Perencanaan"),
          createBullet("Developer ('User') diizinkan mengubah status tugas ('Tasks') pada papan Kanban, namun tidak diizinkan mengubah properti krusial seperti 'Story Points' atau menghapus tugas secara permanen tanpa persetujuan 'Manager'.", "Modul Kanban Board"),
          createBullet("Hanya 'Admin' yang memiliki izin mutlak untuk menghapus riwayat log audit (Audit Logs) atau melakukan pemulihan sistem (system restore).", "Modul Keamanan & Pemulihan"),

          new Paragraph({ pageBreakBefore: true }),

          // ==========================================
          // SEKSI 3: CORE FUNCTIONAL REQUIREMENTS & ARCHITECTURE FLOW
          // ==========================================
          createHeading1("3. CORE FUNCTIONAL REQUIREMENTS & ARCHITECTURE FLOW"),
          createBodyText(
            "Bagian ini menguraikan logika fungsional dan teknis yang sangat spesifik untuk empat modul utama LanPro yang menjadi inti nilai bisnis aplikasi."
          ),

          createHeading2("3.1. Modul A: Perencanaan & Siklus Sprint (Agile Sprint Lifecycle)"),
          createHeading3("A. Business Flow / User Journey"),
          createBullet("Project Manager (Manager) menavigasi ke halaman 'Planning' di sidebar proyek.", "Langkah 1"),
          createBullet("Manager menekan tombol 'Create Sprint', kemudian mengisi detail parameter: 'Sprint Name' (wajib), 'Sprint Goal' (opsional), 'Start Date' dan 'End Date' (wajib). Tanggal harus valid dan masa durasi standar adalah 1-4 minggu.", "Langkah 2"),
          createBullet("Sistem membuat container sprint baru dengan status 'planned' (belum aktif).", "Langkah 3"),
          createBullet("Manager melakukan 'Backlog Grooming' dengan menarik tugas-tugas (Tasks) dari daftar backlog proyek ke dalam kontainer sprint baru tersebut.", "Langkah 4"),
          createBullet("Manager menekan tombol 'Start Sprint' untuk memulai sprint. Status sprint berubah menjadi 'active'. Seluruh anggota tim pengembang langsung mendapatkan notifikasi real-time bahwa sprint telah dimulai.", "Langkah 5"),

          createHeading3("B. Technical Flow (Logika Sistem & Transaksi Backend)"),
          createBodyText(
            "Ketika pengguna menekan tombol 'Start Sprint', serangkaian proses backend berjalan secara sinkronus dalam transaksi database tunggal:"
          ),
          createBullet("REST Endpoint target: PUT `/api/projects/:projectId/sprints/:sprintId/start`.", "1. Verifikasi Endpoint"),
          createBullet("Middleware `authenticateJWT` mengurai token akses dari Authorization Header. Middleware `verifyProjectAccess` memverifikasi bahwa aktor memiliki peran 'admin', 'head', atau 'manager' di proyek tersebut.", "2. Otentikasi & Otorisasi"),
          createBullet("Koneksi MySQL diambil dari pool. Transaksi dimulai menggunakan perintah `START TRANSACTION`.", "3. Mulai Transaksi SQL"),
          createBullet("Sistem memeriksa apakah ada sprint lain yang sedang aktif di proyek yang sama melalui query: `SELECT id FROM Sprints WHERE projectId = ? AND status = 'active'`. Jika ada, transaksi di-rollback dan server mengembalikan status 400 Bad Request dengan pesan kesalahan: 'Ada sprint lain yang sedang aktif di proyek ini.'", "4. Validasi Konkurensi Sprint"),
          createBullet("Sistem memperbarui status sprint target ke 'active' di database: `UPDATE Sprints SET status = 'active', startDate = ?, endDate = ? WHERE id = ?`. Dan memperbarui waktu pembaruan proyek.", "5. Update Status Sprint"),
          createBullet("Log riwayat aktivitas dicatat ke tabel `ActivityLogs` untuk kebutuhan audit: 'User [username] mengaktifkan Sprint [Sprint Name]'.", "6. Pencatatan Log Aktivitas"),
          createBullet("Transaksi database di-commit secara permanen ke disk (`COMMIT`).", "7. Commit Transaksi"),
          createBullet("Socket.io memancarkan event `sprint:status_changed` dengan payload `{ projectId, sprintId, status: 'active' }` ke room Socket proyek untuk memperbarui antarmuka pengguna pengembang lain secara instan tanpa perlu memuat ulang halaman.", "8. Broadcast Real-time"),

          createHeading3("C. Edge Cases & Exception Handling"),
          createBullet("Jika pengguna memasukkan tanggal mulai atau selesai yang berada di masa lalu, atau tanggal mulai setelah tanggal selesai, backend memvalidasi ini di tingkat handler controller sebelum memproses database dan mengembalikan status 400 'Rentang tanggal tidak valid.'", "Tanggal Tidak Valid"),
          createBullet("Jika terjadi kegagalan server atau koneksi terputus di tengah proses, blok `catch (error)` akan mengeksekusi perintah SQL `ROLLBACK` secara otomatis. Ini menjamin database tidak akan pernah berada dalam kondisi inkonsisten (misal: sprint berstatus aktif tetapi log aktivitas gagal dicatat).", "Koneksi Database Terputus"),
          createBullet("Jika ada developer lain yang mencoba mematikan atau memodifikasi sprint pada waktu yang persis bersamaan, sistem memanfaatkan mekanisme Optimistic Locking berbasis versi kolom di database untuk mendeteksi konflik konkurensi, menolak permintaan kedua, dan mengembalikan status 409 Conflict.", "Race Condition Pembaruan Sprint"),

          createHeading2("3.2. Modul B: Pelacakan Task & Kanban Board (Task Lifecycle)"),
          createHeading3("A. Business Flow / User Journey"),
          createBullet("Anggota tim pengembang (User) membuka halaman 'Kanban Board' untuk melihat daftar tugas yang sedang berjalan dalam sprint aktif.", "Langkah 1"),
          createBullet("User memilih salah satu kartu tugas (misal: KAN-12 dengan status 'To Do').", "Langkah 2"),
          createBullet("User menarik (drag) kartu tugas tersebut dan meletakkannya (drop) pada kolom 'In Progress'. Kartu tugas secara visual berpindah secara instan dengan animasi yang mulus.", "Langkah 3"),
          createBullet("Sistem memproses pembaruan status dan menyinkronkan data tersebut ke semua layar rekan kerja yang sedang membuka papan Kanban yang sama secara real-time.", "Langkah 4"),

          createHeading3("B. Technical Flow (Logika Sistem Backend)"),
          createBullet("REST Endpoint target: PUT `/api/projects/:projectId/tasks/:taskId/status`.", "1. Endpoint"),
          createBullet("Menerima payload JSON: `{ status: 'In Progress', currentVersion: 2 }`.", "2. Payload Input"),
          createBullet("Sistem memverifikasi hak akses pengguna untuk memastikan peran mereka minimal adalah 'User' yang terdaftar sebagai anggota proyek aktif.", "3. Otorisasi Peran"),
          createBullet("Backend mengambil data task saat ini untuk memvalidasi versi konkurensi: `SELECT version, status FROM Tasks WHERE id = ?`. Jika `version` di database tidak cocok dengan `currentVersion` dari payload, ini mengindikasikan data di layar user sudah usang (stale data). Server mengembalikan status 409 Conflict dengan instruksi agar user melakukan refresh.", "4. Optimistic Locking Check"),
          createBullet("Jika verifikasi versi berhasil, database diperbarui: `UPDATE Tasks SET status = ?, version = version + 1 WHERE id = ? AND version = ?`. Kueri ini memvalidasi ulang versi di klausa WHERE.", "5. Eksekusi Update Transaksional"),
          createBullet("Sistem mencatat entri baru di tabel `ActivityLogs` untuk mencatat riwayat perubahan status.", "6. Catatan Log"),
          createBullet("Server memancarkan event Socket.io `task:status_changed` berisi detail perubahan tugas ke semua klien di proyek terkait.", "7. Broadcast Event"),

          createHeading3("C. Edge Cases & Exception Handling"),
          createBullet("Jika task tersebut ditandai memiliki dependensi pemblokir (`isBlocked = true` atau memiliki relasi `blocks` dari task lain yang belum selesai), sistem akan memunculkan modal peringatan di frontend dan mengembalikan status 400 di backend 'Tugas diblokir oleh task KAN-5.'", "Task Diblokir (Task Blocking)"),
          createBullet("Jika input status tidak sesuai dengan enum status yang diizinkan (misal: 'SelesaiSekali' yang tidak terdaftar di Master Data), kueri divalidasi dan ditolak dengan status 400 Bad Request.", "Input Status Tidak Valid"),

          createHeading2("3.3. Modul C: Kolaborasi Tim & Real-time Chat (Socket.io Engine)"),
          createHeading3("A. Business Flow / User Journey"),
          createBullet("Tim pengembang membuka panel obrolan 'Chat' di sidebar proyek.", "Langkah 1"),
          createBullet("Sistem menghubungkan pengguna ke saluran obrolan proyek secara otomatis dan menampilkan daftar riwayat pesan sebelumnya.", "Langkah 2"),
          createBullet("User mengetik pesan teks baru (atau memicu simulasi otomatis dengan mengetik perintah khusus) dan menekan tombol kirim atau tombol Enter.", "Langkah 3"),
          createBullet("Pesan langsung terkirim dan muncul di panel chat milik seluruh anggota tim yang aktif tanpa penundaan (real-time).", "Langkah 4"),

          createHeading3("B. Technical Flow (Logika Sistem & Sinkronisasi Redundansi)"),
          createBullet("Koneksi awal Socket.io diinisialisasi pada port 3000. Saat jabat tangan (handshake) awal, server memverifikasi token JWT yang dikirimkan oleh klien dalam query parameter `token`. Jika token tidak valid, koneksi socket ditolak.", "1. Handshake Keamanan"),
          createBullet("Setelah berhasil terhubung, klien dikelompokkan ke dalam ruang obrolan virtual proyek menggunakan metode: `socket.join('project:' + projectId)`.", "2. Room Join"),
          createBullet("Saat klien menembakkan event `message:send` dengan payload `{ content: 'Mulai pengerjaan API', projectId }`, server memvalidasi isi payload.", "3. Message Event"),
          createBullet("Server menyisipkan record pesan baru ke dalam tabel `Messages` database menggunakan query SQL ter-pool.", "4. Penyimpanan Database"),
          createBullet("Server menyiarkan pesan tersebut menggunakan perintah: `io.to('project:' + projectId).emit('message:received', savedMessage)`. Jika aplikasi berjalan dalam beberapa container di lingkungan produksi, Socket.io Redis Adapter secara otomatis mereplikasi event ini ke seluruh klaster Redis (port 6379) untuk diteruskan ke semua server aktif.", "5. Broadcast Multicast"),

          createHeading3("C. Edge Cases & Exception Handling"),
          createBullet("Jika koneksi server ke klaster Redis pusat terputus (Redis Connection Timeout), sistem menangkap kegagalan tersebut dalam blok catch, mencetak log anomali non-kritis, dan secara dinamis menurunkan adapter Socket.io ke mode lokal (in-memory adapter). Ini memastikan fungsionalitas obrolan tetap berjalan normal pada satu instance server tanpa mengganggu kenyamanan pengguna.", "Redis Connection Timeout"),
          createBullet("Jika koneksi internet klien sangat lambat atau terputus secara periodik, pustaka Socket.io klien dikonfigurasi untuk melakukan rekoneksi otomatis dengan metode exponential backoff dan mempertahankan antrean pesan lokal (local queue buffering) untuk dikirim ulang setelah terhubung kembali.", "Klien Mengalami Network Fluctuation"),

          createHeading2("3.4. Modul D: Dokumentasi Wiki & Integrasi Sandbox Embed"),
          createHeading3("A. Business Flow / User Journey"),
          createBullet("User menavigasi ke halaman 'Dokumentasi' (Wiki) untuk menyusun dokumen spesifikasi fungsional (FSD) atau panduan teknis.", "Langkah 1"),
          createBullet("User menekan tombol '+' (Tambah Dokumen), memilih jenis dokumen (misal: 'PRD'), menulis judul, deskripsi dengan markup, dan menyisipkan tautan Google Docs.", "Langkah 2"),
          createBullet("User menekan tombol 'Simpan'. Dokumen tersimpan dan terdaftar di sidebar wiki.", "Langkah 3"),
          createBullet("Saat dokumen dipilih, user dapat melihat konten dokumen yang terformat rapi dan beralih ke tab 'Live Preview' untuk mengedit dokumen Google Docs tersebut secara interaktif langsung dari dalam bingkai (frame) aplikasi LanPro.", "Langkah 4"),

          createHeading3("B. Technical Flow (Logika Sistem & Pengamanan Sematan)"),
          createBullet("Klien mengirim data form ke REST API POST `/api/projects/:projectId/documents`.", "1. API Submission"),
          createBullet("Isi dokumen Markdown disimpan sebagai string teks panjang (LONGTEXT atau TEXT) di basis data. Tautan eksternal divalidasi menggunakan ekspresi reguler untuk memastikan hanya domain tepercaya (seperti `docs.google.com`) yang diizinkan.", "2. Validasi URL & Penyimpanan"),
          createBullet("Klien mengambil dokumen dan merendernya menggunakan komponen `react-markdown` yang aman.", "3. Rendering Markdown Aman"),
          createBullet("Untuk menyajikan pratinjau langsung Google Docs, sistem mengubah URL penyuntingan standar (`/edit`) menjadi URL pratinjau (`/preview`) secara dinamis di sisi klien.", "4. Transformasi URL Embed"),
          createBullet("Halaman menyematkan dokumen tersebut menggunakan elemen `<iframe>` yang dilengkapi atribut keamanan ketat: `sandbox='allow-scripts allow-same-origin allow-forms allow-popups'`.", "5. Sandbox Iframe Isolation"),

          createHeading3("C. Edge Cases & Exception Handling"),
          createBullet("Untuk mencegah serangan Cross-Site Scripting (XSS) di mana user jahat menyisipkan tag `<script>` ke dalam deskripsi wiki, backend menjalankan pustaka pembersih (sanitization) seperti `DOMPurify` sebelum menyimpan konten ke database.", "XSS Injection Prevention"),
          createBullet("Jika link Google Docs yang diinput tidak dipublikasikan atau tidak memiliki izin akses publik, iframe akan menampilkan pesan error bawaan Google. Sistem mengatasinya dengan menyediakan tombol fallback 'Buka di Tab Baru' agar user dapat meminta akses langsung ke pemilik dokumen.", "Iframe Access Denied"),

          new Paragraph({ pageBreakBefore: true }),

          // ==========================================
          // SEKSI 4: DATABASE & DATA INTEGRITY RELATIONSHIP
          // ==========================================
          createHeading1("4. DATABASE & DATA INTEGRITY RELATIONSHIP"),
          createBodyText(
            "Keberhasilan re-engineering LanPro sangat bergantung pada konsistensi dan integritas data di tingkat basis data. Di bawah ini adalah rekomendasi skema tabel MySQL utama yang krusial beserta relasi dan aturan integritasnya."
          ),

          createHeading2("4.1. Rekomendasi Skema Tabel Utama"),
          
          createHeading3("A. Tabel Users (Menyimpan Profil Pengguna)"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Nama Kolom", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Tipe Data", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Atribut / Constraints", { bold: true, bg: tableHeaderBg, widthPercent: 25 }),
                  createTableCell("Deskripsi Fungsional", { bold: true, bg: tableHeaderBg, widthPercent: 35 }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("id", { bold: true, bg: zebraColor }),
                  createTableCell("VARCHAR(36)", { bg: zebraColor }),
                  createTableCell("PRIMARY KEY, NOT NULL", { bg: zebraColor }),
                  createTableCell("UUID unik pengenal pengguna.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("username"),
                  createTableCell("VARCHAR(50)"),
                  createTableCell("UNIQUE, NOT NULL"),
                  createTableCell("Nama pengguna unik untuk login."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("email", { bg: zebraColor }),
                  createTableCell("VARCHAR(100)", { bg: zebraColor }),
                  createTableCell("UNIQUE, NOT NULL", { bg: zebraColor }),
                  createTableCell("Alamat surel pengguna untuk komunikasi.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("passwordHash"),
                  createTableCell("VARCHAR(255)"),
                  createTableCell("NOT NULL"),
                  createTableCell("Hash password terenkripsi BCrypt."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("role", { bg: zebraColor }),
                  createTableCell("ENUM('admin', 'head', 'manager', 'user', 'viewer')", { bg: zebraColor }),
                  createTableCell("NOT NULL, DEFAULT 'user'", { bg: zebraColor }),
                  createTableCell("Peran otorisasi global pengguna.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("status"),
                  createTableCell("VARCHAR(20)"),
                  createTableCell("NOT NULL, DEFAULT 'pending'"),
                  createTableCell("Status persetujuan akun: approved, pending, rejected."),
                ]
              }),
            ]
          }),

          createHeading3("B. Tabel Projects (Menyimpan Data Proyek)"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Nama Kolom", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Tipe Data", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Atribut / Constraints", { bold: true, bg: tableHeaderBg, widthPercent: 25 }),
                  createTableCell("Deskripsi Fungsional", { bold: true, bg: tableHeaderBg, widthPercent: 35 }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("id", { bold: true, bg: zebraColor }),
                  createTableCell("VARCHAR(36)", { bg: zebraColor }),
                  createTableCell("PRIMARY KEY, NOT NULL", { bg: zebraColor }),
                  createTableCell("UUID unik pengenal proyek.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("name"),
                  createTableCell("VARCHAR(100)"),
                  createTableCell("NOT NULL"),
                  createTableCell("Nama proyek pengembangan."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("key", { bg: zebraColor }),
                  createTableCell("VARCHAR(10)", { bg: zebraColor }),
                  createTableCell("UNIQUE, NOT NULL", { bg: zebraColor }),
                  createTableCell("Singkatan proyek untuk kode task (misal: 'KAN').", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("ownerId"),
                  createTableCell("VARCHAR(36)"),
                  createTableCell("FOREIGN KEY references Users(id)"),
                  createTableCell("User pengelola utama/pembuat proyek."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("taskCounter", { bg: zebraColor }),
                  createTableCell("INT", { bg: zebraColor }),
                  createTableCell("NOT NULL, DEFAULT 0", { bg: zebraColor }),
                  createTableCell("Counter sequential untuk nomor urut task.", { bg: zebraColor }),
                ]
              }),
            ]
          }),

          createHeading3("C. Tabel Sprints (Menyimpan Riwayat Sprint)"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Nama Kolom", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Tipe Data", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Atribut / Constraints", { bold: true, bg: tableHeaderBg, widthPercent: 25 }),
                  createTableCell("Deskripsi Fungsional", { bold: true, bg: tableHeaderBg, widthPercent: 35 }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("id", { bold: true, bg: zebraColor }),
                  createTableCell("VARCHAR(36)", { bg: zebraColor }),
                  createTableCell("PRIMARY KEY, NOT NULL", { bg: zebraColor }),
                  createTableCell("UUID unik sprint.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("projectId"),
                  createTableCell("VARCHAR(36)"),
                  createTableCell("FOREIGN KEY references Projects(id) ON DELETE CASCADE"),
                  createTableCell("Relasi ke proyek terkait."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("name", { bg: zebraColor }),
                  createTableCell("VARCHAR(100)", { bg: zebraColor }),
                  createTableCell("NOT NULL", { bg: zebraColor }),
                  createTableCell("Nama sprint (misal: 'Sprint 1 - MVP').", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("status"),
                  createTableCell("VARCHAR(20)"),
                  createTableCell("NOT NULL, DEFAULT 'planned'"),
                  createTableCell("Status siklus sprint: planned, active, completed."),
                ]
              }),
            ]
          }),

          createHeading3("D. Tabel Tasks (Menyimpan Data Unit Tugas / Isu)"),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createTableCell("Nama Kolom", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Tipe Data", { bold: true, bg: tableHeaderBg, widthPercent: 20 }),
                  createTableCell("Atribut / Constraints", { bold: true, bg: tableHeaderBg, widthPercent: 25 }),
                  createTableCell("Deskripsi Fungsional", { bold: true, bg: tableHeaderBg, widthPercent: 35 }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("id", { bold: true, bg: zebraColor }),
                  createTableCell("VARCHAR(36)", { bg: zebraColor }),
                  createTableCell("PRIMARY KEY, NOT NULL", { bg: zebraColor }),
                  createTableCell("UUID unik tugas.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("projectId"),
                  createTableCell("VARCHAR(36)"),
                  createTableCell("FOREIGN KEY references Projects(id) ON DELETE CASCADE"),
                  createTableCell("Relasi ke proyek terkait."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("key", { bg: zebraColor }),
                  createTableCell("VARCHAR(20)", { bg: zebraColor }),
                  createTableCell("UNIQUE, NOT NULL", { bg: zebraColor }),
                  createTableCell("Kode unik tugas sequential (misal: 'KAN-15').", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("title"),
                  createTableCell("VARCHAR(255)"),
                  createTableCell("NOT NULL"),
                  createTableCell("Judul ringkas tugas."),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("status", { bg: zebraColor }),
                  createTableCell("VARCHAR(50)", { bg: zebraColor }),
                  createTableCell("NOT NULL, DEFAULT 'To Do'", { bg: zebraColor }),
                  createTableCell("Status pengerjaan task di Kanban Board.", { bg: zebraColor }),
                ]
              }),
              new TableRow({
                children: [
                  createTableCell("version"),
                  createTableCell("INT"),
                  createTableCell("NOT NULL, DEFAULT 1"),
                  createTableCell("Kolom versi untuk Optimistic Locking."),
                ]
              }),
            ]
          }),

          createHeading2("4.2. Aturan Data Integrity yang Wajib Dijaga"),
          createBullet("Setiap operasi yang memodifikasi lebih dari satu tabel (seperti pembaruan status task sekaligus penulisan ke ActivityLogs, atau pembuatan task yang meng-increment `taskCounter` milik Projects) WAJIB dieksekusi dalam blok transaksi SQL `START TRANSACTION`. Jika ada satu operasi gagal, seluruh rangkaian instruksi wajib dibatalkan via `ROLLBACK`.", "Integritas Transaksi (Transactional Integrity)"),
          createBullet("Ketika sebuah proyek dihapus, seluruh entri terkait di tabel anak (`Sprints`, `Tasks`, `ProjectMembers`, `WikiDocuments`) wajib terhapus secara otomatis menggunakan constraint `ON DELETE CASCADE`. Namun untuk tabel `AuditLogs` dan `ActivityLogs`, kueri foreign key harus diatur ke `SET NULL` agar riwayat audit pelaku tetap tersimpan demi kepatuhan forensik keamanan.", "Cascade Delete Rules"),
          createBullet("Guna menjamin keandalan data pada kondisi konkurensi tinggi, kolom `version` bertipe integer wajib dipertahankan pada tabel `Tasks`. Setiap pembaruan data wajib menyertakan klausa `WHERE id = ? AND version = ?` dan melakukan set `version = version + 1`. Hal ini mencegah anomali kehilangan pembaruan data (Lost Update Anomaly) saat dua developer mengedit task yang sama secara simultan.", "Optimistic Locking & Version Check"),

          new Paragraph({ pageBreakBefore: true }),

          // ==========================================
          // SEKSI 5: API SPECIFICATION MOODBOARD
          // ==========================================
          createHeading1("5. API SPECIFICATION MOODBOARD (INTEGRATION POINTS)"),
          createBodyText(
            "Berikut adalah spesifikasi antarmuka pemrograman aplikasi (API) untuk alur kerja yang paling kritis dalam sistem: Pembuatan Task Baru dan Pembaruan Status Task."
          ),

          createHeading2("5.1. Endpoint A: Membuat Task Baru (Create Task Flow)"),
          createHeading3("HTTP Method & URL"),
          createBodyText("POST /api/projects/:projectId/tasks", { bold: true, color: secondaryColor }),
          
          createHeading3("Request Header"),
          ...createCodeBlock(
            "Authorization: Bearer <JWT_ACCESS_TOKEN>\nContent-Type: application/json"
          ),

          createHeading3("Request Payload (JSON Body)"),
          ...createCodeBlock(
            "{\n" +
            "  \"title\": \"Implementasi Connection Pooling MySQL\",\n" +
            "  \"description\": \"Konfigurasi limit pooling di mysql.ts menggunakan env variabel.\",\n" +
            "  \"type\": \"task\",\n" +
            "  \"storyPoints\": 5,\n" +
            "  \"acceptanceCriteria\": \"1. Menggunakan DB_CONNECTION_LIMIT\\n2. Lolos uji beban kueri paralel\",\n" +
            "  \"priority\": \"High\",\n" +
            "  \"sprintId\": \"sprint-9a8b7c6d-5e4f\"\n" +
            "}"
          ),

          createHeading3("Response Sukses (201 Created)"),
          ...createCodeBlock(
            "{\n" +
            "  \"status\": \"success\",\n" +
            "  \"data\": {\n" +
            "    \"id\": \"task-f5e4d3c2-b1a0\",\n" +
            "    \"projectId\": \"proj-1234-5678\",\n" +
            "    \"key\": \"LAN-42\",\n" +
            "    \"title\": \"Implementasi Connection Pooling MySQL\",\n" +
            "    \"status\": \"To Do\",\n" +
            "    \"version\": 1,\n" +
            "    \"createdAt\": \"2026-07-03T09:05:30.256Z\"\n" +
            "  }\n" +
            "}"
          ),

          createHeading2("5.2. Endpoint B: Memperbarui Status Task di Kanban Board"),
          createHeading3("HTTP Method & URL"),
          createBodyText("PUT /api/projects/:projectId/tasks/:taskId/status", { bold: true, color: secondaryColor }),

          createHeading3("Request Payload (JSON Body)"),
          ...createCodeBlock(
            "{\n" +
            "  \"status\": \"In Progress\",\n" +
            "  \"currentVersion\": 1\n" +
            "}"
          ),

          createHeading3("Response Sukses (200 OK)"),
          ...createCodeBlock(
            "{\n" +
            "  \"status\": \"success\",\n" +
            "  \"message\": \"Status task LAN-42 berhasil diperbarui menjadi In Progress\",\n" +
            "  \"data\": {\n" +
            "    \"id\": \"task-f5e4d3c2-b1a0\",\n" +
            "    \"status\": \"In Progress\",\n" +
            "    \"version\": 2\n" +
            "  }\n" +
            "}"
          ),

          createHeading2("5.3. Mekanisme Keamanan API"),
          createBullet("Seluruh akses ke API wajib menyertakan token akses JWT pada header Authorization sebagai Bearer Token. Token diuraikan untuk memverifikasi identitas pengguna, status persetujuan akun (`approved`), serta masa aktif token.", "Autentikasi Bearer JWT"),
          createBullet("Untuk menghindari ancaman serangan Brute Force dan Denial of Service (DoS), sistem menerapkan rate-limiting menggunakan algoritma token bucket di tingkat Nginx reverse proxy. Batas standar adalah maksimal 100 request per menit per alamat IP.", "Rate Limiting & Throttle"),
          createBullet("Setiap webhook integrasi eksternal yang dikirimkan oleh LanPro (misal: integrasi notifikasi ke sistem eksternal) akan dibubuhi tanda tangan digital berupa SHA-256 HMAC Signature yang dihitung menggunakan kunci rahasia bersama (Shared Secret Code). Penerima wajib memvalidasi kecocokan signature tersebut.", "API Hashing & Signature"),

          new Paragraph({ pageBreakBefore: true }),

          // ==========================================
          // SEKSI 6: NON-FUNCTIONAL REQUIREMENTS
          // ==========================================
          createHeading1("6. NON-FUNCTIONAL REQUIREMENTS"),
          createBodyText(
            "Non-Functional Requirements (NFR) mendefinisikan karakteristik kualitas sistem, memastikan aplikasi LanPro tidak hanya berfungsi dengan benar, melainkan juga beroperasi dengan performa tinggi, aman, dan patuh pada regulasi."
          ),

          createHeading2("6.1. Aspek Kinerja & Performa (Performance SLA)"),
          createBullet("Waktu respons untuk kueri pembacaan data (GET) rata-rata wajib di bawah 150 milidetik, dan penulisan mutasi data (POST/PUT/DELETE) rata-rata wajib di bawah 300 milidetik di bawah kondisi jaringan normal.", "Kecepatan Respons API"),
          createBullet("Konfigurasi MySQL Connection Pool diatur secara agresif dengan limit `DB_CONNECTION_LIMIT=100` dan batas menganggur `DB_MAX_IDLE=50` untuk mengamankan ketersediaan thread koneksi database pada saat lonjakan beban paralel.", "Kapasitas Koneksi Konkurensi"),
          createBullet("Data statis yang jarang berubah (seperti master data konfigurasi jenis dokumen dan kategori proyek) disimpan dalam cache memori lokal Express untuk mempercepat loading awal klien.", "Caching Mekanisme"),

          createHeading2("6.2. Aspek Keamanan & Enkripsi Data (Security NFR)"),
          createBullet("Setiap sandi (password) pengguna wajib di-hash menggunakan algoritma BCrypt dengan work factor minimal 10 sebelum disimpan ke dalam database. Sistem dilarang keras menyimpan password dalam format teks polos (plain text).", "Hashing Sandi Pengguna"),
          createBullet("Seluruh lalu lintas komunikasi data antara peramban (browser) klien dan server Express wajib dienkripsi penuh menggunakan protokol kriptografi TLS 1.3 (Secure Sockets Layer/HTTPS).", "Protokol Transmisi Aman"),
          createBullet("Kolom sensitif seperti hash password wajib dikecualikan secara eksplisit dari payload respons JSON API menggunakan skema selektif atau pemetaan tipe data di tingkat model.", "Pencegahan Kebocoran Informasi"),

          createHeading2("6.3. Aspek Ketersediaan & Pemulihan (Availability & Backup)"),
          createBullet("Sistem dirancang untuk beroperasi secara terus-menerus dengan target ketersediaan tahunan minimal 99.9% (Uptime SLA 99.9%).", "Ketersediaan Layanan"),
          createBullet("Database LanPro mendukung backup otomatis terjadwal harian yang diekspor ke cloud storage ber-redundansi geografis. Pengelola dapat melakukan pemulihan manual ke titik waktu tertentu (Point-in-Time Recovery) melalui panel kontrol Admin.", "Sistem Pemulihan Bencana")
        ]
      }
    ]
  });

  return await Packer.toBuffer(doc);
}

// Helper to construct TableRow with array of cells safely
function createTableRowWithCells(cells: TableCell[]): TableRow {
  return new TableRow({ children: cells });
}
