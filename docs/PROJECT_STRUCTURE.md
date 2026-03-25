# Project structure

Keep this layout. Do **not** put the backend inside the frontend folder.

```
Naif FYP Number 1/
├── pixel-perfect-frontend/     # Vite + React frontend (port 5173)
│   ├── src/
│   ├── package.json
│   └── ...
├── pixel-perfect-backend/      # Next.js API backend (port 3001)
│   ├── app/
│   ├── lib/
│   ├── supabase/
│   ├── package.json
│   └── ...
└── docs/                       # Documentation
```

- **Frontend** and **backend** are **siblings** at the project root.
- Backend is **not** inside `pixel-perfect-frontend`.
- Run backend from `pixel-perfect-backend`, frontend from `pixel-perfect-frontend`.
