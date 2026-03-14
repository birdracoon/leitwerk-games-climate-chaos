# Climate Chaos – Frontend

Next.js-basierte Web-App für das Leitwerk-Spiel.

## Entwicklung

### Voraussetzungen

- Node.js 18+
- npm, yarn, pnpm oder bun

### Lokal starten

```bash
npm install
npm run dev
```

Die App läuft unter [http://localhost:3000](http://localhost:3000).

### Umgebungsvariablen

Kopiere `.env.example` nach `.env.local` und passe die Werte an:

| Variable | Beschreibung | Standard |
|----------|--------------|----------|
| `NEXT_PUBLIC_STORAGE_MODE` | `local` = IndexedDB, `backend` = .NET-API | `local` |
| `NEXT_PUBLIC_API_URL` | Backend-URL (nur bei `backend`-Modus) | `http://localhost:5224` |

### Skripte

- `npm run dev` – Development-Server mit Hot-Reload
- `npm run build` – Produktions-Build
- `npm run start` – Produktions-Server (nach `build`)
- `npm run lint` – ESLint ausführen

---

## Deployment

### Client-only (reines Web-Deployment)

Spiel ohne Backend – alle Daten werden in der Browser-IndexedDB gespeichert. Ideal für statisches Hosting (Vercel, Netlify, GitHub Pages, etc.).

**Schritte:**

1. `.env.production` oder Build-Env setzen:
   ```
   NEXT_PUBLIC_STORAGE_MODE=local
   ```

2. Build und Start:
   ```bash
   npm run build
   npm run start
   ```

3. Oder bei Vercel/Netlify: `NEXT_PUBLIC_STORAGE_MODE=local` in den Projekt-Einstellungen hinterlegen.

**Hinweis:** Sessions und Leaderboard sind pro Browser/Device lokal. Keine Daten werden serverseitig gespeichert.

---

### Server-Modus (mit .NET-Backend)

Spiel mit persistenter Datenbank – Sessions und Scores werden im Backend gespeichert.

**Schritte:**

1. .NET-Backend starten (Port 5224).

2. `.env.production` oder Build-Env:
   ```
   NEXT_PUBLIC_STORAGE_MODE=backend
   NEXT_PUBLIC_API_URL=https://deine-api.example.com
   ```

3. Build und Start wie oben.

**Hinweis:** `NEXT_PUBLIC_API_URL` muss zur Laufzeit erreichbar sein (CORS im Backend konfigurieren).
