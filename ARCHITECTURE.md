# Lanpro-v.2 Architecture Guidelines

Welcome to the Lanpro-v.2 codebase! This project is built using a strict **Clean Architecture** and **Domain-Driven Design (DDD)** approach. 
To maintain stability and scalability, all developers MUST adhere to the following directory structure and coding standards.

## Project Structure Overview

```text
lanpro1/
├── server.ts               # ENTRY POINT BACKEND. DO NOT write API logic here.
├── src/
│   ├── App.tsx             # ENTRY POINT FRONTEND. Keep it minimal.
│   ├── AppContainer.tsx    # Global State Container & Socket Provider.
│   ├── components/         # Reusable, stateless UI primitives (Buttons, Modals).
│   ├── features/           # DOMAIN MODULES. Put business components here.
│   │   ├── auth/
│   │   ├── flowchart/
│   │   └── qa/
│   ├── hooks/              # Custom React Hooks (State, Effects, Listeners).
│   ├── lib/                # Configs (API wrappers, DB instances).
│   └── types/              # Global TypeScript interfaces.
├── server/
│   ├── controllers/        # BACKEND LOGIC. (e.g. `async (req, res)` logic).
│   ├── routes/             # ROUTE DEFINITIONS ONLY. Maps URLs to Controllers.
│   ├── middleware/         # Global interceptors (Auth, RBAC, ErrorHandling).
│   └── services/           # DB queries and heavy backend operations.
```

## Mandatory Rules for Development

1. **No God Components**
   If a React component or Backend Controller file exceeds **800 lines of code**, you MUST break it down into smaller, focused modules. Use the Container Pattern for complex frontend views.

2. **Backend Route Separation**
   Do NOT inject database queries or business logic directly into `server/routes/*.ts` or `server.ts`. 
   - Good: `router.get('/tasks', TaskController.getTasks);`
   - Bad: `router.get('/tasks', async (req, res) => { /* 100 lines of logic */ });`

3. **Zero Hardcoded Secrets**
   Never hardcode credentials (DB passwords, API tokens, Secret Keys) in the codebase. Always use `process.env`. The codebase is actively scanned for leaked credentials.

4. **Centralized Error Handling**
   Always throw standard errors (`ApiError` or `AppError`) in your backend controllers. Do NOT use `res.status(500).json(...)` manually everywhere. Let the Global Error Middleware handle it gracefully.

By following these rules, we ensure that the application remains modular, testable, and enterprise-ready.
