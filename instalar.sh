#!/bin/bash
# =============================================================
# Script de Instalación Automática - SAT INAPYMI
# Sistema de Asistencia Tecnológica
# =============================================================
# USO: bash instalar.sh
# Requiere: Ubuntu 20.04+ / Debian 11+ con acceso sudo
# =============================================================

set -e

BACKEND_DIR=$(pwd)/backend
FRONTEND_DIR=$(pwd)/frontend
BACKEND_PORT=3001

echo ""
echo "======================================================"
echo "   INSTALADOR SAT - SISTEMA DE ASISTENCIA TECNOLOGICA"
echo "======================================================"
echo ""

# ——— Leer dominio / IP ———
read -p "Ingresa el dominio o IP del nuevo servidor (ej: 192.168.1.50 o sat.empresa.com): " SERVIDOR
if [ -z "$SERVIDOR" ]; then
  echo "ERROR: Debes indicar el dominio o IP del servidor."
  exit 1
fi

echo ""
echo "[1/7] Actualizando repositorios e instalando dependencias del sistema..."
sudo apt-get update -qq
sudo apt-get install -y -qq curl nginx sqlite3 2>/dev/null || true

# ——— Node.js 20 ———
echo ""
echo "[2/7] Instalando Node.js 20..."
if ! command -v node &>/dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt-get install -y nodejs
fi
echo "   Node: $(node -v) | NPM: $(npm -v)"

# ——— PM2 ———
echo ""
echo "[3/7] Instalando PM2..."
if ! command -v pm2 &>/dev/null; then
  sudo npm install -g pm2 --silent
fi

# ——— Backend ———
echo ""
echo "[4/7] Configurando Backend..."
cd "$BACKEND_DIR"

# Actualizar .env con el puerto
sed -i "s/^PORT=.*/PORT=$BACKEND_PORT/" .env 2>/dev/null || echo "PORT=$BACKEND_PORT" >> .env

echo "   Instalando dependencias npm..."
npm install --silent

echo "   Sincronizando base de datos con Prisma..."
npx prisma db push --skip-generate 2>/dev/null || npx prisma db push
npx prisma generate --silent 2>/dev/null || true

echo "   Iniciando backend con PM2..."
pm2 delete saat-backend 2>/dev/null || true
pm2 start "npx tsx index.ts" --name "saat-backend" --cwd "$BACKEND_DIR"
pm2 save

# ——— Frontend ———
echo ""
echo "[5/7] Compilando Frontend..."
cd "$FRONTEND_DIR"

# Actualizar URL del Capacitor
sed -i "s|url: '.*'|url: 'http://$SERVIDOR'|g" capacitor.config.ts 2>/dev/null || true

echo "   Instalando dependencias npm..."
npm install --silent

echo "   Compilando con Vite..."
npm run build

# ——— Nginx ———
echo ""
echo "[6/7] Configurando Nginx..."

NGINX_CONF="/etc/nginx/sites-available/saat"
DIST_PATH="$FRONTEND_DIR/dist"
UPLOADS_PATH="$BACKEND_DIR/uploads"

# Crear directorio de uploads si no existe
mkdir -p "$UPLOADS_PATH"

# Crear configuración nginx
sudo bash -c "cat > $NGINX_CONF" <<NGINX_EOF
server {
    listen 80;
    server_name $SERVIDOR;
    client_max_body_size 10M;

    # Frontend (Archivos estáticos)
    location / {
        root $DIST_PATH;
        index index.html;
        try_files \$uri \$uri/ /index.html;
    }

    # Backend API
    location /api/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    # WebSockets (Socket.io)
    location /socket.io/ {
        proxy_pass http://localhost:$BACKEND_PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }

    # Imágenes adjuntas a tickets
    location /uploads/ {
        alias $UPLOADS_PATH/;
    }
}
NGINX_EOF

sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/saat 2>/dev/null || true
sudo rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
sudo nginx -t && sudo systemctl restart nginx

echo ""
echo "[7/7] Configurando PM2 para inicio automático..."
pm2 startup 2>/dev/null | tail -1 | bash 2>/dev/null || true
pm2 save

echo ""
echo "======================================================"
echo "   INSTALACION COMPLETADA CON EXITO"
echo "======================================================"
echo ""
echo "  URL del sistema: http://$SERVIDOR"
echo "  Backend corriendo en puerto: $BACKEND_PORT"
echo "  PM2 status: pm2 status"
echo "  Logs backend: pm2 logs saat-backend"
echo ""
echo "  Usuario administrador: administrador"
echo "  Contraseña:            (la que esté en la base de datos incluida)"
echo ""
echo "======================================================"
