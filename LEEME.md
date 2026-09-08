# Sistema de Asistencia Tecnológica (SAT) - INAPYMI

Este paquete contiene el código fuente completo del frontend (React/Vite) y backend (Node.js/Express/Prisma) del Sistema de Asistencia Tecnológica.

## Requisitos Previos

- **Node.js**: v18 o superior.
- **NPM**: v9 o superior.
- **PM2**: Instalado globalmente (`npm install -g pm2`).
- **Nginx**: Para servir el frontend y como proxy inverso del backend.

## 1. Configuración del Backend

1. Ingresa a la carpeta `backend`:
   ```bash
   cd backend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Base de Datos:
   El proyecto usa SQLite (`prisma/dev.db`). Se incluye la base de datos actual de producción. Si deseas limpiarla y empezar de cero:
   ```bash
   rm prisma/dev.db
   npx prisma db push
   ```
4. Ejecuta el backend con PM2:
   ```bash
   pm2 start npm --name "saat-backend" -- run dev
   # O si lo prefieres compilado:
   npm run build
   pm2 start dist/index.js --name "saat-backend"
   ```
   El backend se ejecutará en el puerto **3000** por defecto.

## 2. Configuración del Frontend

1. Ingresa a la carpeta `frontend`:
   ```bash
   cd frontend
   ```
2. Instala las dependencias:
   ```bash
   npm install
   ```
3. Compila el proyecto para producción:
   ```bash
   npm run build
   ```
   Esto generará una carpeta `dist/` con los archivos estáticos listos para servir.

## 3. Configuración de Nginx (Ejemplo)

Crea un archivo de configuración en `/etc/nginx/sites-available/saat` y haz un enlace simbólico a `sites-enabled`:

```nginx
server {
    listen 80;
    server_name tu-dominio.com; # Cambiar por el dominio o IP

    # Frontend (Archivos estáticos generados por Vite)
    location / {
        root /ruta/a/SAAT_Release/frontend/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    # Backend (API REST y WebSockets)
    location /api/ {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Subidas de archivos (Evidencias de tickets)
    location /uploads/ {
        alias /ruta/a/SAAT_Release/backend/uploads/;
    }
}
```

Luego, reinicia nginx:
```bash
sudo systemctl restart nginx
```

## Credenciales Iniciales

- **URL de acceso:** http://tu-dominio.com
- **Usuario Administrador:** `administrador` (Cédula: administrador)
- **Contraseña:** `Inapymi2001` (o la contraseña que haya estado configurada en el último backup).

## Compilación de APK Android

Si necesitas compilar la aplicación para Android nuevamente:
1. Asegúrate de tener Android Studio instalado y configurado.
2. Ingresa a la carpeta `frontend`.
3. Sincroniza Capacitor:
   ```bash
   npx cap sync android
   ```
4. Abre el proyecto en Android Studio:
   ```bash
   npx cap open android
   ```
5. Genera el APK desde la opción `Build > Build Bundle(s) / APK(s) > Build APK(s)`.
