# 🎧 SAT - Sistema de Atención Técnica & Helpdesk Inteligente

[![Live Demo](https://img.shields.io/badge/Demo_en_Vivo-GitHub_Pages-22c55e?style=for-the-badge&logo=github&logoColor=white)](https://eltecnicoluisia.github.io/sat/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-5A0FC8?style=for-the-badge&logo=pwa&logoColor=white)](https://web.dev/progressive-web-apps/)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?style=for-the-badge&logo=docker&logoColor=white)](https://www.docker.com/)

Plataforma empresarial de gestión de incidencias, tickets de soporte técnico e infraestructura tecnológica. Diseñada con arquitectura **PWA (Progressive Web App)** instalable, chat en tiempo real vía WebSockets, ranking de productividad técnica, métricas SLA y motor de asistencia automática con reglas inteligentes.

---

## 🌐 Demostración Interactiva en Vivo (24/7)

Prueba la plataforma de soporte técnico directamente en tu navegador:

👉 **[https://eltecnicoluisia.github.io/sat/](https://eltecnicoluisia.github.io/sat/)**

---

## ✨ Características Principales

### 🎫 1. Gestión Integral de Tickets (SLA)
- Flujo de ciclo de vida completo: *Pendiente*, *En Proceso*, *Resuelto* y *Archivado*.
- Priorización inteligente con alertas visuales (*Baja*, *Media*, *Alta*, *Urgente*).
- Asignación dinámica a especialistas por departamento y sede.
- Subida de evidencias multimedia (capturas, logs y reportes técnicos).

### 🤖 2. Asistente Automático y Reglas de Bot
- Detección de palabras clave y auto-respuesta a dudas frecuentes (impresoras, reseteo de claves, conectividad).
- Disminución de hasta 40% en tiempos de primera respuesta.

### 📈 3. Métricas y Analítica de Soporte
- Tableros en vivo: tickets abiertos, tiempo promedio de resolución y tasa de cumplimiento.
- Ranking de eficiencia y volumen de atención por técnico.
- Reportes mensuales consolidados exportables para auditoría y gerencia.

### 📱 4. Soporte PWA y Móvil Multiplataforma
- Compatible con dispositivos móviles Android, iOS y escritorio vía Capacitor y PWA.
- Notificaciones push en tiempo real ante tickets críticos.

---

## 🏗️ Arquitectura del Sistema

```
SAT/
├── backend/                  # Servidor API Node.js / Express con WebSockets
│   ├── routes/               # Endpoints REST de tickets, estadísticas y usuarios
│   └── server.js             # Punto de entrada del backend
├── frontend/                 # Aplicación cliente React 19 + Vite 8 + TailwindCSS 4
│   ├── src/                  # Componentes, vistas del dashboard y widget PWA
│   ├── dist/                 # Compilación estática optimizada para GitHub Pages
│   └── vite.config.ts        # Configuración de Vite y PWA
├── docker-compose.yml        # Configuración de despliegue contenerizado
├── nginx.conf                # Proxy inverso de alta velocidad
└── README.md                 # Documentación oficial del proyecto
```

---

## 🚀 Despliegue con Docker

```bash
# 1. Clonar el repositorio
git clone https://github.com/eltecnicoluisia/sat.git
cd sat

# 2. Iniciar servicios con Docker Compose
docker compose up -d --build

# 3. Acceder al sistema
# Abre en tu navegador: http://localhost:3006
```

---

## 👨‍💻 Autor y Contacto

Desarrollado y mantenido por:

**Luis Uzcategui**  
Director, InformaticaVES  
- **Portafolio Interactivo:** [https://tecnicouzcategui.github.io/curriculum/](https://tecnicouzcategui.github.io/curriculum/)  
- **Sitio Web:** [https://tecnicouzcategui.github.io/informaticaves/index.html](https://tecnicouzcategui.github.io/informaticaves/index.html)  
- **Teléfono / WhatsApp:** 0424-2964339  
- **Correo Electrónico:** tecnicouzcategui@gmail.com / eltecnicoluisia@gmail.com  
- **GitHub:** [@eltecnicoluisia](https://github.com/eltecnicoluisia)
