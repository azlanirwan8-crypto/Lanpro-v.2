import express from "express";
import crypto from "crypto";
import mysqlPool from "../../src/lib/db";
import { authenticateJWT } from "../middleware/auth";
import { verifyProjectAccess } from "../middleware/rbac";
import { createAuditLog } from "../services/audit.service";
import { broadcastProjectNotification, sendProjectActivityNotification } from "../services/notification.service";
import { GoogleGenAI, Type } from "@google/genai";

const router = express.Router();

  router.get("/api/projects", async (req, res) => {
    let connection;
    try {
      // If we need to filter by ownerId or member, we can do it via req.query.userId
      // For now we get all to mimic previous behaviour first
      const userId = req.query.userId;
      connection = await mysqlPool.getConnection();
      
      let query = "SELECT * FROM Projects ORDER BY createdAt DESC";
      let params: any[] = [];
      
      if (userId) {
        query = `
          SELECT p.* FROM Projects p 
          LEFT JOIN ProjectMembers pm ON p.id = pm.projectId 
          WHERE p.ownerId = ? OR pm.userId = ? 
          GROUP BY p.id 
          ORDER BY p.createdAt DESC
        `;
        params = [userId, userId];
      }

      const [rows] = await connection.query(query, params);
      
      // Populate member arrays & roles for each project
      const projects = rows as any[];
      if (projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        
        const [allMemberRows]: any = await connection.query(
          `SELECT pm.projectId, u.uid, u.id as uuid, pm.role 
           FROM ProjectMembers pm
           JOIN Users u ON pm.userId = u.id
           WHERE pm.projectId IN (?)`,
          [projectIds]
        );
        
        const membersByProject = new Map();
        
        for (const row of allMemberRows) {
          if (!membersByProject.has(row.projectId)) {
            membersByProject.set(row.projectId, { list: [], roles: {} });
          }
          const pData = membersByProject.get(row.projectId);
          pData.list.push(row.uid);
          pData.roles[row.uid] = row.role || 'viewer';
          pData.roles[row.uuid] = row.role || 'viewer';
        }
        
        for (const p of projects) {
          const pData = membersByProject.get(p.id) || { list: [], roles: {} };
          p.members = pData.list;
          p.memberRoles = pData.roles;
        }
      }

      res.json({ status: "success", data: projects });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.post("/api/projects/generate-bni-demo", authenticateJWT, async (req: any, res: any) => {
    try {
      if (req.user?.role !== "admin") {
        return res.status(403).json({
          status: "error",
          message: "Akses ditolak: Hanya administrator yang diizinkan untuk men-generate proyek demo."
        });
      }
      const { ownerId } = req.body;
      const connection = await mysqlPool.getConnection();
      
      const pId = crypto.randomUUID();
      const pName = "Bank BNI SDLC Management - Release v2.0";
      const pKey = "RDU";
      const pDesc = "Layanan migrasi terpadu BNI Open API, optimasi database core banking, kepatuhan standar OJK/PCI-DSS, serta deployment pipeline aman (UAT/Production Go-Live ready).";
      
      // 1. Insert Project
      await connection.query(
        "INSERT INTO Projects (id, name, projectKey, description, ownerId, status, taskCounter) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [pId, pName, pKey, pDesc, ownerId || '3', 'Active', 24]
      );
      
      // 2. Add Project Members
      const rolesMap = [
        { userId: '1', role: 'admin' },
        { userId: '2', role: 'head' },
        { userId: '3', role: 'manager' },
        { userId: '4', role: 'developer' },
        { userId: '5', role: 'designer' }
      ];
      for (const m of rolesMap) {
        await connection.query(
          "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
          [pId, m.userId, m.role]
        );
      }
      
      // 3. Insert 3 Sprints
      const sprint1Id = crypto.randomUUID();
      const sprint2Id = crypto.randomUUID();
      const sprint3Id = crypto.randomUUID();
      
      const now = new Date();
      const s1Start = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
      const s1End = new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000);
      const s2Start = new Date(now.getTime());
      const s2End = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
      const s3Start = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);
      const s3End = new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000);
      
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sprint1Id, pId, "Sprint 1: Initiation & Requirements Analysis", "Menyelesaikan analisis integrasi BNI Open API dan penandatanganan spesifikasi fungsional.", s1Start, s1End, "completed"]
      );
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sprint2Id, pId, "Sprint 2: Design Prototype & Backend Implementation", "Mengembangkan prototype dashboard kustom, mengoptimalkan pipeline redis cache, dan query tuning.", s2Start, s2End, "active"]
      );
      await connection.query(
        "INSERT INTO Sprints (id, projectId, name, goal, startDate, endDate, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [sprint3Id, pId, "Sprint 3: Quality Testing, Audit & Production Cut-over", "Pemeriksaan fungsionalitas UAT, penetration testing Keamanan Sistem, audit OJK, dan pelepasan release.", s3Start, s3End, "planned"]
      );

      // 4. Create Epics as parent tasks first
      const epic1Id = crypto.randomUUID(); // Kanal Digital
      const epic2Id = crypto.randomUUID(); // Dashboard Teller
      const epic3Id = crypto.randomUUID(); // Back-end Hardening
      const epic4Id = crypto.randomUUID(); // Audit & QA
      const epic5Id = crypto.randomUUID(); // OJK Compliance
      const epic6Id = crypto.randomUUID(); // Go-Live Readiness

      const epics = [
        { id: epic1Id, key: "RDU-1", title: "Kanal Digital & Open API Integration", desc: "Epik koordinasi seluruh komponen integrasi Web Services BNI." },
        { id: epic2Id, key: "RDU-5", title: "Revamp Dashboard Teller & Customer Portal UI", desc: "Epik modernisasi interface Front-End yang ramah petugas & nasabah." },
        { id: epic3Id, key: "RDU-8", title: "Back-End Performance Tuning & Database Hardening", desc: "Epik optimasi query SQL, skema redis clustering, dan enkripsi data saldo ledger." },
        { id: epic4Id, key: "RDU-13", title: "Quality Assurance, Security & Pentest Audit", desc: "Epik koordinasi pengujian fungsionalitas UAT, load testing, dan penetrasi keamanan sistem." },
        { id: epic5Id, key: "RDU-18", title: "Asesmen Kepatuhan OJK & Regulasi Regulator", desc: "Epik pengawasan kepatuhan hukum transaksi perbankan dan izin operasional sistem informasi." },
        { id: epic6Id, key: "RDU-21", title: "Deployment Pipeline & Go-Live Readiness", desc: "Epik penyiapan runbook cut-over, skrip migrasi data langsung, dan rilis patch produksi." }
      ];

      for (const ep of epics) {
        let sId = sprint1Id;
        if (ep.key === "RDU-5" || ep.key === "RDU-8") sId = sprint2Id;
        if (ep.key === "RDU-13" || ep.key === "RDU-18" || ep.key === "RDU-21") sId = sprint3Id;
        
        await connection.query(
          `INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, description, status, priority, type, assigneeId, reporterId, storyPoints, projectRisk)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [ep.id, pId, sId, ep.key, ep.title, ep.desc, "In Progress", "High", "epic", "3", "3", 0, "Low"]
        );
      }

      // 5. Create children tasks
      const tasksToInsert = [
        // Sprint 1
        {
          id: crypto.randomUUID(), key: "RDU-2", parentId: epic1Id, sprintId: sprint1Id,
          title: "Analisis Kebutuhan Core Banking Integrasi API BNI",
          desc: "Menganalisis skema request-response JSON API Gateway BNI dengan core billing.",
          type: "task", status: "Done", priority: "High", assigneeId: "4", reporterId: "3", storyPoints: 5, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-3", parentId: epic1Id, sprintId: sprint1Id,
          title: "Penyusunan Failover Clustering Architecture",
          desc: "Mengonfigurasi kriteria high-availability Server API Gateway di 2 zona geografis.",
          type: "task", status: "Done", priority: "High", assigneeId: "1", reporterId: "3", storyPoints: 8, projectRisk: "Medium"
        },
        {
          id: crypto.randomUUID(), key: "RDU-4", parentId: epic1Id, sprintId: sprint1Id,
          title: "System Requirement Specification (SRS) - Open API Gateway",
          desc: "Dokumentasi standar teknis integrasi API BNI untuk diteruskan ke tim security.",
          type: "document", status: "Done", priority: "Low", assigneeId: "3", reporterId: "2", storyPoints: 3, projectRisk: "Low"
        },
        
        // Sprint 2
        {
          id: crypto.randomUUID(), key: "RDU-6", parentId: epic2Id, sprintId: sprint2Id,
          title: "Design Prototype Mobile Banking Dashboard di Figma",
          desc: "Membuat prototipe tata letak dashboard kustom dengan palet warna jingga korporat BNI.",
          type: "task", status: "In Progress", priority: "Medium", assigneeId: "5", reporterId: "3", storyPoints: 5, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-7", parentId: epic2Id, sprintId: sprint2Id,
          title: "Sign-off Desain Wireframe Layanan Baru oleh IT Head",
          desc: "Persetujuan formal direksi IT untuk memulai coding front-end.",
          type: "approval", status: "In Progress", priority: "Low", assigneeId: "2", reporterId: "5", storyPoints: 1, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-9", parentId: epic3Id, sprintId: sprint2Id,
          title: "Optimasi Query Database Oracle Core Banking BNI",
          desc: "Tuning query inner join log transaksi nasabah dengan index baru demi TPS maksimal.",
          type: "task", status: "In Progress", priority: "High", assigneeId: "4", reporterId: "1", storyPoints: 8, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-10", parentId: epic3Id, sprintId: sprint2Id,
          title: "Implementasi Enkripsi AES-256 pada Ledger Data",
          desc: "Menjamin kerahasiaan nominal dana nasabah yang tersimpan pada tabel log saldo ledger.",
          type: "task", status: "In Progress", priority: "High", assigneeId: "4", reporterId: "2", storyPoints: 5, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-11", parentId: epic3Id, sprintId: sprint2Id,
          title: "Sesi Review Integrasi API bersama Tim Middleware",
          desc: "Rapat koordinasi teknis penyamaan standar pesan ISO 8583.",
          type: "meeting", status: "In Progress", priority: "Medium", assigneeId: "3", reporterId: "3", storyPoints: 2, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-12", parentId: epic3Id, sprintId: sprint2Id,
          title: "Setup Redis Caching Cluster untuk Akun Teller",
          desc: "Mempercepat sesi login teller aktif dengan caching dinamis Redis cluster.",
          type: "task", status: "To Do", priority: "Medium", assigneeId: "4", reporterId: "3", storyPoints: 5, projectRisk: "Medium"
        },

        // Sprint 3
        {
          id: crypto.randomUUID(), key: "RDU-14", parentId: epic4Id, sprintId: sprint3Id,
          title: "Uji Beban (Performance Load Test) 10,000 TPS",
          desc: "Pengujian stress load sistem API Gateway menggunakan Apache JMeter melampaui batas puncak harian.",
          type: "task", status: "To Do", priority: "High", assigneeId: "4", reporterId: "3", storyPoints: 8, projectRisk: "Medium"
        },
        {
          id: crypto.randomUUID(), key: "RDU-15", parentId: epic4Id, sprintId: sprint3Id,
          title: "Security Penetration Testing & Vulnerability Assessment",
          desc: "Melakukan audit vulnerability blackbox / whitebox pada rest server untuk mendapatkan compliance.",
          type: "task", status: "To Do", priority: "High", assigneeId: "1", reporterId: "2", storyPoints: 8, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-16", parentId: epic4Id, sprintId: sprint3Id,
          title: "Koreksi Kelemahan Parameter Tampering di API Gateway",
          desc: "Mengeblok potensi manipulasi ID nasabah pada query string parameter endpoints.",
          type: "bug", status: "To Do", priority: "High", assigneeId: "4", reporterId: "2", storyPoints: 5, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-17", parentId: epic4Id, sprintId: sprint3Id,
          title: "Perbaikan Glitch Form Input Nominal di Mobile App",
          desc: "Glitch visual pada rounding desimal mata uang asing rupiah.",
          type: "bug", status: "To Do", priority: "Medium", assigneeId: "5", reporterId: "4", storyPoints: 3, projectRisk: "Low"
        },
        {
          id: crypto.randomUUID(), key: "RDU-19", parentId: epic5Id, sprintId: sprint3Id,
          title: "Review Kepatuhan Standar PCI-DSS & Surat Edaran OJK",
          desc: "Pengawasan administratif kepatuhan pengelolaan data kartu kredit dan transaksi finansial digital.",
          type: "task", status: "To Do", priority: "Medium", assigneeId: "2", reporterId: "3", storyPoints: 5, projectRisk: "Medium"
        },
        {
          id: crypto.randomUUID(), key: "RDU-20", parentId: epic5Id, sprintId: sprint3Id,
          title: "Penerbitan Sertifikat Izin Rilis (RFO) oleh IT Sec",
          desc: "Pemberian lampu hijau formal dari Divisi Kepatuhan Keamanan Informasi.",
          type: "approval", status: "To Do", priority: "Low", assigneeId: "2", reporterId: "3", storyPoints: 1, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-22", parentId: epic6Id, sprintId: sprint3Id,
          title: "Persiapan Cut-over Runbook & Script Database Rollback",
          desc: "Menyusun instruksi langkah demi langkah divalidasi oleh tim SRE saat downtime rilis.",
          type: "task", status: "To Do", priority: "High", assigneeId: "4", reporterId: "3", storyPoints: 8, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-23", parentId: epic6Id, sprintId: sprint3Id,
          title: "Deployment Artifact Release ke Produksi (Go-Live)",
          desc: "Eksekusi deployment sesungguhnya saat jam sepi transaksi perbankan (maintenance window).",
          type: "task", status: "To Do", priority: "High", assigneeId: "1", reporterId: "2", storyPoints: 13, projectRisk: "High"
        },
        {
          id: crypto.randomUUID(), key: "RDU-24", parentId: epic6Id, sprintId: sprint3Id,
          title: "Evaluasi Pasca Penerapan (Post Mortem Project)",
          desc: "Dokumentasi pelajaran berharga (lessons learned) demi efisiensi rilis siklus berikutnya.",
          type: "meeting", status: "To Do", priority: "Low", assigneeId: "3", reporterId: "3", storyPoints: 2, projectRisk: "Low"
        }
      ];

      for (const t of tasksToInsert) {
        await connection.query(
          `INSERT INTO Tasks (id, projectId, sprintId, taskKey, title, description, status, priority, type, assigneeId, reporterId, parentId, storyPoints, projectRisk)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [t.id, pId, t.sprintId, t.key, t.title, t.desc, t.status, t.priority, t.type, t.assigneeId, t.reporterId, t.parentId, t.storyPoints, t.projectRisk]
        );
      }

      // 6. Post Activity logs
      await connection.query(
        "INSERT INTO ActivityLogs (id, projectId, userId, action, details) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), pId, "3", "Proyek Dibuat", "PM Rian Hidayat menginisiasi project BNI SDLC Release v2.0 secara otomatis melalui generator sistem."]
      );
      await connection.query(
        "INSERT INTO ActivityLogs (id, projectId, userId, action, details) VALUES (?, ?, ?, ?, ?)",
        [crypto.randomUUID(), pId, "3", "Siklus Rilis Terpasang", "Mengonfigurasi 3 sprint berurutan untuk fase Inisiasi, Desain/Coding, serta Testing/Sertifikasi."]
      );

      // 7. Add Dummy Documents (Wiki)
      const documentsToInsert = [
        { id: crypto.randomUUID(), title: "Arsitektur Integrasi API Gateway", desc: "Dokumen panduan integrasi sistem ke BNI Open API dengan skema JWT authentication, rate limiting, dan IP whitelisting.", type: "PRD", link: "https://docs.google.com/document/d/1_demo_only_link", createdBy: "3" },
        { id: crypto.randomUUID(), title: "Penetration Testing Requirements", desc: "Kumpulan checklist uji kerentanan keamanan pada API yang akan dinilai oleh OJK, meliputi injeksi SQL, SSRF, IDOR, dan parameter tampering.", type: "Panduan", link: "https://docs.google.com/document/d/2_demo_only_link", createdBy: "2" },
        { id: crypto.randomUUID(), title: "Runbook Deployment Mobile UI", desc: "Urutan langkah-langkah mem-build APK/AAB dan mempublikasikannya ke App Store serta PlayStore setelah rilis internal.", type: "Laporan", link: "https://docs.google.com/document/d/3_demo_only_link", createdBy: "1" }
      ];

      for (const doc of documentsToInsert) {
        await connection.query(
          "INSERT INTO Documents (id, projectId, title, description, type, link, createdBy) VALUES (?, ?, ?, ?, ?, ?, ?)",
          [doc.id, pId, doc.title, doc.desc, doc.type, doc.link, doc.createdBy]
        );
      }

      // 8. Add Dummy Meetings & Discussion Points
      const meet1Id = crypto.randomUUID();
      await connection.query(
        "INSERT INTO Meetings (id, projectId, title, description, meetingLink, authorId) VALUES (?, ?, ?, ?, ?, ?)",
        [meet1Id, pId, "Kick-off Integrasi BNI Gateway", "Rapat perdana tentang pembagian peran pengembangan, integrasi REST API, manajemen kunci JWT.", "https://meet.google.com/abc-demo-xyz", "3"]
      );

      await connection.query(
        "INSERT INTO DiscussionPoints (id, meetingId, authorId, assignTo, concern, fitur, `system`, surrounding, keterangan, tindakanLanjut, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), meet1Id, "3", "4", "Timeline pengembangan perlu dipastikan", "API Gateway", "Core Banking", "Frontend App", "Butuh API keys secepatnya dari BNI", "Email ke PIC BNI untuk akses sandbox", "pending"]
      );
      await connection.query(
        "INSERT INTO DiscussionPoints (id, meetingId, authorId, assignTo, concern, fitur, `system`, surrounding, keterangan, tindakanLanjut, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), meet1Id, "3", "1", "Arsitektur cloud infra", "High Availability", "AWS/GCP Network", "WAF", "Setup WAF dan Load Balancer minggu ini", "Siapkan terraform script", "completed"]
      );

      const meet2Id = crypto.randomUUID();
      await connection.query(
        "INSERT INTO Meetings (id, projectId, title, description, meetingLink, authorId) VALUES (?, ?, ?, ?, ?, ?)",
        [meet2Id, pId, "Security Review QA & Pentest", "Review kerentanan hasil pemindaian tools Owasp ZAP dan persetujuan penulisan laporan akhir.", "https://meet.google.com/def-demo-uvw", "3"]
      );

      await connection.query(
        "INSERT INTO DiscussionPoints (id, meetingId, authorId, assignTo, concern, fitur, `system`, surrounding, keterangan, tindakanLanjut, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [crypto.randomUUID(), meet2Id, "2", "4", "Parameter tampering ditemukan", "Payment Endpoint", "Middleware", "Security Layer", "Ada kelemahan saat merubah amount secara manual", "Tambahkan HMAC validation", "pending"]
      );

      connection.release();
      res.json({ status: "success", projectId: pId });
    } catch (e: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects/generate-bni-demo error:", e);
      res.status(500).json({ status: "error", message: e.message });
    }
  });

  router.get("/api/projects/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const connection = await mysqlPool.getConnection();
      const [rows] = await connection.query(
        "SELECT * FROM Projects WHERE id = ?",
        [id]
      );
      
      if ((rows as any[]).length > 0) {
        const p = (rows as any[])[0];
        const [memberRows] = await connection.query(
          `SELECT u.uid, u.id as uuid, pm.role 
           FROM ProjectMembers pm
           JOIN Users u ON pm.userId = u.id
           WHERE pm.projectId = ?`,
          [p.id]
        );
        
        const membersList: string[] = [];
        const memberRoles: Record<string, string> = {};
        
        for (const m of (memberRows as any[])) {
          membersList.push(m.uid);
          memberRoles[m.uid] = m.role || 'viewer';
          memberRoles[m.uuid] = m.role || 'viewer';
        }
        
        p.members = membersList;
        p.memberRoles = memberRoles;
        
        connection.release();
        res.json({ status: "success", data: p });
      } else {
        connection.release();
        res.status(404).json({ status: "error", message: "Project not found" });
      }
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: GET /api/projects/:id error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.post("/api/projects", async (req, res) => {
    let connection;
    try {
      const { name, description, ownerId, status, projectKey, category } = req.body;
      connection = await mysqlPool.getConnection();
      
      const newId = crypto.randomUUID();
      const pKey = projectKey || 'PRJ';

      // Resolve ownerId to internal database user id (UUID)
      let resolvedOwnerId = ownerId;
      const [uRows]: any = await connection.query("SELECT id FROM Users WHERE id = ? OR uid = ?", [ownerId, ownerId]);
      if (uRows.length > 0) {
        resolvedOwnerId = uRows[0].id;
      }
      
      await connection.query(
        "INSERT INTO Projects (id, name, projectKey, description, ownerId, status, category) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [newId, name, pKey, description || '', resolvedOwnerId, status || 'Active', category || 'Agile']
      );
      
      // Auto-add owner as member using resolved internal user id
      await connection.query(
        "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?)",
        [newId, resolvedOwnerId, 'Admin']
      );

      res.json({ status: "success", data: { id: newId, name, projectKey: pKey, description, ownerId: resolvedOwnerId, status: status || 'Active', category: category || 'Agile' }});
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: POST /api/projects error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });



  router.put("/api/projects/:projectId/dashboard-layout", verifyProjectAccess(['admin', 'manager', 'head', 'developer', 'designer', 'viewer', '*']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { layout } = req.body;

      // Validasi tipe data array
      if (!Array.isArray(layout)) {
        return res.status(400).json({ status: "error", message: "Layout harus berupa tipe data array." });
      }

      connection = await mysqlPool.getConnection();
      const jsonLayout = JSON.stringify(layout);

      // Simpan ke dashboard_layout dan dashboardLayout untuk kompatibilitas penuh
      await connection.query(
        "UPDATE Projects SET dashboard_layout = ?, dashboardLayout = ? WHERE id = ?",
        [jsonLayout, jsonLayout, projectId]
      );

      res.json({ status: "success", message: "Layout updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:projectId/dashboard-layout error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  router.put("/api/projects/:id", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    let connection;
    try {
      const { id } = req.params;
      const { name, description, status, currentSprintId, projectKey, ownerId, category, taskCounter, dashboardLayout } = req.body;
      connection = await mysqlPool.getConnection();
      
      const updates = [];
      const values = [];
      const changedFields: any = {};
      
      if (name !== undefined) { updates.push("name = ?"); values.push(name); changedFields.name = name; }
      if (description !== undefined) { updates.push("description = ?"); values.push(description); changedFields.description = description; }
      if (status !== undefined) { updates.push("status = ?"); values.push(status); changedFields.status = status; }
      if (projectKey !== undefined) { updates.push("projectKey = ?"); values.push(projectKey); changedFields.projectKey = projectKey; }
      if (ownerId !== undefined) {
        let resolvedOwnerId = ownerId;
        const [uRows]: any = await connection.query("SELECT id FROM Users WHERE id = ? OR uid = ?", [ownerId, ownerId]);
        if (uRows.length > 0) {
          resolvedOwnerId = uRows[0].id;
        }
        updates.push("ownerId = ?");
        values.push(resolvedOwnerId);
        changedFields.ownerId = resolvedOwnerId;
      }
      if (category !== undefined) { updates.push("category = ?"); values.push(category); changedFields.category = category; }
      if (taskCounter !== undefined) { updates.push("taskCounter = ?"); values.push(taskCounter); changedFields.taskCounter = taskCounter; }
      if (dashboardLayout !== undefined) { updates.push("dashboardLayout = ?"); values.push(dashboardLayout !== null ? JSON.stringify(dashboardLayout) : null); changedFields.dashboardLayout = dashboardLayout; }
      
      if (updates.length > 0) {
        values.push(id);
        const query = `UPDATE Projects SET ${updates.join(', ')} WHERE id = ?`;
        await connection.query(query, values);

        const userId = req.headers['x-user-id'] || 'guest';
        await createAuditLog(userId as string, id, 'UPDATE', 'Projects', id, null, changedFields);
      }
      
      res.json({ status: "success", message: "Project updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    } finally {
      if (connection) connection.release();
    }
  });

  // --- LanPro v1.5: BNI SDLC Advisor Route ---
  router.post("/api/projects/:projectId/methodology", authenticateJWT, verifyProjectAccess(['admin', 'manager', 'head']), async (req: any, res: any) => {
    let connection;
    try {
      const { projectId } = req.params;
      const { methodology, matrixScores } = req.body;
      const userId = req.user?.id || req.user?.uid || req.headers['x-user-id'] || 'guest';
      
      if (!methodology) {
        return res.status(400).json({ status: "error", message: "Metodologi harus ditentukan." });
      }

      // Normalisasi input string agar kompatibel dengan standard data
      const normalizedMethodology = methodology.toString().toUpperCase();

      connection = await mysqlPool.getConnection();
      
      // 1. Ambil data lama untuk Audit (Gunakan kolom 'category' sesuai schema.sql LanPro)
      const [oldRows]: any = await connection.query("SELECT category FROM Projects WHERE id = ?", [projectId]);
      if (oldRows.length === 0) {
        return res.status(404).json({ status: "error", message: "Proyek tidak ditemukan." });
      }
      const oldMethod = oldRows[0].category;

      // 2. Update Metodologi (Normalisasi input string menjadi HURUF BESAR)
      await connection.query("UPDATE Projects SET category = ? WHERE id = ?", [normalizedMethodology, projectId]);

      // 3. Simpan Audit Log Terperinci dengan Defensive Data Handling (Nested Try-Catch)
      const auditNewValues = { 
        category: normalizedMethodology, 
        matrixScores: matrixScores ? JSON.stringify(matrixScores) : null 
      };

      try {
        await createAuditLog(
          userId, 
          projectId, 
          'UPDATE', 
          'Projects', 
          projectId, 
          { category: oldMethod }, 
          auditNewValues
        );
      } catch (auditError) {
        console.warn("Peringatan: Gagal menyimpan jejak audit, tetapi metodologi berhasil diperbarui.", auditError);
      }

      res.json({ 
        status: "success", 
        message: `Metodologi proyek berhasil diperbarui menjadi ${normalizedMethodology}.`,
        data: { methodology: normalizedMethodology }
      });
    } catch (error: any) {
      console.error("====== EROR KRITIKAL METODOLOGI BACKEND ======", error);
      res.status(500).json({ 
        status: "error", 
        message: "Gagal memperbarui metodologi ke Waterfall akibat masalah integritas data server." 
      });
    } finally {
      if (connection) {
        connection.release();
      }
    }
  });

  router.delete("/api/projects/:projectId", verifyProjectAccess(['admin', 'head']), async (req, res) => {
    let connection;
    try {
      const { projectId } = req.params;
      connection = await mysqlPool.getConnection();
      
      await connection.beginTransaction();
      
      const cascadeQueries: [string, any[]][] = [
        ["DELETE FROM LinkedTasks WHERE sourceTaskId IN (SELECT id FROM Tasks WHERE projectId = ?) OR targetTaskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId, projectId]],
        ["DELETE FROM Comments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM Attachments WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM TaskExternalLinks WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM TaskCustomFields WHERE taskId IN (SELECT id FROM Tasks WHERE projectId = ?)", [projectId]],
        ["DELETE FROM DiscussionPoints WHERE meetingId IN (SELECT id FROM Meetings WHERE projectId = ?)", [projectId]],
        ["DELETE FROM MilestoneSprints WHERE milestoneId IN (SELECT id FROM Milestones WHERE projectId = ?)", [projectId]],
        ["DELETE FROM Tasks WHERE projectId = ?", [projectId]],
        ["DELETE FROM Sprints WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectMembers WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectInvites WHERE projectId = ?", [projectId]],
        ["DELETE FROM Meetings WHERE projectId = ?", [projectId]],
        ["DELETE FROM Milestones WHERE projectId = ?", [projectId]],
        ["DELETE FROM Documents WHERE projectId = ?", [projectId]],
        ["DELETE FROM ActivityLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM AuditLogs WHERE projectId = ?", [projectId]],
        ["DELETE FROM QATestCases WHERE projectId = ?", [projectId]],
        ["DELETE FROM QATestSuites WHERE projectId = ?", [projectId]],
        ["DELETE FROM ProjectModules WHERE projectId = ?", [projectId]],
        ["DELETE FROM Projects WHERE id = ?", [projectId]]
      ];

      for (const [query, params] of cascadeQueries) {
        try {
          await connection.query(query, params);
        } catch (execError: any) {
          if (execError.code === 'ER_NO_SUCH_TABLE' || execError.code === 'ER_BAD_TABLE_ERROR' || (execError.message && execError.message.toLowerCase().includes('exist'))) {
            continue; // Ignore missing table errors during cascade
          }
          throw execError;
        }
      }
      
      await connection.commit();
      
      res.json({ status: "success", message: "Proyek berhasil dihapus beserta seluruh dependensinya." });
    } catch (error: any) {
      if (connection) await connection.rollback();
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects error:", error);
      return res.status(500).json({ status: "error", message: "Gagal menghapus proyek akibat kendala integritas database." });
    } finally {
      if (connection) connection.release();
    }
  });

  // Project Members & Invites API
  router.put("/api/projects/:id/members", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    try {
      const { id } = req.params;
      const { memberRoles, newMemberId, newMemberRole } = req.body;
      const connection = await mysqlPool.getConnection();
      
      // If we are passing full member roles map
      if (memberRoles) {
        for (const [userId, role] of Object.entries(memberRoles)) {
          // Resolve userId first (it might be uid or id)
          const [users] = await connection.query(
            "SELECT id FROM Users WHERE id = ? OR uid = ?",
            [userId, userId]
          );
          if ((users as any[]).length > 0) {
            const resolvedUserId = (users as any[])[0].id;
            await connection.query(
              "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
              [id, resolvedUserId, role]
            );
          }
        }
      }
      
      // If we are adding/updating a single new member
      if (newMemberId && newMemberRole) {
         // Resolve user id first (if they passed firebase uid, get their UUID)
         const [users] = await connection.query(
           "SELECT id FROM Users WHERE id = ? OR uid = ?",
           [newMemberId, newMemberId]
         );
         if ((users as any[]).length > 0) {
           const resolvedUserId = (users as any[])[0].id;
           await connection.query(
              "INSERT INTO ProjectMembers (projectId, userId, role) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE role = VALUES(role)",
              [id, resolvedUserId, newMemberRole]
           );

           // Handle hierarchy for Project Admin ('admin')
           const { teamMemberIds } = req.body;
           if (newMemberRole === 'admin' && Array.isArray(teamMemberIds) && teamMemberIds.length > 0) {
             for (const tmId of teamMemberIds) {
               const [tmUsers] = await connection.query(
                 "SELECT id FROM Users WHERE id = ? OR uid = ?",
                 [tmId, tmId]
               );
               if ((tmUsers as any[]).length > 0) {
                 const resolvedTmId = (tmUsers as any[])[0].id;
                 await connection.query(
                   "INSERT INTO ProjectMembers (projectId, userId, role, parentAdminId) VALUES (?, ?, 'member', ?) ON DUPLICATE KEY UPDATE parentAdminId = VALUES(parentAdminId)",
                   [id, resolvedTmId, resolvedUserId]
                 );
               }
             }
           }
         }
      }
      
      connection.release();
      res.json({ status: "success", message: "Members updated" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:id/members error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.delete("/api/projects/:id/members/:userId", verifyProjectAccess(['admin', 'manager', 'head']), async (req, res) => {
    try {
      const { id, userId } = req.params;
      const connection = await mysqlPool.getConnection();
      
      // Resolve user id first (if they passed firebase uid, get their UUID)
      const [users] = await connection.query(
        "SELECT id FROM Users WHERE id = ? OR uid = ?",
        [userId, userId]
      );
      
      if ((users as any[]).length > 0) {
        const resolvedUserId = (users as any[])[0].id;
        await connection.query(
          "DELETE FROM ProjectMembers WHERE projectId = ? AND userId = ?",
          [id, resolvedUserId]
        );
      }
      
      connection.release();
      res.json({ status: "success", message: "Member removed from project" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: DELETE /api/projects/:id/members/:userId error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  router.put("/api/projects/:id/invites", async (req, res) => {
    try {
      const { id } = req.params;
      const { emailToInvite } = req.body;
      const connection = await mysqlPool.getConnection();
      
      await connection.query(
        "INSERT INTO ProjectInvites (id, projectId, email) VALUES (?, ?, ?)",
        [crypto.randomUUID(), id, emailToInvite]
      );
      
      connection.release();
      res.json({ status: "success", message: "Invite added" });
    } catch (error: any) {
      console.error("LOG ANOMALI CRITICAL: PUT /api/projects/:id/invites error:", error);
      res.status(500).json({ status: "error", message: "Terjadi kesalahan internal server: " + error.message });
    }
  });

  // Sprints API

export default router;
