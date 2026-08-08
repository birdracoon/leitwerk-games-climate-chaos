# Climate Chaos

Next.js-basierte Web-App für das Leitwerk-Spiel. Die Produktionsinstanz läuft als
rootful Podman-Container auf dem Netcup-VPS; Nginx Proxy Manager übernimmt den
öffentlichen HTTP-/HTTPS-Zugang.

## Lokale Entwicklung

Voraussetzungen: Node.js 22 und npm.

```bash
npm ci
npm run dev
```

Die App ist anschließend unter
[http://localhost:3000/climate-chaos](http://localhost:3000/climate-chaos)
erreichbar.

### Umgebungsvariablen

| Variable | Beschreibung | Standard |
|---|---|---|
| `NEXT_PUBLIC_STORAGE_MODE` | `local` für IndexedDB oder `backend` für die API | `local` |
| `NEXT_PUBLIC_API_URL` | Öffentliche Backend-URL im `backend`-Modus | leer |

Beide Werte werden beim Container-Build in die Next.js-Anwendung eingebaut. Eine
Änderung erfordert deshalb einen neuen Build beziehungsweise ein erzwungenes
Update.

Nützliche npm-Kommandos:

- `npm run dev` – Entwicklungsserver
- `npm run build` – Produktions-Build
- `npm run start` – Produktionsserver nach dem Build
- `npm run lint` – ESLint

## Deployment auf Netcup

Das Deployment besteht aus:

- `Containerfile`: mehrstufiger, unprivilegiert laufender Next.js-Container
- `scripts/deploy-netcup.sh`: richtet den VPS von Ubuntu aus per SSH ein
- `scripts/update-netcup.sh`: läuft auf dem VPS und aktualisiert aus GitHub
- `climate-chaos-update.timer`: wird durch das Deploy-Skript als systemd-Timer
  installiert

Das frühere STRATO-/PowerShell-Deployment und die lokale Nginx-Konfiguration
werden nicht mehr verwendet.

### 1. DNS, SSH und Firewall

Der DNS-A-Record der gewünschten Domain muss auf `89.58.18.175` zeigen. Die
lokale Datei `~/.ssh/config` enthält:

```sshconfig
Host netcup
    HostName 89.58.18.175
    User root
    IdentityFile ~/.ssh/id_netcup
    IdentitiesOnly yes
    AddKeysToAgent yes
```

Verbindung testen:

```bash
ssh netcup
```

Am VPS sollten öffentlich nur SSH sowie HTTP/HTTPS erreichbar sein. Falls UFW
verwendet wird:

```bash
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
```

Port 4300 wird auf `0.0.0.0` veröffentlicht, damit der Proxy Manager ihn über
die Host-Gateway-IP erreichen kann. Der Zugriff auf Port 4300 wird per UFW nur
vom internen Podman-Netz erlaubt. Die Administrationsoberfläche von Nginx Proxy Manager
(typisch Port 81) sollte ebenfalls nicht ungeschützt öffentlich erreichbar sein.

Wenn UFW aktiv ist, erlaubt das Deploy-Skript DNS-Anfragen an Podmans
`aardvark-dns` ausschließlich auf dem internen NPM-Netzwerkinterface. Ohne diese
Regel kann NPM den Containernamen `climate-chaos` nicht auflösen.

### 2. Erste Installation

Die zu deployende Version muss zuerst auf GitHub im Branch `main` liegen. Das
Skript installiert auf dem VPS `podman`, `git` und `curl`, legt die
systemd-Einheiten an, baut das Image aus GitHub und startet den Container.

```bash
chmod +x scripts/deploy-netcup.sh scripts/update-netcup.sh
./scripts/deploy-netcup.sh
```

Standardmäßig verwendet das Skript den SSH-Alias `netcup`, den Branch `main`,
Port 4300, das Podman-Netz `npm_default` und prüft alle 15 Minuten auf Updates.
Relevante Optionen:

```bash
./scripts/deploy-netcup.sh \
  --branch main \
  --update-interval 30min \
  --storage-mode local
```

Für einen API-Betrieb:

```bash
./scripts/deploy-netcup.sh \
  --storage-mode backend \
  --api-url https://api.example.org
```

Alle Optionen zeigt `./scripts/deploy-netcup.sh --help`. Ein erneuter Aufruf ist
zulässig und aktualisiert Konfiguration, Timer und Anwendung.

### 3. Nginx Proxy Manager

Nginx Proxy Manager und die Anwendung laufen beide unter Podman. Der Updater
hängt Climate Chaos an das von NPM Compose angelegte Netzwerk `npm_default` und
veröffentlicht zusätzlich `0.0.0.0:4300->4300/tcp` für den Zugriff über die
Host-Gateway-IP.
NPM muss deshalb vor dem ersten App-Deployment laufen. Netzwerk prüfen:

```bash
podman network exists npm_default
podman inspect npm_app_1 \
  --format '{{range $name, $network := .NetworkSettings.Networks}}{{$name}}{{end}}'
```

Falls die NPM-Compose-Konfiguration einen anderen Netzwerknamen erzeugt, diesen
beim Deployment angeben:

```bash
./scripts/deploy-netcup.sh --proxy-network <npm-podman-netz>
```

In Nginx Proxy Manager einen **Proxy Host** anlegen:

| Einstellung | Wert |
|---|---|
| Domain Names | gewünschte Domain |
| Scheme | `http` |
| Forward Hostname / IP | `climate-chaos` |
| Forward Port | `4300` |
| Websockets Support | aktiv |

Danach im Tab **SSL** ein Let's-Encrypt-Zertifikat anfordern und **Force SSL**
aktivieren. Die Anwendung liegt wegen ihres Next.js-`basePath` unter:

```text
https://<domain>/climate-chaos/
```

NPM leitet den Pfad unverändert weiter; ein zusätzlicher Rewrite ist nicht
notwendig.

## Update-Mechanismus

Der Timer fragt standardmäßig alle 15 Minuten den in `/etc/climate-chaos.env`
konfigurierten GitHub-Branch ab. Nur wenn dessen Commit von der aktuell
installierten Version abweicht, wird aktualisiert:

1. neuen Commit aus GitHub holen,
2. neues Podman-Image bauen (für Registry-Zugriff über das Host-Netz),
3. bisherigen Container anhalten und den neuen starten,
4. `http://127.0.0.1:4300/` über das Host-Portmapping prüfen,
5. bei fehlgeschlagenem Healthcheck automatisch den alten Container starten.

Ein fehlgeschlagener Build verändert den laufenden Container nicht. Gleichzeitige
Updates verhindert ein Lockfile.

### Manuelles Update

Normale Prüfung; ohne neuen Commit passiert nichts:

```bash
ssh netcup climate-chaos-update
```

Build und Neustart derselben Version erzwingen, beispielsweise nach geänderten
Build-Variablen:

```bash
ssh netcup climate-chaos-update --force
```

### Status und Logs

```bash
ssh netcup systemctl status climate-chaos-update.timer
ssh netcup journalctl -u climate-chaos-update.service -n 100 --no-pager
ssh netcup podman ps --filter name=climate-chaos
ssh netcup podman logs --tail 100 climate-chaos
```

Zeitplan anzeigen oder ein Update sofort über systemd starten:

```bash
ssh netcup systemctl list-timers climate-chaos-update.timer
ssh netcup systemctl start climate-chaos-update.service
```

Die deployte Commit-ID steht auf dem VPS in
`/opt/climate-chaos/state/current-commit`. Die zentrale Konfiguration liegt in
`/etc/climate-chaos.env` und ist nur für `root` lesbar.
