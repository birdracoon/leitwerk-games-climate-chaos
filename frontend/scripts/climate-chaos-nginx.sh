#!/usr/bin/env bash
# climate-chaos-nginx.sh
# Richtet Nginx als Reverse-Proxy und einen systemd-Service fuer die
# Climate-Chaos-Frontend (Next.js) App auf Ubuntu ein.
#
# Verwendung:
#   sudo bash climate-chaos-nginx.sh [OPTIONEN]
#
# Optionen:
#   --app-dir   DIR     Verzeichnis der App            (Standard: /var/www/climate-chaos-frontend)
#   --app-port  PORT    Port, auf dem Next.js lauscht  (Standard: 3000)
#   --server-name NAME  Nginx server_name (Domain/IP)  (Standard: _)
#   --node-bin  PATH    Absoluter Pfad zur node-Binary  (Standard: automatisch per 'which node')
#   --npm-bin   PATH    Absoluter Pfad zur npm-Binary   (Standard: automatisch per 'which npm')
#   --help              Diese Hilfe anzeigen

set -euo pipefail

# --------------------------------------------------------------------------- #
# Standardwerte
# --------------------------------------------------------------------------- #
APP_DIR="/var/www/climate-chaos-frontend"
APP_PORT="3000"
SERVER_NAME="_"
SERVICE_NAME="climate-chaos-frontend"
NGINX_SITE="climate-chaos-frontend"
NODE_BIN=""
NPM_BIN=""

# --------------------------------------------------------------------------- #
# Argument-Parsing
# --------------------------------------------------------------------------- #
while [[ $# -gt 0 ]]; do
    case "$1" in
        --app-dir)    APP_DIR="$2";    shift 2 ;;
        --app-port)   APP_PORT="$2";   shift 2 ;;
        --server-name) SERVER_NAME="$2"; shift 2 ;;
        --node-bin)   NODE_BIN="$2";   shift 2 ;;
        --npm-bin)    NPM_BIN="$2";    shift 2 ;;
        --help)
            sed -n '/^# Verwendung/,/^$/p' "$0"
            exit 0
            ;;
        *)
            echo "Unbekannte Option: $1" >&2
            exit 1
            ;;
    esac
done

# --------------------------------------------------------------------------- #
# Root-Check
# --------------------------------------------------------------------------- #
if [[ "${EUID:-$(id -u)}" -ne 0 ]]; then
    echo "Fehler: Dieses Skript muss als root ausgefuehrt werden (sudo)." >&2
    exit 1
fi

# --------------------------------------------------------------------------- #
# Hilfsfunktionen
# --------------------------------------------------------------------------- #
info()    { echo "[INFO]  $*"; }
success() { echo "[OK]    $*"; }
warn()    { echo "[WARN]  $*" >&2; }
die()     { echo "[ERROR] $*" >&2; exit 1; }

# --------------------------------------------------------------------------- #
# Node / npm auflösen
# --------------------------------------------------------------------------- #
if [[ -z "$NODE_BIN" ]]; then
    NODE_BIN="$(which node 2>/dev/null || true)"
    [[ -n "$NODE_BIN" ]] || die "node nicht gefunden. Bitte Node.js installieren oder --node-bin angeben."
fi

if [[ -z "$NPM_BIN" ]]; then
    NPM_BIN="$(which npm 2>/dev/null || true)"
    [[ -n "$NPM_BIN" ]] || die "npm nicht gefunden. Bitte Node.js installieren oder --npm-bin angeben."
fi

info "node : $NODE_BIN ($(${NODE_BIN} --version))"
info "npm  : $NPM_BIN  ($(${NPM_BIN} --version))"

# --------------------------------------------------------------------------- #
# Nginx installieren (falls nicht vorhanden)
# --------------------------------------------------------------------------- #
if ! command -v nginx &>/dev/null; then
    info "Installiere nginx..."
    apt-get update -qq
    apt-get install -y nginx
    success "nginx installiert."
else
    success "nginx bereits vorhanden: $(nginx -v 2>&1)."
fi

# --------------------------------------------------------------------------- #
# systemd-Service erstellen
# --------------------------------------------------------------------------- #
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"
APP_CURRENT="${APP_DIR}/current"

info "Erstelle systemd-Service: ${SERVICE_FILE}"

cat > "${SERVICE_FILE}" <<EOF
[Unit]
Description=Climate Chaos Frontend (Next.js)
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${APP_CURRENT}
Environment=NODE_ENV=production
Environment=PORT=${APP_PORT}
ExecStart=${NODE_BIN} ${APP_CURRENT}/node_modules/.bin/next start -p ${APP_PORT}
Restart=on-failure
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=${SERVICE_NAME}

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "${SERVICE_NAME}"
success "systemd-Service aktiviert."

# --------------------------------------------------------------------------- #
# Nginx-Site konfigurieren
# --------------------------------------------------------------------------- #
NGINX_AVAILABLE="/etc/nginx/sites-available/${NGINX_SITE}"
NGINX_ENABLED="/etc/nginx/sites-enabled/${NGINX_SITE}"

info "Erstelle Nginx-Konfiguration: ${NGINX_AVAILABLE}"

cat > "${NGINX_AVAILABLE}" <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${SERVER_NAME};

    # Weiterleitungs-Logs
    access_log /var/log/nginx/${NGINX_SITE}-access.log;
    error_log  /var/log/nginx/${NGINX_SITE}-error.log;

    # Sicherheits-Header
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options        "SAMEORIGIN" always;
    add_header X-XSS-Protection       "1; mode=block" always;

    # Redirect: /climate-chaos -> /climate-chaos/
    location = /climate-chaos {
        return 301 /climate-chaos/;
    }

    # Statische Next.js-Assets direkt aus dem Build ausliefern
    location /climate-chaos/_next/static/ {
        alias ${APP_CURRENT}/.next/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    # Public-Verzeichnis
    location /climate-chaos/ {
        proxy_pass         http://127.0.0.1:${APP_PORT}/climate-chaos/;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade \$http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host \$host;
        proxy_set_header   X-Real-IP \$remote_addr;
        proxy_set_header   X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        proxy_read_timeout 60s;
    }
}
EOF

# Symlink aktivieren (idempotent)
if [[ ! -L "${NGINX_ENABLED}" ]]; then
    ln -s "${NGINX_AVAILABLE}" "${NGINX_ENABLED}"
fi

# Default-Site deaktivieren, falls vorhanden
if [[ -L "/etc/nginx/sites-enabled/default" ]]; then
    warn "Deaktiviere nginx-Default-Site."
    rm -f "/etc/nginx/sites-enabled/default"
fi

info "Teste nginx-Konfiguration..."
nginx -t

systemctl enable nginx
systemctl reload nginx
success "Nginx konfiguriert und neu geladen."

# --------------------------------------------------------------------------- #
# App-Verzeichnis-Berechtigungen
# --------------------------------------------------------------------------- #
if [[ -d "${APP_DIR}" ]]; then
    chown -R www-data:www-data "${APP_DIR}"
    success "Berechtigungen fuer ${APP_DIR} gesetzt."
else
    warn "${APP_DIR} existiert noch nicht. Berechtigungen werden nach dem ersten Deploy gesetzt."
fi

# --------------------------------------------------------------------------- #
# Zusammenfassung
# --------------------------------------------------------------------------- #
echo ""
echo "============================================================"
echo "  Setup abgeschlossen!"
echo "============================================================"
echo "  App-Verzeichnis : ${APP_DIR}"
echo "  Aktueller Stand : ${APP_CURRENT}"
echo "  Next.js-Port    : ${APP_PORT}"
echo "  Erreichbar unter: http://${SERVER_NAME}/climate-chaos"
echo "  Nginx server_name: ${SERVER_NAME}"
echo "  systemd-Service : ${SERVICE_NAME}"
echo ""
echo "  Nach dem ersten Deploy starten:"
echo "    sudo systemctl start ${SERVICE_NAME}"
echo "    sudo systemctl status ${SERVICE_NAME}"
echo ""
echo "  Fuer HTTPS (empfohlen):"
echo "    sudo apt-get install certbot python3-certbot-nginx"
echo "    sudo certbot --nginx -d <deine-domain>"
echo "============================================================"
