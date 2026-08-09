# Application Architecture & Developer Guide

## Overview
A high-performance, real-time Project Management Tool optimized for Bank BNI's SDLC workflows. Built with React (Vite), Tailwind CSS, and Firebase (Firestore/Auth).

## 1. Technical Stack
- **Frontend**: React 19 + TypeScript.
- **State Management**: React Context / Hooks (Centralized in App.tsx for demo simplicity).
- **Styling**: Tailwind CSS (with logic-driven colors for status/priority).
- **Icons**: Lucide React.
- **Animations**: Framer Motion (Kanban transitions and UI feedback).
- **Backend**: Firebase Firestore (NoSQL) with real-time listeners.
- **Auth**: Firebase Google Authentication.

## 2. Core Modules
### Task Visualizations
- **Kanban**: Adaptive swimlane layout supporting Drag-and-Drop (Pangea DND).
- **Timeline (Gantt)**: Interactive SVG-based dependency mapping.
- **List**: Responsive table with infinite hierarchy (Epics -> Tasks -> Subtasks).

### Dependency System
- **Bidirectional Linking**: Implemented via `linkedTasks` array in Firestore.
- **Blocked State**: Logic-driven indicator checks recursively if parent/linked tasks are in 'Done' status.

## 3. Data Integrity & Security
### Security Rules
- **Role-Based Access Control (RBAC)**: Admins have full control; Members can edit tasks; Viewers can only read.
- **Attribute-Based Access Control (ABAC)**: Rules validated based on properties (e.g., `isOwner`, `isProjectMember`).
- **Domain Validation**: Strict JSON schema-like validation directly in `firestore.rules`.

### Audit Logs
- **Activity Tracker**: All status changes, comment additions, and task creations are logged in `activityLogs` (Write-only by app, read-only audit trail).

## 4. Developer Guidelines (document.dev)
- **Component Primitives**: UI logic is built using small, functional renderers (e.g., `RenderIcon`, `PriorityIcon`).
- **Global Config**: `masterData` collection controls Statuses, Priorities, and Issue Types. Modify this via Firestore to change UI behavior without code deployment.
- **SDLC Best Practices**: The "Generate Demo" function provides a gold-standard reference for task grouping and sprint planning.

---
*Created by the AI Engineering Team.*
