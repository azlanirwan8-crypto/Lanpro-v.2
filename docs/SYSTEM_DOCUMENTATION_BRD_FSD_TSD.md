# LANPRO ENTERPRISE PLATFORM SPECIFICATION
## Comprehensive Business Requirements (BRD), Functional Specifications (FSD), Technical Architecture (TSD), & IT Professional Peer Review Guide

---

**Document Details:**
- **System Name:** LanPro - Enterprise SDLC & Engineering Excellence Management Platform
- **Document Version:** 2.5.0-ENTERPRISE
- **Status:** Final Draft for Executive & Technical Peer Review
- **Target Audience:** Claude AI Evaluator, Enterprise Architects, Lead Software Engineers, Security/DevSecOps Engineers, Database Architects, Senior Product Managers.

---

# TABLE OF CONTENTS
1. [EXECUTIVE SUMMARY & SYSTEM OVERVIEW](#1-executive-summary--system-overview)
2. [BUSINESS REQUIREMENTS DOCUMENT (BRD)](#2-business-requirements-document-brd)
3. [FUNCTIONAL SPECIFICATION DOCUMENT (FSD)](#3-functional-specification-document-fsd)
4. [TECHNICAL SPECIFICATION DOCUMENT (TSD)](#4-technical-specification-document-tsd)
5. [SECURITY & COMPLIANCE SPECIFICATION](#5-security--compliance-specification)
6. [DATABASE SCHEMA & API CONTRACTS](#6-database-schema--api-contracts)
7. [IT PROFESSIONAL REVIEW PANEL & CLAUDE AI PROMPT](#7-it-professional-review-panel--claude-ai-prompt)

---

# 1. EXECUTIVE SUMMARY & SYSTEM OVERVIEW

## 1.1 Overview
**LanPro** is an end-to-end, enterprise-grade Software Development Life Cycle (SDLC) and Engineering Management Platform designed to streamline cross-functional collaboration, project tracking, quality assurance (QA), resource allocation, real-time communication, and data-driven governance.

Built with a modern full-stack architecture (**React 19 + TypeScript + Vite + Tailwind CSS v4** on the frontend, and **Node.js + Express + Socket.IO + PostgreSQL (Neon)** on the backend), LanPro bridges the gap between executive product vision, daily engineering execution, quality assurance validation, and security auditing.

## 1.2 Technology Stack Architecture
```
+-----------------------------------------------------------------------------------+
|                                  CLIENT LAYER                                     |
|  React 19 | TypeScript | Vite 6 | Tailwind CSS v4 | Framer Motion | Zustand | Recharts |
+-----------------------------------------------------------------------------------+
                                         |  HTTPS / WebSocket (Port 3000)
                                         v
+-----------------------------------------------------------------------------------+
|                             NGINX REVERSE PROXY                                   |
|                      TLS Termination & Ingress Routing                            |
+-----------------------------------------------------------------------------------+
                                         |
                                         v
+-----------------------------------------------------------------------------------+
|                                  SERVER LAYER                                     |
|        Node.js 22 | Express 4 | Socket.IO | JWT Auth | Prom-Client Metrics         |
+-----------------------------------------------------------------------------------+
       |                                |                               |
       v                                v                               v
+--------------+               +------------------+           +------------------+
| POSTGRESQL   |               |  REDIS ADAPTER   |           |  GOOGLE GENAI    |
| (Neon Pool)  |               |  (Socket.IO      |           |  (Gemini API     |
| Connection   |               |  Scaling)        |           |  Integration)    |
+--------------+               +------------------+           +------------------+
```

### Core Stack Components:
- **Frontend Framework:** React 19, TypeScript 5.8, Vite 6
- **Styling & UI Components:** Tailwind CSS v4, Lucide React Icons, Framer Motion, Motion 12
- **State Management:** Zustand 5.0 (Global Store), React Contexts
- **Backend Runtime:** Node.js 22, Express 4 (CommonJS bundled via esbuild)
- **Database & Persistence:** PostgreSQL (Neon Cloud) via `pg` connection pool with automatic SQL conversion and resilience
- **Real-Time Communication:** Socket.IO 4.8 with optional Redis Adapter for horizontal scaling
- **AI Engine:** `@google/genai` (Google Gemini 2.5 Flash / Pro) for intelligent project analysis and automated suggestions
- **Security & Utilities:** `bcryptjs`, `jsonwebtoken`, `xss`, `dompurify`, `prom-client` (Prometheus metrics)

---

# 2. BUSINESS REQUIREMENTS DOCUMENT (BRD)

## 2.1 Problem Statement
Modern software engineering organizations suffer from fragmented toolchains. Project managers use Jira/Trello, QA teams use test runners or spreadsheets, developers use separate chat platforms, and executives lack real-time visibility into developer workload, release blockers, and cross-project risks.

This fragmentation leads to:
1. **Communication Silos:** Disconnect between product requirements, development execution, and QA test coverage.
2. **Security & Data Exposure Risks:** Unclear role-based access controls and lack of auditing on sensitive operational endpoints.
3. **Inconsistent Master Data:** Misalignment on department names, project roles, and job positions across teams.
4. **Lack of Real-Time Operational Visibility:** Delayed detection of user activity, resource burnouts, and project bottlenecks.

## 2.2 Business Objectives & Key Metrics
| Objective | Target Metric | Business Value |
| :--- | :--- | :--- |
| **Unified SDLC Platform** | 100% integration of Kanban, QA, Wiki, and Team Management | Eliminates context switching across 4+ external tools |
| **Granular Security & Compliance** | 0 Anti-IDOR vulnerabilities; 100% audit coverage | Ensures enterprise data governance and strict access rules |
| **Real-Time Presence & Collaboration** | < 200ms chat & presence sync latency | Enhances team responsiveness and remote work transparency |
| **Master Data Consistency** | Dynamic System & Project Role configuration | Adaptable to any organizational structure without code redeployment |

## 2.3 User Personas & Responsibilities
1. **System Administrator (Admin):** Manages user onboarding, custom system/project roles, department master data, global system settings, and security audit logs.
2. **Department Head (Head):** Oversees cross-project resource utilization, team workload heatmaps, high-level roadmaps, and department velocity.
3. **Project Manager (Manager):** Creates projects, defines sprints/backlogs, assigns tasks, schedules milestones, and tracks defect metrics.
4. **Standard Developer / Engineer (User):** Executes tasks, updates kanban statuses, logs work hours, collaborates via context chat, and submits code reviews.
5. **QA Engineer & Test Lead:** Builds test plans, executes test cases, logs defect reports, links bugs to specific user stories, and generates release readiness reports.
6. **System Analyst & DBA:** Configures data schemas, designs workflows, monitors database queries, and tracks system metrics.
7. **Observer / External Client (Viewer):** Enjoys read-only access to project progress, dashboards, and releases without modification rights.

---

# 3. FUNCTIONAL SPECIFICATION DOCUMENT (FSD)

## 3.1 Core Feature Modules

### Module 1: Executive Analytics & Dashboard
- **Key Features:**
  - Executive KPI Cards (Total Projects, Velocity Rate, Open Defect Ratio, Team Health Index).
  - Visual Charts powered by Recharts (Sprint Velocity Trend, Bug Severity Distribution, Workload per Department).
  - Real-time Activity Feed tracking user actions system-wide.

### Module 2: Agile Project Management & Planning
- **Key Features:**
  - **Kanban Board:** Multi-column (To Do, In Progress, In Review, QA, Done) with drag-and-drop capability (`@hello-pangea/dnd`).
  - **Sprint & Backlog:** Story points estimation, backlog prioritization, active sprint commitment tracking.
  - **Gantt & Roadmap:** Visual timeline of milestones, epic dependencies, and target delivery dates.
  - **Task Detail Drawer:** Subtask checklists, attachment uploads (via `multer`), comment threads, reporter & assignee management.

### Module 3: QA & Defect Tracking Suite
- **Key Features:**
  - **Test Case Repository:** Hierarchical folder structure for manual and automated test suites.
  - **Test Execution Runs:** Pass / Fail / Blocked status recording with step-by-step validation.
  - **Defect Management:** Direct conversion of failed test steps into linked bug tickets in the Kanban board.
  - **QA Coverage Matrix:** Mapping test case coverage against requirements and user stories.

### Module 4: Resource & Capacity Management
- **Key Features:**
  - **Workload Heatmap:** Visual matrix of developer allocation (Over-allocated, Optimal, Under-utilized).
  - **Live Heartbeat & Presence Sync:** WebSocket and HTTP fallback heartbeat detecting active user sessions (`lastSeen`).
  - **Department & Position Hierarchy:** Department-based grouping of engineers and managers.

### Module 5: User Management & Fine-Grained RBAC Engine
- **Key Features:**
  - **User Lifecycle:** Account registration, status approval workflow (Approved, Pending, Rejected), user deactivation, password reset.
  - **Granular Permissions Grid:** Matrix-based configuration per module (Dashboard, Projects, QA, Master Data, Audit Logs, Settings) across 4 actions: `Create`, `Read`, `Update`, `Delete`.
  - **Dynamic Role Support:** Native system roles (`admin`, `head`, `manager`, `user`, `viewer`) alongside dynamic system roles created in Master Data (e.g., `System Analyst`, `Database Admin`).

### Module 6: Master Data & Configuration Management
- **Key Features:**
  - Centralized management of System Roles, Project Roles, Departments, Job Positions (Jabatan), Ticket Categories, and Custom Dropdown Options.
  - Instant synchronization across all registration forms, project team assignment dropdowns, and edit modals.

### Module 7: Real-Time Communication & Anti-IDOR Notification Engine
- **Key Features:**
  - **LanPro Chat Widget:** Floating/embedded chat drawer supporting Direct Messages and Project Context Channels.
  - **In-App Notifications:** Real-time push alerts for task assignments, mention tags, and status changes.
  - **Anti-IDOR Protection:** Server-side token validation enforcing strict recipient-owner validation to prevent cross-tenant notification leaks.

### Module 8: Audit Logs & System Health Monitoring
- **Key Features:**
  - Immutable audit trail capturing timestamp, IP address, user agent, module, action type, and payload delta.
  - Prometheus `/metrics` telemetry endpoint monitoring HTTP request durations, active DB connections, and memory usage.

---

## 3.2 Matrix Permission Model (RBAC Schema)
| Module Key | Admin | Head | Manager | User | Viewer |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `dashboard` | CRUD | R | R | R | R |
| `planning` | CRUD | CRUD | CRUD | R | R |
| `board` | CRUD | CRUD | CRUD | CRU | R |
| `qaTesting` | CRUD | CRU | CRUD | CRU | R |
| `userManagement` | CRUD | R | R | - | - |
| `masterData` | CRUD | R | - | - | - |
| `auditLogs` | CRUD | R | - | - | - |
| `settings` | CRUD | CRU | CRU | U (Self) | - |

*(Note: C = Create, R = Read, U = Update, D = Delete)*

---

# 4. TECHNICAL SPECIFICATION DOCUMENT (TSD)

## 4.1 Server Architecture & Request Flow
```
User Request
    |
    v
Express HTTP Server (Port 3000)
    |
    +---> Static Asset Handling (Vite / Express Static)
    |
    +---> Middleware Pipeline:
    |        |-- CORS & Security Headers
    |        |-- Body Parser (JSON / URL-encoded)
    |        |-- Rate Limiter
    |        `-- authenticateJWT (Token Extraction & Verification)
    |
    +---> API Routes (/api/*):
    |        |-- /api/auth (Login, Register, Refresh)
    |        |-- /api/users (User CRUD, RBAC, Status)
    |        |-- /api/projects (Project, Sprints, Kanban)
    |        |-- /api/qa (Test Cases, Test Runs, Defects)
    |        |-- /api/master-data (Roles, Departments, Positions)
    |        |-- /api/notifications (Anti-IDOR Filtered Alerts)
    |        `-- /metrics (Prometheus Telemetry)
    |
    `---> Socket.IO Server (Real-Time Events & Presence Sync)
             |
             +---> Redis Adapter (Horizontal Scaling Sync)
             `---> Connection Pool (`pg` / Neon PostgreSQL)
```

## 4.2 Production Build & Bundle Execution
- **Dev Script:** `tsx server.ts`
- **Build Script:** `vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs`
- **Start Script:** `node dist/server.cjs`
- **Port Strategy:** Binds strictly to `0.0.0.0:3000` to support containerized cloud execution (Cloud Run).

---

# 5. SECURITY & COMPLIANCE SPECIFICATION

1. **Authentication & Token Governance:**
   - Stateless JSON Web Tokens (JWT) signed with `JWT_SECRET`.
   - Passwords salted and hashed via `bcryptjs` (salt rounds: 10).
2. **Data Leakage & Anti-IDOR Controls:**
   - Server-side context extraction (`req.user.id`).
   - Notification query protection ensuring users can only read notifications specifically addressed to them or authorized role groups.
3. **Input Sanitization & Injection Prevention:**
   - All SQL queries execute via parameterized placeholders (`$1`, `$2` or `?` SQL dialect translator).
   - HTML/Rich text fields sanitized with `xss` and `DOMPurify`.
4. **Resilience & Health Failovers:**
   - Automatic connection pool recovery handling transient cloud database reconnects.

---

# 6. DATABASE SCHEMA & API CONTRACTS

## 6.1 Core Relational Entities
```sql
-- Users Table
CREATE TABLE IF NOT EXISTS Users (
  id VARCHAR(36) PRIMARY KEY,
  username VARCHAR(100) UNIQUE NOT NULL,
  passwordHash VARCHAR(255) NOT NULL,
  displayName VARCHAR(150) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  role VARCHAR(50) NOT NULL DEFAULT 'user',
  status ENUM('approved', 'pending', 'rejected') DEFAULT 'approved',
  department VARCHAR(100),
  position VARCHAR(100),
  phone VARCHAR(50),
  permissions TEXT,
  lastSeen DATETIME,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
  updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- MasterData Table
CREATE TABLE IF NOT EXISTS MasterData (
  id VARCHAR(36) PRIMARY KEY,
  type VARCHAR(50) NOT NULL, -- 'system_role', 'project_role', 'department', 'jabatan'
  label VARCHAR(150) NOT NULL,
  roleType VARCHAR(20), -- 'SYSTEM' or 'PROJECT'
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Notifications Table
CREATE TABLE IF NOT EXISTS Notifications (
  id VARCHAR(36) PRIMARY KEY,
  recipientId VARCHAR(36) NOT NULL,
  senderId VARCHAR(36),
  title VARCHAR(200) NOT NULL,
  message TEXT,
  type VARCHAR(50) DEFAULT 'system',
  relatedId VARCHAR(36),
  `read` TINYINT(1) DEFAULT 0,
  createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

## 6.2 Key REST Endpoints
- `POST /api/auth/login`: Authenticates user credentials and returns JWT token + user profile.
- `GET /api/users`: Fetches full user directory (Requires Admin/Head/Manager permission).
- `PUT /api/users/:id`: Updates user role, permissions, status, department, or job position.
- `GET /api/master-data`: Returns system master data (roles, departments, positions).
- `GET /api/users/:userId/notifications`: Anti-IDOR protected notification fetch endpoint.
- `GET /metrics`: Prometheus metrics scrape target.

---

# 7. IT PROFESSIONAL REVIEW PANEL & CLAUDE AI PROMPT

Below is the complete, self-contained prompt to be submitted to Claude AI or an Enterprise IT Peer Review Panel to evaluate this document and codebase.

---

### 📋 COPY THE PROMPT BELOW FOR CLAUDE AI & IT PROFESSIONAL REVIEW:

```markdown
# ENTERPRISE IT PROFESSIONAL PEER REVIEW INVITATION
**Project:** LanPro SDLC & Engineering Management Platform
**Target Reviewers:** Enterprise Architect, Principal Backend Engineer, Lead Security/DevSecOps Engineer, Lead DBA, Senior Product Manager

## OBJECTIVE:
You are acting as a panel of senior IT professionals reviewing the LanPro Platform System Specification (BRD, FSD, TSD) above. Please analyze the architecture, security stance, database design, feature completeness, and enterprise readiness, then provide a rigorous peer evaluation.

---

## REVIEWER PERSONAS & EVALUATION CRITERIA:

### 1. Enterprise Architect (Weight: 20%)
- **Focus:** System scalability, technology stack longevity, modularity, and microservice/container readiness.
- **Questions to Answer:**
  1. Is the React 19 + Node.js Express + Socket.IO stack suitable for an enterprise engineering team of 500+ users?
  2. How well does the esbuild CommonJS bundling strategy support containerized deployment (e.g., Cloud Run / Kubernetes)?

### 2. Principal Backend Engineer (Weight: 20%)
- **Focus:** Code quality, state management, API design, real-time WebSocket resilience, and concurrency.
- **Questions to Answer:**
  1. Are the API contracts and Socket.IO events well-structured?
  2. How effective is the PostgreSQL connection pool error-handling and auto-recovery logic?

### 3. Lead Security & DevSecOps Engineer (Weight: 25%)
- **Focus:** Authentication, RBAC granularity, OWASP Top 10 vulnerabilities, Anti-IDOR enforcement, and auditability.
- **Questions to Answer:**
  1. Is the JWT authentication and Anti-IDOR notification validation logic sound?
  2. What additional security controls (e.g., rate limiting, SQL injection defense, XSS) are properly addressed or need improvement?

### 4. Lead Database Administrator / Data Architect (Weight: 20%)
- **Focus:** Database schema design, relational integrity, connection pooling, indexing, and Master Data flexibility.
- **Questions to Answer:**
  1. Does the dynamic Master Data model (`system_role`, `project_role`, `department`, `jabatan`) balance flexibility and schema integrity?
  2. Are there any bottleneck risks in the notification or chat log tables?

### 5. Senior Product Manager & UX Lead (Weight: 15%)
- **Focus:** User persona coverage, feature completeness, SDLC workflow alignment, and RBAC matrix usability.
- **Questions to Answer:**
  1. Does LanPro effectively replace fragmented tools (Jira, TestRail, Slack, Confluence)?
  2. Are the user lifecycle and status approval flows intuitive for enterprise teams?

---

## REQUIRED OUTPUT FORMAT FOR CLAUDE AI / REVIEW PANEL:
Please structure your evaluation response as follows:

1. **Executive Evaluation Summary & Overall Grade (A+ to F)**
2. **Detailed Assessment by Role Persona:**
   - Enterprise Architect Feedback
   - Principal Backend Engineer Feedback
   - Lead Security & DevSecOps Feedback
   - Lead DBA Feedback
   - Senior Product Manager Feedback
3. **Identified Strengths (Top 5 Enterprise Advantages)**
4. **Potential Risks / Architectural Recommendations (Top 3-5 Areas for Next Iteration)**
5. **Final Sign-off Status (Approved / Approved with Conditions / Needs Revision)**
```

---
*End of LanPro System Specification & Review Guide Document.*
