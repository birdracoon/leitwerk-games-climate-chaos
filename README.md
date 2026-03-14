# Leitwerk – Climate Chaos

Ein Browser-Spiel: Du bist der neue Leitende Haustechniker an einer verrückten Schule am Tag der offenen Tür. Balanciere Temperatur und Luftqualität in den Räumen durch Heizen, Kühlen und Lüften.

## Tech-Stack

- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind, PixiJS, Zustand
- **Backend**: C# .NET 10 Minimal API
- **Datenbank**: SQLite (EF Core)

## Schnellstart

### Backend

```bash
cd backend
dotnet run
```

Backend läuft auf `http://localhost:5224`.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend läuft auf `http://localhost:3000`.

### Umgebungsvariablen (optional)

Erstelle `frontend/.env.local`:

```
NEXT_PUBLIC_API_URL=http://localhost:5224
```

## Spielablauf

1. **Registrierung**: Wähle ein Pseudonym aus zwei Dropdowns (z.B. "Frostiger_Taschenrechner").
2. **Spiel**: Verbinde Rohre vom Maschinenraum (Heizung, Kühlung, Lüftung) zu den Räumen.
3. **Regelung**: Passe die Leistung pro Verbindung an.
4. **Chaos-Events**: Reagiere auf spontane Ereignisse (Fenster auf, Server glühen, etc.).
5. **Energie**: Überschreite nicht das Budget – sonst fliegt die Sicherung raus.

## API-Endpunkte

| Endpunkt | Methode | Beschreibung |
|----------|---------|--------------|
| `/api/session` | POST | Session erstellen |
| `/api/game/start` | POST | Spielstart markieren |
| `/api/score` | POST | Score einreichen |
| `/api/leaderboard` | GET | Top 10 abrufen |
| `/api/admin/clear` | POST | Alle Daten löschen (Admin-Key erforderlich) |

## DSGVO

- Keine personenbezogenen Daten
- Pseudonym-Generator statt Freitext
- Session-Token nur in `sessionStorage` (verfällt beim Schließen)
- Keine Tracking-Cookies
- Admin-Endpunkt zum Löschen aller Daten nach dem Event
