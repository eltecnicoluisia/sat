import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { io, Socket } from "socket.io-client";
import {
  LayoutDashboard,
  Users,
  Settings, Bot,
  LifeBuoy,
  Activity,
  CheckCircle2,
  Clock,
  AlertCircle,
  Plus,
  Trash2,
  Edit2,
  X,
  Archive,
  History,
  XCircle,
} from "lucide-react";
import PymiWidget from "./components/PymiWidget";

let globalAudioCtx: any = null;
const getAudioCtx = () => {
  if (!globalAudioCtx) {
    globalAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (globalAudioCtx.state === 'suspended') {
    globalAudioCtx.resume();
  }
  return globalAudioCtx;
};

// Mock data & demo fallback for GitHub Pages
const DEMO_TECH_USER = {
  id: 1,
  nombre: "Luis Uzcategui",
  cedula: "V-19842512",
  rol: "ADMIN",
  departamento: "Soporte e Infraestructura TI",
  email: "tecnicouzcategui@gmail.com"
};

if (typeof window !== "undefined") {
  if (window.location.hostname.includes("github.io") || !localStorage.getItem("inapymi_user")) {
    if (!localStorage.getItem("inapymi_user")) {
      localStorage.setItem("inapymi_user", JSON.stringify(DEMO_TECH_USER));
    }
  }
}

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    const url = error.config?.url || "";
    let data: any = {};
    if (url.includes("/api/stats")) {
      data = { total: 148, pendientes: 6, enProgreso: 12, resueltos: 130, tiempoPromedio: "1.2 hrs" };
    } else if (url.includes("/api/categories")) {
      data = [
        { id: 1, name: "Soporte de Hardware & Servidores", color: "#38bdf8" },
        { id: 2, name: "Redes, Switches & Conectividad", color: "#818cf8" },
        { id: 3, name: "Sistemas Administrativos & ERP", color: "#34d399" },
        { id: 4, name: "Mantenimiento Preventivo & Respaldos", color: "#fbbf24" }
      ];
    } else if (url.includes("/api/bot-rules")) {
      data = [
        { id: 1, keyword: "impresora", response: "Verifique que el cable de red esté conectado y reinicie la cola de impresión.", isActive: true },
        { id: 2, keyword: "contraseña", response: "Para restablecer su acceso corporativo, comuníquese con el administrador del dominio.", isActive: true }
      ];
    } else if (url.includes("/api/tickets")) {
      data = [
        { id: 1048, correlative: 1048, title: "Falla de enlace de fibra en Galpón Principal", user: { fullName: "Carlos Mendoza", gerencia: "Operaciones y Logística", unidad: "Almacén Central" }, category: "Redes, Switches & Conectividad", priority: "Alta", status: "En Proceso", createdAt: "2026-09-07T10:15:00.000Z", description: "Corte intermitente en switch principal de distribución." },
        { id: 1047, correlative: 1047, title: "Instalación de Punto de Venta POS Terminal 4", user: { fullName: "Elena Rivas", gerencia: "Administración", unidad: "Caja Principal" }, category: "Sistemas Administrativos & ERP", priority: "Media", status: "En Espera", createdAt: "2026-09-07T09:30:00.000Z", description: "Configuración de driver fiscal y conexión con base de datos." },
        { id: 1046, correlative: 1046, title: "Alerta de temperatura en Servidor Dell R750", user: { fullName: "Luis Uzcategui", gerencia: "Tecnología", unidad: "Centro de Datos" }, category: "Soporte de Hardware & Servidores", priority: "Urgente", status: "En Proceso", createdAt: "2026-09-07T08:00:00.000Z", description: "Limpieza preventiva y cambio de pasta térmica en nodos 1 y 2." },
        { id: 1045, correlative: 1045, title: "Configuración de Backup automatizado en NAS", user: { fullName: "Roberto Gómez", gerencia: "Sistemas", unidad: "Seguridad Digital" }, category: "Mantenimiento Preventivo & Respaldos", priority: "Baja", status: "En Espera", createdAt: "2026-09-06T16:20:00.000Z", description: "Programación de tareas cron nocturnas a las 02:00 AM." },
        { id: 1044, correlative: 1044, title: "Sustitución de Baterías en UPS APC Smart 3000VA", user: { fullName: "Javier Castillo", gerencia: "Infraestructura", unidad: "Energía Crítica" }, category: "Soporte de Hardware & Servidores", priority: "Media", status: "En Proceso", createdAt: "2026-09-06T11:45:00.000Z", description: "Reemplazo de módulo de celdas 12V 9Ah y prueba de transferencia." }
      ];
    } else if (url.includes("/api/users")) {
      data = [
        { id: 1, nombre: "Luis Uzcategui", cedula: "V-19842512", rol: "ADMIN", departamento: "Tecnología e Infraestructura", email: "tecnicouzcategui@gmail.com" },
        { id: 2, nombre: "Carlos Mendoza", cedula: "V-20194821", rol: "TECNICO", departamento: "Soporte en Sitio", email: "cmendoza@inapymi.gob.ve" }
      ];
    } else if (url.includes("/api/reports")) {
      data = {
        totalTickets: 148,
        resolvedTickets: 130,
        pendingTickets: 18,
        categoriesBreakdown: [
          { name: "Hardware", count: 52 },
          { name: "Redes", count: 41 },
          { name: "Sistemas", count: 35 },
          { name: "Respaldos", count: 20 }
        ]
      };
    } else {
      data = { success: true, message: "Operación simulada en modo demo" };
    }
    return Promise.resolve({ data, status: 200, statusText: "OK", headers: {}, config: error.config });
  }
);

const DashboardCard = ({
  title,
  value,
  icon: Icon,
  colorClass,
  isAlert = false,
}: any) => (
  <div
    className={`p-6 rounded-2xl bg-brand-blue-800 border border-brand-blue-700 shadow-xl transition-all duration-300 hover:scale-[1.02] ${isAlert ? "glow-neon" : ""}`}
  >
    <div className="flex items-center justify-between">
      <div>
        <p className="text-sm text-slate-400 font-medium mb-1">{title}</p>
        <h3 className={`text-4xl font-bold ${colorClass}`}>{value}</h3>
      </div>
      <div className={`p-4 rounded-full bg-brand-blue-900 ${colorClass}`}>
        <Icon size={28} strokeWidth={2} />
      </div>
    </div>
  </div>
);

export default function App() {
  useEffect(() => {
    const unlockAudio = () => {
      const ctx = getAudioCtx();
      if (ctx.state === 'suspended') ctx.resume();
    };
    document.addEventListener("click", unlockAudio);
    return () => document.removeEventListener("click", unlockAudio);
  }, []);

  const [activeTab, setActiveTab] = useState("dashboard");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showForcePassword, setShowForcePassword] = useState(false);
  const [historyMonth, setHistoryMonth] = useState(() => new Date().toISOString().substring(0, 7));
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historyStats, setHistoryStats] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Autenticación
  const [currentUser, setCurrentUser] = useState<any>(() => {
    const saved = localStorage.getItem("inapymi_user");
    return saved ? JSON.parse(saved) : null;
  });
  const [loginForm, setLoginForm] = useState({ cedula: "", password: "" });
  const [loginError, setLoginError] = useState("");
  const [isRecoverPasswordView, setIsRecoverPasswordView] = useState(false);
  const [recoverForm, setRecoverForm] = useState({ cedula: "", email: "" });
  const [isRecoverySent, setIsRecoverySent] = useState(false);

  const [mustChangePasswordUser, setMustChangePasswordUser] =
    useState<any>(null);
  const [forcePasswordForm, setForcePasswordForm] = useState({
    newPassword: "",
  });

  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] =
    useState(false);
  const [changePasswordForm, setChangePasswordForm] = useState({
    newPassword: "",
  });

  const [isForceAdminModalOpen, setIsForceAdminModalOpen] = useState(false);
  const [forceAdminUserId, setForceAdminUserId] = useState<string | null>(null);
  const [forceAdminForm, setForceAdminForm] = useState({ newPassword: "" });

  // Datos Reales
  const [users, setUsers] = useState<any[]>([]);
  const [tickets, setTickets] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [techRanking, setTechRanking] = useState<any[]>([]);

  // Modales y Formularios
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [userForm, setUserForm] = useState({
    fullName: "",
    cedula: "",
    emailPrefix: "",
    role: "Solicitante",
    password: "",
    gerencia: "",
    unidad: "",
  });
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    title: "",
    description: "",
    categoryId: "",
    image: null as File | null,
  });
  const [categoryForm, setCategoryForm] = useState({ title: "", requiresDescription: false, requiresImage: false });

  // State hooks for Bot Rules
  const [botRules, setBotRules] = useState<any[]>([]);
  const [isBotRuleModalOpen, setIsBotRuleModalOpen] = useState(false);
  const [editingBotRuleId, setEditingBotRuleId] = useState<string | null>(null);
  const [botRuleForm, setBotRuleForm] = useState({ keywords: "", response: "", isActive: true });

  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(
    null,
  );

  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const day = now.getDate();
      const months = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
      const month = months[now.getMonth()];
      const year = now.getFullYear();
      
      let hours = now.getHours();
      const minutes = now.getMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'Pm' : 'Am';
      hours = hours % 12;
      hours = hours ? hours : 12; 
      
      setCurrentTime(`Caracas ${day} de ${month} del ${year}. ${hours}:${minutes} ${ampm}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);


  const socketRef = useRef<Socket | null>(null);

  // Estado de Reportes
  const [reportData, setReportData] = useState<any>(null);
  const [selectedMonth, setSelectedMonth] = useState<string>(
    new Date().toISOString().substring(0, 7),
  );

  // Cargar reporte cuando se selecciona el mes o se abre la pestaña
  useEffect(() => {
    if (activeTab === "reports" && currentUser?.role === "Super Admin") {
      axios
        .get(`/api/reports?month=${selectedMonth}`)
        .then((res) => setReportData(res.data))
        .catch((err) => console.error("Error fetching report", err));
    }
  }, [activeTab, selectedMonth, currentUser]);

  // Cargar historial
  useEffect(() => {
    if (activeTab === "history" && currentUser) {
      if (currentUser.role === "Super Admin") {
        axios
          .get(`/api/reports?month=${historyMonth}`)
          .then((res) => setHistoryStats(res.data))
          .catch((err) => console.error("Error fetching stats", err));
          
        axios
          .get(`/api/tickets?month=${historyMonth}`)
          .then((res) => setHistoryData(res.data))
          .catch((err) => console.error("Error fetching history tickets", err));
      } else {
        const queryParams = new URLSearchParams({
          month: historyMonth
        });
        if (currentUser.role === 'Técnico IT') {
          queryParams.append('techId', currentUser.id);
        } else {
          queryParams.append('role', currentUser.role);
          queryParams.append('userId', currentUser.id);
        }
        
        axios
          .get(`/api/tickets?${queryParams.toString()}`)
          .then((res) => setHistoryData(res.data))
          .catch((err) => console.error("Error fetching history tickets", err));
      }
    }
  }, [activeTab, historyMonth, currentUser]);

  // Lógica PWA (Install Prompt)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setDeferredPrompt(null);
      }
    }
  };

  // Efecto para cargar tickets, categorías y configurar Sockets
  useEffect(() => {
    if (currentUser) {
      const fetchTicketsAndCategories = async () => {
        try {
          const resT = await axios.get(
            `/api/tickets?role=${currentUser.role}&userId=${currentUser.id}`,
          );
          setTickets(resT.data);
          const resC = await axios.get(`/api/categories`);
          setCategories(resC.data);
          const resB = await axios.get(`/api/bot-rules`);
          setBotRules(resB.data);

          if (
            currentUser.role === "Super Admin" ||
            currentUser.role === "Técnico IT"
          ) {
            const resS = await axios.get("/api/stats");
            setTechRanking(resS.data.techRanking);
          }
        } catch (err) {
          console.error("Error fetching data", err);
        }
      };

      fetchTicketsAndCategories();

      // Configurar Socket.io
      const socket = io("/");
      socketRef.current = socket;

      socket.on("tickets:updated", () => {
        fetchTicketsAndCategories();
      });

      socket.on("ticket:created", () => {
        if (
          currentUser.role === "Super Admin" ||
          currentUser.role === "Técnico IT"
        ) {
          try {
            const ctx = getAudioCtx();
            let time = ctx.currentTime;
            for (let i = 0; i < 5; i++) {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.type = "sine";
              osc.frequency.setValueAtTime(880, time); // A5 note
              gain.gain.setValueAtTime(1, time);
              gain.gain.exponentialRampToValueAtTime(0.01, time + 0.3);
              osc.start(time);
              osc.stop(time + 0.3);
              time += 0.25; // 5 campanadas cortas
            }
          } catch (e) {
            console.error("Audio block", e);
          }
        }
      });

      const playSingleBeep = () => {
        try {
          const ctx = getAudioCtx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.type = "sine";
          osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 note
          gain.gain.setValueAtTime(1, ctx.currentTime);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.8);
          osc.start(ctx.currentTime);
          osc.stop(ctx.currentTime + 0.8);
        } catch (e) {
          console.error("Audio block", e);
        }
      };

      socket.on("ticket:taken", (ticket: any) => {
        if (ticket.userId === currentUser.id) {
          playSingleBeep();
          alert(
            `🔔 ¡Atención! El técnico ${ticket.tech?.fullName} acaba de tomar tu requerimiento.`,
          );
        }
        if (ticket.techId === currentUser.id) {
          playSingleBeep();
        }
      });

      socket.on("ticket:assigned", (ticket: any) => {
        if (ticket.userId === currentUser.id) {
          playSingleBeep();
          alert(
            `🔔 ¡Atención! Se ha asignado tu requerimiento al técnico ${ticket.tech?.fullName}.`,
          );
        }
        if (ticket.techId === currentUser.id) {
          playSingleBeep();
          alert(`🔔 Se te ha asignado un nuevo requerimiento.`);
        }
      });

      socket.on("ticket:resolved", (ticket: any) => {
        if (ticket.userId === currentUser.id) {
          playSingleBeep();
          alert(
            `🔔 Tu requerimiento ha sido resuelto. Por favor entra al sistema para dar tu conformidad.`,
          );
        }
      });

      socket.on("ticket:conformity", (ticket: any) => {
        if (ticket.techId === currentUser.id) {
          playSingleBeep();
          alert(
            `🔔 El solicitante ha calificado tu caso como: ${ticket.status}`,
          );
        }
      });

      return () => {
        socket.disconnect();
      };
    }
  }, [currentUser]);

  // Cargar usuarios reales
  useEffect(() => {
    const fetchUsers = () => {
      axios
        .get("/api/users")
        .then((res) => setUsers(res.data))
        .catch((err) => console.error("API desconectada:", err));
    };
    fetchUsers();

    const interval = setInterval(fetchUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validación estricta de Cédula (Solo para NO Super Admins)
    if (userForm.role !== 'Super Admin') {
      const cedulaNum = parseInt(userForm.cedula);
      if (!cedulaNum || cedulaNum < 1000000 || cedulaNum > 40000000) {
        alert(
          "⚠️ Cédula inválida. Debe ser un número real entre 1,000,000 y 40,000,000.",
        );
        return;
      }
    }

    try {
      const email = userForm.emailPrefix
        ? `${userForm.emailPrefix}@inapymi.gob.ve`
        : null;
      
      const payload: any = {
        fullName: userForm.fullName,
        cedula: userForm.cedula,
        email: email,
        role: userForm.role,
        gerencia: userForm.gerencia,
        unidad: userForm.unidad,
      };
      if (userForm.password) {
        payload.password = userForm.password;
      }

      if (editingUserId) {
        await axios.put(`/api/users/${editingUserId}`, payload);
      } else {
        await axios.post("/api/users", payload);
      }
      
      setIsUserModalOpen(false);
      setEditingUserId(null);
      setUserForm({
        fullName: "",
        cedula: "",
        emailPrefix: "",
        role: "Solicitante",
        password: "",
        gerencia: "",
        unidad: "",
      });
    } catch (err: any) {
      alert(
        err.response?.data?.error || "Error al guardar el usuario. Verifica los datos.",
      );
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      const res = await axios.post(
        "/api/login",
        loginForm,
      );
      if (res.data.mustChangePassword) {
        setMustChangePasswordUser(res.data);
      } else {
        setCurrentUser(res.data);
        localStorage.setItem("inapymi_user", JSON.stringify(res.data));
      }
    } catch (err: any) {
      setLoginError(err.response?.data?.error || "Error de conexión");
    }
  };

  const handleRecoverPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    try {
      await axios.post(
        "/api/recover-password",
        recoverForm,
      );
      setIsRecoverySent(true);
    } catch (err: any) {
      setLoginError(
        err.response?.data?.error || "Error al recuperar contraseña",
      );
    }
  };

  const handleForcePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/users/${mustChangePasswordUser.id}/password`,
        forcePasswordForm,
      );
      const updatedUser = {
        ...mustChangePasswordUser,
        mustChangePassword: false,
      };
      setCurrentUser(updatedUser);
      localStorage.setItem("inapymi_user", JSON.stringify(updatedUser));
      setMustChangePasswordUser(null);
      setForcePasswordForm({ newPassword: "" });
      setLoginForm({ cedula: "", password: "" });
    } catch (err) {
      alert("Error al guardar nueva contraseña");
    }
  };

  const handleChangeOwnPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/users/${currentUser.id}/password`,
        changePasswordForm,
      );
      alert("Contraseña actualizada exitosamente.");
      setIsChangePasswordModalOpen(false);
      setChangePasswordForm({ newPassword: "" });
    } catch (err) {
      alert("Error al actualizar la contraseña");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.clear();
    setLoginForm({ cedula: "", password: "" });
    setLoginError("");
    setActiveTab("dashboard");
    setIsRecoverPasswordView(false);
    setIsRecoverySent(false);
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketForm.categoryId) return alert("Debe seleccionar una categoría.");

    const cat = categories.find((c) => c.id === ticketForm.categoryId);
    const title = cat ? cat.title : "Requerimiento General";

    if (cat?.requiresDescription && !ticketForm.description.trim()) {
      return alert("Debe proporcionar una descripción detallada para este tipo de requerimiento.");
    }

    if (cat?.requiresImage && !ticketForm.image) {
      return alert("La evidencia fotográfica es obligatoria para este tipo de requerimiento.");
    }

    // Validaciones anti-garabatos (gibberish) extremas
    if (ticketForm.description.trim()) {
      const desc = ticketForm.description.trim();
      
      if (desc.length < 10) {
        return alert("Por favor, proporcione una descripción detallada (mínimo 10 caracteres).");
      }

      if (/(.)\1{4,}/.test(desc)) {
        return alert("La descripción contiene muchos caracteres repetidos. Por favor, escriba texto coherente.");
      }

      const words = desc.split(/\s+/);
      if (words.some(w => w.length > 25 && !w.startsWith('http'))) {
        return alert("La descripción contiene palabras exageradamente largas. Por favor, escriba texto coherente.");
      }
      
      let meaninglessWordsCount = 0;
      const validSingleLetters = ['y', 'a', 'e', 'o', 'u'];
      for (const w of words) {
        const wLower = w.toLowerCase();
        if (wLower.length === 1 && !validSingleLetters.includes(wLower) && !/[0-9]/.test(wLower)) {
          meaninglessWordsCount++;
        }
        else if (wLower.length >= 3 && !/[aeiouáéíóú]/i.test(wLower) && !/^[0-9]+$/.test(wLower)) {
          meaninglessWordsCount++;
        }
      }

      // Ratio de vocales global
      const totalLetters = desc.replace(/[^a-zA-ZáéíóúÁÉÍÓÚ]/g, '').length;
      const totalVowels = (desc.match(/[aeiouáéíóú]/gi) || []).length;
      
      if (totalLetters > 10 && (totalVowels / totalLetters) < 0.20) {
        return alert("El sistema detecta que el texto carece de vocales (incoherente). Explique su problema claramente.");
      }

      if (meaninglessWordsCount >= 2) {
        return alert("El sistema ha detectado tipeo aleatorio o texto sin sentido. Explique su problema claramente.");
      }
    }

    try {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", ticketForm.description.trim() || "Generado automáticamente según el tipo de requerimiento.");
      formData.append("userId", currentUser.id);
      formData.append("categoryId", ticketForm.categoryId);
      if (ticketForm.image) {
        formData.append("image", ticketForm.image);
      }

      await axios.post("/api/tickets", formData, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      setIsTicketModalOpen(false);
      setTicketForm({ title: "", description: "", categoryId: "", image: null });
    } catch (err) {
      alert("Error al crear el requerimiento");
    }
  };

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCategoryId) {
        await axios.put(
          `/api/categories/${editingCategoryId}`,
          categoryForm,
        );
        setCategories(categories.map((c) => c.id === editingCategoryId ? { ...c, title: categoryForm.title, requiresDescription: categoryForm.requiresDescription, requiresImage: categoryForm.requiresImage } : c));
      } else {
        const res = await axios.post("/api/categories", categoryForm);
        setCategories([...categories, res.data]);
      }
      setIsCategoryModalOpen(false);
      setCategoryForm({ title: "", requiresDescription: false, requiresImage: false });
      setEditingCategoryId(null);
    } catch (err: any) {
      alert("Error al guardar categoría");
    }
  };

  const handleEditCategory = (c: any) => {
    setCategoryForm({ title: c.title, requiresDescription: c.requiresDescription || false, requiresImage: c.requiresImage || false });
    setEditingCategoryId(c.id);
    setIsCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (id: string) => {
    if (
      !window.confirm("¿Estás seguro de eliminar este tipo de requerimiento?")
    )
      return;
    try {
      await axios.delete(`/api/categories/${id}`);
    } catch (err: any) {
      alert(err.response?.data?.error || "Error al eliminar categoría");
    }
  };


  const handleSaveBotRule = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingBotRuleId) {
        const res = await axios.put(`/api/bot-rules/${editingBotRuleId}`, botRuleForm);
        setBotRules(botRules.map(r => r.id === editingBotRuleId ? res.data : r));
      } else {
        const res = await axios.post("/api/bot-rules", botRuleForm);
        setBotRules([res.data, ...botRules]);
      }
      setIsBotRuleModalOpen(false);
      setEditingBotRuleId(null);
      setBotRuleForm({ keywords: "", response: "", isActive: true });
    } catch(err) {
      alert("Error guardando regla del bot");
    }
  };

  const handleDeleteBotRule = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar esta regla?")) return;
    try {
      await axios.delete(`/api/bot-rules/${id}`);
      setBotRules(botRules.filter(r => r.id !== id));
    } catch(err) {
      alert("Error eliminando regla");
    }
  };

  const handleToggleBotRule = async (rule: any) => {
    try {
      const res = await axios.put(`/api/bot-rules/${rule.id}`, { ...rule, isActive: !rule.isActive });
      setBotRules(botRules.map(r => r.id === rule.id ? res.data : r));
    } catch(err) {
      alert("Error cambiando estado de regla");
    }
  };

  const handleToggleUserStatus = async (user: any) => {
    const newStatus = user.status === "Activo" ? "Inactivo" : "Activo";
    if (!window.confirm(`¿Seguro que deseas cambiar el estado a ${newStatus}?`))
      return;
    try {
      await axios.put(
        `/api/users/${user.id}/toggle-status`,
        { status: newStatus },
      );
      setUsers(
        users.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u)),
      );
    } catch (err) {
      alert("Error al cambiar estado");
    }
  };

  const handleDeleteUser = async (user: any) => {
    if (user.cedula === 'administrador') {
      alert("No puedes eliminar al Administrador Principal del sistema.");
      return;
    }
    if (!window.confirm(`⚠️ ¡Peligro! ¿Estás ABSOLUTAMENTE seguro de que deseas ELIMINAR DEFINITIVAMENTE al usuario ${user.fullName}? Esta acción no se puede deshacer y borrará permanentemente sus datos.`))
      return;
    try {
      await axios.delete(`/api/users/${user.id}`);
      setUsers(users.filter((u) => u.id !== user.id));
    } catch (err) {
      alert("Error al eliminar el usuario. Puede que tenga tickets asociados.");
    }
  };

  const handleAdminForcePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await axios.put(
        `/api/users/${forceAdminUserId}/force-password`,
        forceAdminForm,
      );
      alert("Contraseña forzada exitosamente.");
      setIsForceAdminModalOpen(false);
      setForceAdminForm({ newPassword: "" });
      setForceAdminUserId(null);
    } catch (err) {
      alert("Error forzando contraseña");
    }
  };

  const handleAssignTicket = async (ticketId: string, techId: string) => {
    if (!techId) return;
    try {
      await axios.put(`/api/tickets/${ticketId}/assign`, {
        techId,
      });
    } catch (err) {
      alert("Error al asignar el requerimiento");
    }
  };

  const handleTakeTicket = async (ticketId: String) => {
    try {
      await axios.put(`/api/tickets/${ticketId}/take`, {
        techId: currentUser.id,
      });
    } catch (err) {
      alert("Error al tomar el requerimiento");
    }
  };

  const handleCancelTicket = async (ticketId: String) => {
    if (!window.confirm("¿Seguro que deseas cancelar esta solicitud?")) return;
    try {
      await axios.put(`/api/tickets/${ticketId}/cancel`);
    } catch (err) {
      alert("Error al cancelar el requerimiento");
    }
  };

  const handleReleaseTicket = async (ticketId: String) => {
    if (!window.confirm("¿Seguro que deseas liberar este requerimiento? Volverá a estar En Espera.")) return;
    try {
      await axios.put(`/api/tickets/${ticketId}/release`);
    } catch (err) {
      alert("Error al liberar el requerimiento");
    }
  };

  const handleResolveTicket = async (ticketId: String) => {
    try {
      await axios.put(`/api/tickets/${ticketId}/resolve`);
    } catch (err) {
      alert("Error al resolver ticket");
    }
  };

  const handleConformity = async (ticketId: String, approved: boolean) => {
    try {
      await axios.put(
        `/api/tickets/${ticketId}/conformity`,
        { approved },
      );
    } catch (err) {
      alert("Error al aplicar conformidad");
    }
  };

  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-brand-blue-900 text-slate-100 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0 pointer-events-none">
          <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full bg-brand-neon/5 blur-[120px]"></div>
          <div className="absolute bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-brand-olive/5 blur-[100px]"></div>
        </div>

        <div className="w-full max-w-md z-10 p-8 bg-brand-blue-800/80 backdrop-blur-xl border border-brand-blue-700 rounded-3xl shadow-2xl animate-fade-in">
          <div className="flex flex-col items-center mb-8">
            <h1 className="flex flex-col items-center text-center">
              <div className="text-6xl font-black mb-1 flex items-center justify-center space-x-4 tracking-[0.3em]">
                <span className="sat-letter-1">S</span>
                <span className="sat-letter-2">A</span>
                <span className="sat-letter-3">T</span>
              </div>
              <span className="text-sm font-bold text-slate-400 tracking-[0.2em] mb-2 uppercase">
                SISTEMA DE ASISTENCIA TECNOLOGICA
              </span>
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              Sistema Centralizado de Soporte
            </p>
          </div>

          {mustChangePasswordUser ? (
            <form
              onSubmit={handleForcePasswordChange}
              className="space-y-5 animate-fade-in"
            >
              <div className="text-center mb-4 text-brand-neon bg-brand-neon/10 p-3 rounded-lg border border-brand-neon/20">
                <AlertCircle className="mx-auto mb-2" size={24} />
                <p className="text-sm font-bold">
                  Por razones de seguridad, debes actualizar tu contraseña
                  temporal antes de continuar.
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Nueva Contraseña Definitiva
                </label>
                <div className="relative">
                  <input
                    type={showForcePassword ? "text" : "password"}
                    required
                    value={forcePasswordForm.newPassword}
                    onChange={(e) =>
                      setForcePasswordForm({ newPassword: e.target.value })
                    }
                    className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-xl p-4 pr-12 text-white focus:outline-none focus:border-brand-neon transition-colors"
                    placeholder="Escribe tu nueva clave secreta"
                  />
                  <button
                    type="button"
                    onClick={() => setShowForcePassword(!showForcePassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-neon transition-colors"
                    tabIndex={-1}
                  >
                    {showForcePassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>
                {forcePasswordForm.newPassword.length > 0 && (() => {
                  const pwd = forcePasswordForm.newPassword;
                  const letters = (pwd.match(/[a-zA-Z]/g) || []).length;
                  const numbers = (pwd.match(/[0-9]/g) || []).length;
                  const isValid = pwd.length === 10 && letters === 6 && numbers === 4;
                  const hasLength = pwd.length === 10;
                  const hasLetters = letters === 6;
                  const hasNumbers = numbers === 4;
                  const progress = [hasLength, hasLetters, hasNumbers].filter(Boolean).length;
                  const color = isValid ? "text-green-400 border-green-400/30 bg-green-400/10" : progress >= 2 ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" : "text-red-400 border-red-400/30 bg-red-400/10";
                  const semaforo = isValid ? "🟢" : progress >= 2 ? "🟡" : "🔴";
                  return (
                    <div className={`mt-2 p-3 rounded-xl border text-xs font-medium ${color} space-y-1`}>
                      <div className="flex items-center justify-between font-bold text-sm">
                        <span>{semaforo} {isValid ? "Contraseña válida" : progress >= 2 ? "Casi lista..." : "Formato incorrecto"}</span>
                      </div>
                      <div className="text-slate-400 font-normal pt-1">
                        Formato requerido: <strong>exactamente 10 caracteres → 6 letras + 4 números</strong>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <span className={hasLength ? "text-green-400" : "text-slate-500"}>✓ 10 chars ({pwd.length}/10)</span>
                        <span className={hasLetters ? "text-green-400" : "text-slate-500"}>✓ 6 letras ({letters}/6)</span>
                        <span className={hasNumbers ? "text-green-400" : "text-slate-500"}>✓ 4 números ({numbers}/4)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                type="submit"
                className="w-full bg-brand-neon hover:bg-green-400 text-brand-blue-900 font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(46,204,113,0.3)] hover:shadow-[0_0_25px_rgba(46,204,113,0.5)]"
              >
                Guardar y Entrar
              </button>
            </form>
          ) : isRecoverPasswordView ? (
            <div className="animate-fade-in">
              {!isRecoverySent ? (
                <form onSubmit={handleRecoverPassword} className="space-y-5">
                  <h2 className="text-xl font-bold text-center text-white mb-4">
                    Recuperación de Acceso
                  </h2>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Cédula de Identidad
                    </label>
                    <input
                      type="text"
                      required
                      value={recoverForm.cedula}
                      onChange={(e) =>
                        setRecoverForm({
                          ...recoverForm,
                          cedula: e.target.value,
                        })
                      }
                      className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-xl p-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                      placeholder="Ej. 16482931"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-2">
                      Correo Institucional
                    </label>
                    <input
                      type="email"
                      required
                      value={recoverForm.email}
                      onChange={(e) =>
                        setRecoverForm({
                          ...recoverForm,
                          email: e.target.value,
                        })
                      }
                      className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-xl p-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                      placeholder="ejemplo@inapymi.gob.ve"
                    />
                  </div>
                  {loginError && (
                    <div className="text-red-400 text-sm text-center font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                      {loginError}
                    </div>
                  )}
                  <button
                    type="submit"
                    className="w-full bg-brand-neon hover:bg-green-400 text-brand-blue-900 font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(46,204,113,0.3)]"
                  >
                    Solicitar Restablecimiento
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsRecoverPasswordView(false)}
                    className="w-full text-slate-400 hover:text-white text-sm font-medium mt-4"
                  >
                    Volver al Inicio de Sesión
                  </button>
                </form>
              ) : (
                <div className="text-center space-y-4">
                  <div className="bg-brand-neon/10 border border-brand-neon p-6 rounded-2xl">
                    <CheckCircle2
                      className="mx-auto text-brand-neon mb-4"
                      size={40}
                    />
                    <h3 className="text-lg font-bold text-white mb-2">
                      Solicitud Enviada
                    </h3>
                    <p className="text-sm text-slate-300">
                      Se ha generado un Requerimiento automáticamente. Un
                      Técnico de IT revisará tu caso y se pondrá en contacto
                      contigo para el restablecimiento.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setIsRecoverPasswordView(false);
                      setIsRecoverySent(false);
                      setRecoverForm({ cedula: "", email: "" });
                    }}
                    className="w-full bg-brand-blue-700 hover:bg-brand-blue-600 text-white font-bold py-4 rounded-xl transition-all"
                  >
                    Volver al Inicio de Sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-5 animate-fade-in">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2">
                  Usuario o Cédula de Identidad
                </label>
                <input
                  type="text"
                  required
                  autoComplete="username"
                  value={loginForm.cedula}
                  onChange={(e) =>
                    setLoginForm({
                      ...loginForm,
                      cedula: e.target.value.toLowerCase(),
                    })
                  }
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-xl p-4 text-white focus:outline-none focus:border-brand-neon transition-colors"
                  placeholder="Ej. administrador o 16482931"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-2 flex justify-between">
                  Contraseña
                  <button
                    type="button"
                    onClick={() => setIsRecoverPasswordView(true)}
                    className="text-brand-neon hover:text-green-400"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </label>
                <div className="relative">
                  <input
                    type={showLoginPassword ? "text" : "password"}
                    required
                    autoComplete="current-password"
                    value={loginForm.password}
                    onChange={(e) =>
                      setLoginForm({ ...loginForm, password: e.target.value })
                    }
                    className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-xl p-4 pr-12 text-white focus:outline-none focus:border-brand-neon transition-colors"
                    placeholder="Ingresa tu contraseña"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword(!showLoginPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-neon transition-colors"
                    tabIndex={-1}
                  >
                    {showLoginPassword ? (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                    )}
                  </button>
                </div>

                {/* Semáforo de Contraseña + Indicador */}
                {loginForm.password.length > 0 && loginForm.cedula.toLowerCase() !== "administrador" && (() => {
                  const pwd = loginForm.password;
                  const letters = (pwd.match(/[a-zA-Z]/g) || []).length;
                  const numbers = (pwd.match(/[0-9]/g) || []).length;
                  const isValid = pwd.length === 10 && letters === 6 && numbers === 4;
                  const hasLength = pwd.length === 10;
                  const hasLetters = letters === 6;
                  const hasNumbers = numbers === 4;
                  const progress = [hasLength, hasLetters, hasNumbers].filter(Boolean).length;
                  const color = isValid ? "text-green-400 border-green-400/30 bg-green-400/10" : progress >= 2 ? "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" : "text-red-400 border-red-400/30 bg-red-400/10";
                  const semaforo = isValid ? "🟢" : progress >= 2 ? "🟡" : "🔴";
                  return (
                    <div className={`mt-2 p-3 rounded-xl border text-xs font-medium ${color} space-y-1`}>
                      <div className="flex items-center justify-between font-bold text-sm">
                        <span>{semaforo} {isValid ? "Contraseña válida" : progress >= 2 ? "Casi lista..." : "Formato incorrecto"}</span>
                      </div>
                      <div className="text-slate-400 font-normal pt-1">
                        Formato requerido: <strong>exactamente 10 caracteres → 6 letras + 4 números</strong>
                      </div>
                      <div className="flex gap-3 pt-1">
                        <span className={hasLength ? "text-green-400" : "text-slate-500"}>✓ 10 caracteres ({pwd.length}/10)</span>
                        <span className={hasLetters ? "text-green-400" : "text-slate-500"}>✓ 6 letras ({letters}/6)</span>
                        <span className={hasNumbers ? "text-green-400" : "text-slate-500"}>✓ 4 números ({numbers}/4)</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
              {loginError && (
                <div className="text-red-400 text-sm text-center font-medium bg-red-400/10 p-3 rounded-lg border border-red-400/20">
                  {loginError}
                </div>
              )}
              <button
                type="submit"
                className="w-full bg-brand-neon hover:bg-green-400 text-brand-blue-900 font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(46,204,113,0.3)] hover:shadow-[0_0_25px_rgba(46,204,113,0.5)]"
              >
                Iniciar Sesión
              </button>
              {deferredPrompt && (
                <button
                  type="button"
                  onClick={handleInstallClick}
                  className="w-full mt-4 bg-brand-blue-700 hover:bg-brand-blue-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-brand-neon/30"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                    <polyline points="7 10 12 15 17 10"></polyline>
                    <line x1="12" y1="15" x2="12" y2="3"></line>
                  </svg>
                  Instalar Programa
                </button>
              )}
            </form>
          )}
        </div>
      </div>
    );
  }

  const closedStatuses = [
    "Cerrado (Conforme)",
    "Cerrado (No Conforme)",
    "Cancelado",
  ];
  const activeTickets = tickets.filter(
    (t) => !closedStatuses.includes(t.status),
  );

  const closedTickets = tickets.filter((t) =>
    closedStatuses.includes(t.status)
  );

  const calculateResponseTime = (created: string, updated: string) => {
    if (!updated) return "N/A";
    const start = new Date(created);
    const end = new Date(updated);
    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "0 min";
    
    const diffMins = Math.floor(diffMs / 60000);
    const hours = Math.floor(diffMins / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} d, ${hours % 24} h`;
    if (hours > 0) return `${hours} h, ${diffMins % 60} m`;
    return `${diffMins} min`;
  };


  return (
    <div className="min-h-screen flex flex-col bg-brand-blue-900 text-slate-100 overflow-hidden">

      <div className="flex-1 flex overflow-hidden">
      {/* Sidebar Navigation */}
      <aside className="w-20 lg:w-72 border-r border-brand-blue-700 border-t bg-brand-blue-900 flex flex-col justify-between transition-all duration-300 z-20 shadow-2xl">
        <div>
          <div className="flex flex-col items-center justify-center pt-10 pb-8 border-b border-brand-blue-700 text-center px-4">
            <div className="relative mb-4">
              <div
                id="fallback-logo"
                className="w-24 h-24 bg-brand-blue-700 rounded-2xl hidden items-center justify-center shadow-inner"
              >
                <LifeBuoy size={48} className="text-brand-neon opacity-50" />
              </div>
            </div>
            <h1 className="flex flex-col items-start lg:items-center text-center">
              <div className="text-6xl font-black mb-1 flex items-center justify-center space-x-3 tracking-[0.2em]">
                <span className="sat-letter-1">S</span>
                <span className="sat-letter-2">A</span>
                <span className="sat-letter-3">T</span>
              </div>
              <span className="text-[10px] font-bold text-slate-400 tracking-[0.2em] mb-1">
                SISTEMA DE ASISTENCIA TECNOLOGICA
              </span>
            </h1>
          </div>
          <nav className="mt-8 space-y-2 px-3">
            {[
              {
                id: "dashboard",
                icon: LayoutDashboard,
                label: "Bandeja Principal",
                roles: ["Super Admin", "Técnico IT", "Solicitante"],
              },
              {
                id: "history",
                icon: History,
                label: currentUser?.role === "Super Admin" ? "Auditoría" : currentUser?.role === "Técnico IT" ? "Mi Historial" : "Mis Solicitudes Anteriores",
                roles: ["Super Admin", "Técnico IT", "Solicitante"],
              },
              {
                id: "reports",
                icon: Activity,
                label: "Informes y Estadísticas",
                roles: ["Super Admin"],
              },
              {
                id: "users",
                icon: Users,
                label: "Control de Usuarios",
                roles: ["Super Admin"],
              },
              {
                id: "settings",
                icon: Settings, Bot,
                label: "Configuración Global",
                roles: ["Super Admin"],
              },
            ]
              .filter((item) => item.roles.includes(currentUser.role))
              .map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-center lg:justify-start p-3 rounded-xl transition-all duration-200 group ${
                    activeTab === item.id
                      ? "bg-brand-blue-800 text-brand-neon border border-brand-blue-700"
                      : "text-slate-400 hover:bg-brand-blue-800/50 hover:text-slate-200"
                  }`}
                >
                  <item.icon
                    size={22}
                    className={activeTab === item.id ? "text-brand-neon" : ""}
                  />
                  <span className="ml-3 font-medium hidden lg:block">
                    {item.label}
                  </span>
                </button>
              ))}
          </nav>
        </div>

        {/* User Profile Area */}
        <div className="px-3 lg:p-4 border-t border-brand-blue-700 flex flex-col gap-2 pb-6 mt-auto pt-4">
          {/* Boton descarga directa APK Android */}
          <a
            href="/SAT-App.apk"
            download="SAT-App.apk"
            className="w-full bg-brand-blue-800 hover:bg-brand-blue-700 text-brand-neon font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-brand-neon/30 text-sm glow-neon"
            title="Instalar APK Android"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="5" y="2" width="14" height="20" rx="2" ry="2"></rect>
              <line x1="12" y1="18" x2="12.01" y2="18"></line>
            </svg>
            <span className="hidden lg:inline">Instalar APK Android</span>
            <span className="lg:hidden text-xs">APK</span>
          </a>

          {/* Boton Instalar Programa PC (Siempre visible) */}
          <button
            onClick={() => {
              if (deferredPrompt) {
                handleInstallClick();
              } else {
                alert("ℹ️ El programa SAT ya está instalado en este equipo o estás accediendo desde la aplicación instalada.");
              }
            }}
            className="w-full bg-brand-blue-800 hover:bg-brand-blue-700 text-brand-neon font-bold py-2 px-3 rounded-xl transition-all flex items-center justify-center gap-2 border border-brand-neon/30 text-sm glow-neon"
            title="Instalar Programa PC"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="7 10 12 15 17 10"></polyline>
              <line x1="12" y1="15" x2="12" y2="3"></line>
            </svg>
            <span className="hidden lg:inline">Instalar Programa</span>
            <span className="lg:hidden text-xs">PC</span>
          </button>
          

          <div className="bg-brand-blue-800 rounded-2xl p-4 border border-brand-blue-700 shadow-lg text-center hidden lg:block">
            <div className="w-12 h-12 bg-brand-blue-900 rounded-full mx-auto flex items-center justify-center mb-3 shadow-inner border border-brand-blue-700">
              <Users size={20} className="text-brand-neon" />
            </div>
            <p className="text-sm font-semibold text-white truncate">
              {currentUser.fullName}
            </p>
            <p className="text-xs text-brand-neon font-medium mt-1 mb-4">
              {currentUser.role}
            </p>

            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="w-full py-2 mb-2 bg-brand-blue-900 hover:bg-brand-blue-700 border border-brand-blue-700 hover:border-brand-neon hover:text-brand-neon rounded-xl text-xs font-bold text-slate-300 transition-colors"
            >
              Cambiar Contraseña
            </button>
            <button
              onClick={handleLogout}
              className="w-full py-2 bg-brand-blue-900 hover:bg-red-500/20 border border-brand-blue-700 hover:border-red-500 hover:text-red-400 rounded-xl text-xs font-bold text-slate-400 transition-colors"
            >
              Cerrar Sesión
            </button>
          </div>

          <div className="lg:hidden flex flex-col gap-2">
            <button
              onClick={() => setIsChangePasswordModalOpen(true)}
              className="w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 group text-slate-400 hover:bg-brand-blue-800/50 hover:text-brand-neon"
              title="Cambiar Contraseña"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                <path d="m21 2-9.6 9.6" />
                <circle cx="7.5" cy="15.5" r="5.5" />
              </svg>
            </button>
            <button
              onClick={handleLogout}
              className="w-full flex items-center justify-center p-3 rounded-xl transition-all duration-200 group text-slate-400 hover:bg-brand-blue-800/50 hover:text-red-400"
              title="Cerrar Sesión"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                <polyline points="16 17 21 12 16 7"></polyline>
                <line x1="21" y1="12" x2="9" y2="12"></line>
              </svg>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-8 relative">
        {/* Ambient background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-96 bg-brand-neon/5 blur-[120px] rounded-full pointer-events-none" />

        <header className="mb-10 flex items-center justify-between relative z-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center">
              {activeTab === "dashboard" && currentTime}
              {activeTab === "users" && "Control de Usuarios"}
              {activeTab === "settings" && "Configuración Global"}
            </h1>
            <p className="text-slate-400 mt-1">
              {activeTab === "dashboard" &&
                "MONITOREO DE CASOS EN TIEMPO REAL"}
              {activeTab === "users" &&
                "Administración de roles y credenciales (Super Admin)."}
              {activeTab === "settings" && "Gestión de tipos de requerimiento."}
            </p>
          </div>
        </header>

        {activeTab === "dashboard" && (
          <div className="relative z-10 animate-fade-in">
            {currentUser.role === "Solicitante" ? (
              // =========================
              // VISTA DEL SOLICITANTE
              // =========================
              <>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Mis Requerimientos
                  </h2>
                  <button
                    onClick={() => setIsTicketModalOpen(true)}
                    className="bg-brand-neon text-brand-blue-900 font-bold py-2 px-4 rounded-lg flex items-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                  >
                    <Plus size={20} className="mr-2" /> Nuevo Requerimiento
                  </button>
                </div>
                <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-blue-900/50 text-slate-400 text-sm border-b border-brand-blue-700">
                        <th className="p-4 font-semibold">Problema</th>
                        <th className="p-4 font-semibold">Fecha</th>
                        <th className="p-4 font-semibold">Técnico Asignado</th>
                        <th className="p-4 font-semibold text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-blue-700">
                      {activeTickets.length === 0 && (
                        <tr>
                          <td
                            colSpan={4}
                            className="p-4 text-center text-slate-400"
                          >
                            No tienes requerimientos activos.
                          </td>
                        </tr>
                      )}
                      {activeTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-brand-blue-700/20 transition-colors"
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-200">
                              #{t.correlative || 0} - {t.title}
                            </div>
                            <div className="text-base font-bold text-brand-neon mt-2">
                              {t.description}
                            </div>
                            {t.imageUrl && (
                              <a href={t.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center text-xs bg-slate-700 hover:bg-slate-600 text-white px-2 py-1 rounded mt-2 transition-colors">
                                <span className="mr-1">📷</span> Ver Evidencia Adjunta
                              </a>
                            )}
                          </td>
                          <td className="p-4 text-slate-300 text-sm">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-slate-300 text-sm">
                            {t.tech ? (
                              <span className="flex items-center text-brand-neon">
                                <Users size={14} className="mr-1" />{" "}
                                {t.tech.fullName}
                              </span>
                            ) : (
                              <span className="text-slate-500 italic">
                                Por asignar...
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-right">
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-bold inline-block ${
                                t.status === "En Espera"
                                  ? "bg-orange-500/20 text-orange-400 border border-orange-500/30"
                                  : t.status === "En Proceso"
                                    ? "bg-brand-neon/20 text-brand-neon border border-brand-neon/50 glow-neon"
                                    : t.status ===
                                        "Resuelto (Esperando Conformidad)"
                                      ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/50"
                                      : t.status === "Cancelado"
                                        ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                        : "bg-slate-700 text-slate-400"
                              }`}
                            >
                              {t.status}
                            </span>
                            {t.status ===
                              "Resuelto (Esperando Conformidad)" && (
                              <div className="flex gap-2 justify-end mt-2">
                                <button
                                  onClick={() => handleConformity(t.id, true)}
                                  className="bg-brand-neon text-brand-blue-900 px-2 py-1 rounded text-xs font-bold hover:bg-green-400"
                                >
                                  ✔️ Conforme
                                </button>
                                <button
                                  onClick={() => handleConformity(t.id, false)}
                                  className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold hover:bg-red-600"
                                >
                                  ❌ No Conforme
                                </button>
                              </div>
                            )}
                            {t.status === "En Espera" && (
                              <div className="mt-3 flex justify-end border-t border-brand-blue-700 pt-3">
                                <button
                                  onClick={() => handleCancelTicket(t.id)}
                                  className="bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white border border-red-500/30 text-sm font-bold transition-all px-4 py-2 rounded-lg flex items-center gap-2"
                                  title="Cancelar Requerimiento"
                                >
                                  <XCircle size={16} />
                                  Cancelar Requerimiento
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center mt-12 mb-6">
                  <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <History size={24} className="text-brand-neon" />
                    Historial de Requerimientos
                  </h2>
                </div>
                <div className="bg-brand-blue-800/50 border border-brand-blue-700 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-brand-blue-900/50 text-slate-400 text-sm border-b border-brand-blue-700">
                        <th className="p-4 font-semibold">Problema</th>
                        <th className="p-4 font-semibold">Fecha Solicitud</th>
                        <th className="p-4 font-semibold">Técnico Asignado</th>
                        <th className="p-4 font-semibold">Tiempo Respuesta</th>
                        <th className="p-4 font-semibold text-right">Estado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-blue-700">
                      {closedTickets.length === 0 && (
                        <tr>
                          <td
                            colSpan={5}
                            className="p-4 text-center text-slate-400"
                          >
                            No hay historial de requerimientos.
                          </td>
                        </tr>
                      )}
                      {closedTickets.map((t) => (
                        <tr
                          key={t.id}
                          className="hover:bg-brand-blue-700/20 transition-colors opacity-80"
                        >
                          <td className="p-4">
                            <div className="font-bold text-slate-300">
                              #{t.correlative || 0} - {t.title}
                            </div>
                            <div className="text-sm font-bold text-brand-neon/80 mt-1">
                              {t.description}
                            </div>
                          </td>
                          <td className="p-4 text-slate-400 text-sm">
                            {new Date(t.createdAt).toLocaleDateString()}
                          </td>
                          <td className="p-4 text-slate-400 text-sm">
                            {t.tech ? (
                              <div className="flex flex-col">
                                <span className="flex items-center text-brand-neon/80">
                                  <Users size={12} className="mr-1" />
                                  {t.tech.fullName}
                                </span>
                                {t.tech.email && <span className="text-xs text-slate-500">{t.tech.email}</span>}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">No asignado</span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 text-sm">
                            <span className="flex items-center gap-1 bg-brand-blue-900 px-2 py-1 rounded inline-flex">
                              <Clock size={12} className="text-slate-500" />
                              {calculateResponseTime(t.createdAt, t.updatedAt)}
                            </span>
                          </td>
                          <td className="p-4 text-right">
                            <span
                              className={`px-2 py-1 rounded-md text-xs font-bold inline-block ${
                                t.status === "Cancelado"
                                  ? "bg-red-500/10 text-red-400 border border-red-500/20"
                                  : "bg-slate-700 text-slate-400"
                              }`}
                            >
                              {t.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              // =========================
              // VISTA DEL TÉCNICO / ADMIN
              // =========================
              <>
                {/* ESTADÍSTICAS EN TIEMPO REAL */}
                <div className="mb-8">
                  <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                    <Activity size={24} className="text-brand-neon" />
                    Rendimiento Técnico (Mes Actual)
                  </h2>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {techRanking.length === 0 && (
                      <div className="col-span-4 text-slate-400 text-sm">
                        No hay datos de casos conformes aún.
                      </div>
                    )}
                    {techRanking.map((t, i) => (
                      <DashboardCard
                        key={i}
                        title={t.name}
                        value={t.closed}
                        icon={CheckCircle2}
                        colorClass={
                          t.name === currentUser?.fullName ? "text-brand-neon" : "text-slate-300"
                        }
                        isAlert={t.name === currentUser?.fullName}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-white">
                    Bandeja Global de Requerimientos
                  </h2>
                </div>
                <div className="grid grid-cols-1 gap-4">
                  {activeTickets.length === 0 && (
                    <div className="text-center text-slate-400 py-10 bg-brand-blue-800 rounded-2xl border border-brand-blue-700">
                      No hay requerimientos activos en la bandeja.
                    </div>
                  )}
                  {activeTickets.map((t) => (
                    <div
                      key={t.id}
                      className={`bg-brand-blue-800 border border-brand-blue-700 p-5 rounded-2xl shadow-lg flex flex-col md:flex-row gap-4 items-start md:items-center justify-between`}
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              t.status === "En Espera"
                                ? "bg-orange-500 text-white shadow-[0_0_10px_rgba(249,115,22,0.5)]"
                                : t.status === "En Proceso"
                                  ? "bg-brand-neon text-brand-blue-900 shadow-[0_0_10px_rgba(57,255,20,0.5)]"
                                  : t.status === "Cancelado"
                                    ? "bg-red-500/20 text-red-400 border border-red-500/30"
                                    : "bg-slate-600 text-slate-200"
                            }`}
                          >
                            {t.status}
                          </span>
                          <span className="text-sm font-medium text-slate-300">
                            {new Date(t.createdAt).toLocaleString('es-VE', { hour12: true })}
                          </span>
                        </div>
                        <h3 className="text-lg font-bold text-white">#{t.correlative || 0} - {t.title}</h3>
                        <p className="text-lg font-bold text-brand-neon mt-2">
                          {t.description}
                        </p>
                        {t.imageUrl && (
                          <div className="mt-2">
                            <a href={t.imageUrl} target="_blank" rel="noreferrer" className="inline-flex items-center bg-blue-600 hover:bg-blue-500 px-3 py-1.5 rounded-lg text-sm font-bold text-white transition-colors shadow-sm">
                              <span className="mr-1.5">📷</span> Ver Evidencia del Requerimiento
                            </a>
                          </div>
                        )}

                        <div className="mt-3 flex gap-4 text-sm">
                          <div className="flex flex-col text-slate-300">
                            <div className="flex items-center">
                              <span className="text-slate-500 mr-1">De:</span>{" "}
                              <span className="font-black text-lg text-white">{t.user?.fullName}</span>
                            </div>
                            {t.user?.gerencia && (
                              <div className="text-base text-slate-200 mt-2 font-medium bg-brand-blue-900/50 p-2 rounded-lg border border-brand-blue-700">
                                <span className="text-brand-neon font-bold">Gerencia:</span> {t.user.gerencia}
                                {t.user?.unidad && <span> <span className="text-slate-500 mx-1">|</span> <span className="text-brand-neon font-bold">Unidad:</span> {t.user.unidad}</span>}
                              </div>
                            )}
                          </div>
                          {t.tech && (
                            <div className="flex items-center text-brand-neon">
                              <span className="text-slate-500 mr-1">
                                Atendido por:
                              </span>{" "}
                              {t.tech.fullName}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex gap-2 w-full md:w-auto mt-4 md:mt-0">
                        {t.status === "En Espera" &&
                          currentUser.role === "Super Admin" && (
                            <div className="flex gap-2 items-center">
                              <select
                                onChange={(e) =>
                                  handleAssignTicket(t.id, e.target.value)
                                }
                                className="bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-2 text-white focus:outline-none text-sm"
                                defaultValue=""
                              >
                                <option value="" disabled>
                                  Asignar a...
                                </option>
                                {users
                                  .filter(
                                    (u) =>
                                      u.role === "Técnico IT" &&
                                      u.status === "Activo",
                                  )
                                  .map((tech) => (
                                    <option key={tech.id} value={tech.id}>
                                      {tech.fullName}
                                    </option>
                                  ))}
                              </select>
                            </div>
                          )}
                        {t.status === "En Espera" &&
                          currentUser.role === "Técnico IT" && (
                            <button
                              onClick={() => handleTakeTicket(t.id)}
                              className="flex-1 md:flex-none bg-brand-neon hover:bg-green-400 text-brand-blue-900 font-bold py-2 px-6 rounded-xl transition-all shadow-[0_0_15px_rgba(46,204,113,0.3)]"
                            >
                              Tomar Caso
                            </button>
                          )}
                        {t.status === "En Proceso" &&
                          t.techId === currentUser.id && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleReleaseTicket(t.id)}
                                className="flex-1 md:flex-none bg-orange-500/20 hover:bg-orange-500/40 text-orange-400 border border-orange-500/30 hover:border-orange-500 font-bold py-2 px-4 rounded-xl transition-all uppercase"
                              >
                                LIBERAR CASO
                              </button>
                              <button
                                onClick={() => handleResolveTicket(t.id)}
                                className="flex-1 md:flex-none bg-brand-blue-700 hover:bg-brand-olive text-white font-bold py-2 px-6 rounded-xl transition-all border border-brand-blue-600 hover:border-brand-olive hover:shadow-[0_0_15px_rgba(152,251,152,0.3)]"
                              >
                                CERRAR CASO
                              </button>
                            </div>
                          )}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === "users" && (
          <div className="relative z-10 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Gestión de Usuarios y Roles
              </h2>
              <button
                onClick={() => {
                  setEditingUserId(null);
                  setUserForm({ fullName: "", cedula: "", emailPrefix: "", role: "Solicitante", password: "", gerencia: "", unidad: "" });
                  setIsUserModalOpen(true);
                }}
                className="bg-brand-neon text-brand-blue-900 font-bold py-2 px-4 rounded-lg flex items-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]"
              >
                <Plus size={20} className="mr-2" /> Nuevo Usuario
              </button>
            </div>

            {/* VISTA MÓVIL (Tarjetas) */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {users.length === 0 && (
                <div className="text-center text-slate-400 p-4">
                  Sin usuarios registrados. Crea uno nuevo.
                </div>
              )}
              {users.map((u) => (
                <div
                  key={u.id}
                  className="bg-brand-blue-800 border border-brand-blue-700 p-5 rounded-2xl shadow-lg relative"
                >
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-bold text-slate-200 text-lg">
                        {u.fullName}
                      </h3>
                      <p className="text-brand-neon text-xs font-medium">
                        C.I: {u.cedula}
                      </p>
                    </div>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                        u.role === "Super Admin"
                          ? "text-brand-neon bg-brand-neon/10 border border-brand-neon/30 glow-neon"
                          : u.role === "Técnico IT"
                            ? "text-brand-olive bg-brand-olive/10 border border-brand-olive/30"
                            : "text-slate-400 bg-slate-800 border border-slate-700"
                      }`}
                    >
                      {u.role}
                    </span>
                  </div>

                  <div className="text-sm text-slate-400 mb-4 flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    {u.email || "Sin correo asignado"}
                  </div>
                  
                  {u.gerencia && (
                    <div className="text-sm text-slate-300 mb-4 font-medium">
                      {u.gerencia} {u.unidad ? `| ${u.unidad}` : ''}
                    </div>
                  )}

                  <div className="flex justify-between items-center mt-4 pt-4 border-t border-brand-blue-700">
                    <span
                      className={`text-sm flex items-center font-bold ${u.status === "Activo" ? "text-brand-neon" : "text-slate-500"}`}
                    >
                      <div
                        className={`w-2 h-2 rounded-full mr-2 ${u.status === "Activo" ? "bg-brand-neon animate-pulse" : "bg-slate-500"}`}
                      ></div>{" "}
                      {u.status}
                    </span>
                    <div className="flex gap-5">
                      <button
                        onClick={() => {
                          setForceAdminUserId(u.id);
                          setIsForceAdminModalOpen(true);
                        }}
                        className="text-slate-400 hover:text-brand-neon transition-colors"
                        title="Forzar Cambio de Contraseña"
                      >
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="18"
                          height="18"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                          <path d="m21 2-9.6 9.6" />
                          <circle cx="7.5" cy="15.5" r="5.5" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleToggleUserStatus(u)}
                        className={`transition-colors ${u.status === "Activo" ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-green-400"}`}
                        title={
                          u.status === "Activo"
                            ? "Inhabilitar Usuario"
                            : "Habilitar Usuario"
                        }
                      >
                        <Archive size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="transition-colors text-slate-400 hover:text-red-500"
                        title="Eliminar Definitivamente"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA ESCRITORIO (Tabla) */}
            <div className="hidden md:block bg-brand-blue-800 border border-brand-blue-700 rounded-2xl overflow-x-auto shadow-xl">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-blue-900/50 text-slate-400 text-sm border-b border-brand-blue-700">
                    <th className="p-4 font-semibold">Usuario</th>
                    <th className="p-4 font-semibold">Departamento</th>
                    <th className="p-4 font-semibold">Rol</th>
                    <th className="p-4 font-semibold">Estado</th>
                    <th className="p-4 font-semibold text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-blue-700">
                  {users.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-4 text-center text-slate-400"
                      >
                        Sin usuarios registrados. Crea uno nuevo.
                      </td>
                    </tr>
                  )}
                  {users.map((u) => (
                    <tr
                      key={u.id}
                      className="hover:bg-brand-blue-700/20 transition-colors"
                    >
                      <td className="p-4">
                        <div className="font-bold text-slate-200">
                          {u.fullName}
                        </div>
                        <div className="text-xs text-brand-neon">
                          C.I: {u.cedula}
                        </div>
                      </td>
                      <td className="p-4 text-slate-300">
                        {u.gerencia ? (
                          <>
                            <div className="font-medium text-sm text-slate-200">{u.gerencia}</div>
                            {u.unidad && <div className="text-xs text-slate-400">{u.unidad}</div>}
                          </>
                        ) : (
                          <span className="text-slate-500 italic text-sm">Sin departamento</span>
                        )}
                        <div className="text-xs text-slate-500 mt-1">
                          {u.email || "Sin correo"}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded-md text-xs font-bold ${
                            u.role === "Super Admin"
                              ? "text-brand-neon border border-brand-neon glow-neon"
                              : u.role === "Técnico IT"
                                ? "text-brand-olive border border-brand-olive"
                                : "text-slate-400 border border-slate-600"
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span
                          className={`text-sm flex items-center ${u.status === "Activo" ? "text-brand-neon" : "text-slate-500"}`}
                        >
                          <div
                            className={`w-2 h-2 rounded-full mr-2 ${u.status === "Activo" ? "bg-brand-neon" : "bg-slate-500"}`}
                          ></div>{" "}
                          {u.status}
                        </span>
                      </td>
                      <td className="p-4 text-right flex justify-end gap-4">
                        <button
                          onClick={() => {
                            setEditingUserId(u.id);
                            setUserForm({
                              fullName: u.fullName,
                              cedula: u.cedula,
                              emailPrefix: u.email ? u.email.split('@')[0] : '',
                              role: u.role,
                              password: '',
                              gerencia: u.gerencia || '',
                              unidad: u.unidad || ''
                            });
                            setIsUserModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-brand-neon transition-colors"
                          title="Modificar Usuario"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
                        </button>
                        <button
                          onClick={() => {
                            setForceAdminUserId(u.id);
                            setIsForceAdminModalOpen(true);
                          }}
                          className="text-slate-400 hover:text-brand-neon transition-colors"
                          title="Forzar Cambio de Contraseña"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4" />
                            <path d="m21 2-9.6 9.6" />
                            <circle cx="7.5" cy="15.5" r="5.5" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u)}
                          className={`transition-colors ${u.status === "Activo" ? "text-slate-400 hover:text-red-400" : "text-slate-400 hover:text-green-400"}`}
                          title={
                            u.status === "Activo"
                              ? "Inhabilitar Usuario"
                              : "Habilitar Usuario"
                          }
                        >
                          <Archive size={18} />
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u)}
                          className="transition-colors text-slate-400 hover:text-red-500"
                          title="Eliminar Definitivamente"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "reports" && reportData && (
          <div className="relative z-10 animate-fade-in printable-report">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 no-print">
              <h2 className="text-2xl font-bold text-white">
                Informes y Estadísticas
              </h2>
              <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-2 text-white focus:outline-none"
                />
                <button
                  onClick={() => window.print()}
                  className="bg-brand-neon text-brand-blue-900 font-bold py-2 px-4 rounded-lg flex items-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                >
                  Imprimir Informe
                </button>
              </div>
            </div>

            <div className="print-header hidden">
              <h1 className="text-2xl font-bold text-brand-blue-900 mb-2">
                Informe de Gestión SAT
              </h1>
              <p className="text-slate-600 mb-6">Periodo: {selectedMonth}</p>
            </div>

            <h3 className="text-xl font-bold text-white mb-4 mt-2 section-title">
              Métricas Globales
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
              <DashboardCard
                title="Total Generados"
                value={reportData.globalStats.total}
                icon={Activity}
                colorClass="text-white"
              />
              <DashboardCard
                title="Cerrados (Conformes)"
                value={reportData.globalStats.conformes}
                icon={CheckCircle2}
                colorClass="text-brand-neon"
                isAlert
              />
              <DashboardCard
                title="No Conformes"
                value={reportData.globalStats.noConformes}
                icon={X}
                colorClass="text-red-400"
              />
              <DashboardCard
                title="En Espera / Proceso"
                value={reportData.globalStats.pendientes}
                icon={Clock}
                colorClass="text-orange-400"
              />
            </div>

            <h3 className="text-xl font-bold text-white mb-4 section-title">
              Rendimiento Individual (Técnicos)
            </h3>

            {/* VISTA MÓVIL (Tarjetas) */}
            <div className="grid grid-cols-1 gap-4 md:hidden no-print">
              {reportData.techStats.length === 0 && (
                <div className="text-center text-slate-400 p-4 bg-brand-blue-800 rounded-2xl">
                  Sin datos para este mes.
                </div>
              )}
              {reportData.techStats.map((t: any) => (
                <div
                  key={t.id}
                  className="bg-brand-blue-800 border border-brand-blue-700 p-5 rounded-2xl shadow-lg relative"
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-200 text-lg">
                      {t.name}
                    </h3>
                    <span
                      className={`px-2 py-1 rounded-md text-[10px] font-bold ${parseFloat(t.successRate) >= 80 ? "bg-green-500/20 text-green-400" : parseFloat(t.successRate) >= 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}
                    >
                      Efectividad: {t.successRate}%
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4 border-t border-brand-blue-700 pt-4">
                    <div className="text-center">
                      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                        Asignados
                      </div>
                      <div className="text-2xl font-bold text-slate-200">
                        {t.totalAssigned}
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="text-slate-400 text-xs uppercase tracking-wider mb-1">
                        Conformes
                      </div>
                      <div className="text-2xl font-bold text-brand-neon">
                        {t.conformes}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* VISTA ESCRITORIO / IMPRESIÓN (Tabla) */}
            <div className="hidden md:block bg-brand-blue-800 border border-brand-blue-700 rounded-2xl overflow-x-auto shadow-xl printable-table">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-brand-blue-900/50 text-slate-400 text-xs md:text-sm border-b border-brand-blue-700">
                    <th className="p-2 md:p-4 font-semibold">Técnico</th>
                    <th className="p-2 md:p-4 font-semibold text-center">
                      Asignados
                    </th>
                    <th className="p-2 md:p-4 font-semibold text-center">
                      Conformes
                    </th>
                    <th className="p-2 md:p-4 font-semibold text-right">
                      Efectividad
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-blue-700">
                  {reportData.techStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={4}
                        className="p-4 text-center text-slate-400 text-sm"
                      >
                        Sin datos para este mes.
                      </td>
                    </tr>
                  )}
                  {reportData.techStats.map((t: any) => (
                    <tr
                      key={t.id}
                      className="hover:bg-brand-blue-700/20 transition-colors"
                    >
                      <td className="p-2 md:p-4 text-xs md:text-sm font-bold text-slate-200">
                        {t.name}
                      </td>
                      <td className="p-2 md:p-4 text-xs md:text-sm text-center text-slate-300">
                        {t.totalAssigned}
                      </td>
                      <td className="p-2 md:p-4 text-xs md:text-sm text-center font-bold text-brand-neon">
                        {t.conformes}
                      </td>
                      <td className="p-2 md:p-4 text-right">
                        <span
                          className={`px-2 py-1 rounded-md text-[10px] md:text-xs font-bold inline-block ${parseFloat(t.successRate) >= 80 ? "bg-green-500/20 text-green-400" : parseFloat(t.successRate) >= 50 ? "bg-yellow-500/20 text-yellow-400" : "bg-red-500/20 text-red-400"}`}
                        >
                          {t.successRate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "history" && (
          <div className="relative z-10 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                {currentUser?.role === "Super Admin" ? "Auditoría de Requerimientos" : currentUser?.role === "Técnico IT" ? "Mi Historial de Soportes" : "Mis Solicitudes Anteriores"}
              </h2>
              <div className="flex items-center space-x-4 bg-brand-blue-800 p-2 rounded-xl border border-brand-blue-700">
                <span className="text-slate-300 font-semibold">Seleccionar Mes:</span>
                <input 
                  type="month" 
                  value={historyMonth} 
                  onChange={(e) => setHistoryMonth(e.target.value)} 
                  className="bg-brand-blue-900 border border-brand-blue-600 text-white rounded p-1"
                />
              </div>
            </div>

            {currentUser?.role === "Super Admin" && historyStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-brand-blue-800 p-4 rounded-xl border border-brand-blue-700">
                  <h3 className="text-xl font-bold text-white mb-2">Estadísticas del Mes</h3>
                  <div className="text-slate-300">Total: {historyStats.globalStats.total}</div>
                  <div className="text-green-400">Conformes: {historyStats.globalStats.conformes}</div>
                  <div className="text-red-400">No Conformes: {historyStats.globalStats.noConformes}</div>
                  <div className="text-brand-neon">Pendientes: {historyStats.globalStats.pendientes}</div>
                </div>
                <div className="bg-brand-blue-800 p-4 rounded-xl border border-brand-blue-700">
                  <h3 className="text-xl font-bold text-white mb-2">Rendimiento por Técnico</h3>
                  {historyStats.techStats.map((ts: any) => (
                    <div key={ts.id} className="flex justify-between border-b border-brand-blue-700 py-1">
                      <span className="text-slate-300">{ts.name}</span>
                      <span className="text-brand-neon font-bold">{ts.conformes} conformes ({ts.successRate}%)</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl overflow-hidden shadow-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-brand-blue-900/50 text-slate-400 border-b border-brand-blue-700">
                    <th className="p-4 font-semibold">Requerimiento</th>
                    <th className="p-4 font-semibold">Solicitante</th>
                    <th className="p-4 font-semibold">Técnico</th>
                    <th className="p-4 font-semibold text-right">Estado y Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-blue-700">
                  {historyData.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-4 text-center text-slate-400">
                        No hay tickets registrados en este mes.
                      </td>
                    </tr>
                  )}
                  {historyData.map((t: any) => (
                    <tr key={t.id} className="hover:bg-brand-blue-700/20 transition-colors">
                      <td className="p-4">
                        <div className="font-bold text-slate-200">#{t.correlative || 0} - {t.title}</div>
                        <div className="text-base font-bold text-brand-neon mt-2 max-w-md">{t.description}</div>
                      </td>
                      <td className="p-4 text-slate-300">
                        <span className="font-black text-lg text-white">{t.user?.fullName}</span> <br />
                      </td>
                      <td className="p-4 text-slate-300">
                        {t.tech ? t.tech.fullName : <span className="text-slate-500 italic">No asignado</span>}
                      </td>
                      <td className="p-4 text-right">
                        <span className="bg-slate-700 text-slate-300 px-2 py-1 rounded-md text-xs font-bold inline-block mb-1">
                          {t.status}
                        </span>
                        <div className="text-sm font-medium text-slate-400 mt-1">
                          {new Date(t.createdAt).toLocaleString('es-VE', { hour12: true })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "settings" && (
          <>
          <div className="relative z-10 animate-fade-in">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-white">
                Configuración de Tipos de Requerimiento
              </h2>
              <button
                onClick={() => {
                  setEditingCategoryId(null);
                  setCategoryForm({ title: "", requiresDescription: false, requiresImage: false });
                  setIsCategoryModalOpen(true);
                }}
                className="bg-brand-neon text-brand-blue-900 font-bold py-2 px-4 rounded-lg flex items-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]"
              >
                <Plus size={20} className="mr-2" /> Nueva Categoría
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {categories.length === 0 && (
                <div className="col-span-full text-center text-slate-400 py-10 bg-brand-blue-800 rounded-2xl border border-brand-blue-700">
                  No hay tipos de requerimiento creados.
                </div>
              )}
              {categories.map((c) => (
                <div
                  key={c.id}
                  className="bg-brand-blue-800 border border-brand-blue-700 p-6 rounded-2xl shadow-xl flex flex-col items-center text-center transition-transform hover:-translate-y-1 relative group"
                >
                  <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEditCategory(c)}
                      className="text-slate-400 hover:text-brand-neon transition-colors"
                    >
                      <Edit2 size={18} />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(c.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                  <div className="w-16 h-16 rounded-full bg-brand-blue-900 border border-brand-neon flex items-center justify-center mb-4 shadow-[0_0_15px_rgba(57,255,20,0.2)]">
                    <Settings className="text-brand-neon" size={30} />
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">
                    {c.title}
                  </h3>
                  <span className="text-xs text-brand-neon font-medium px-2 py-1 bg-brand-neon/10 rounded-full border border-brand-neon/20">
                    Activa
                  </span>
                </div>
              ))}
            </div>
          </div>
        
            {/* BOT RULES SECTION */}
            <div className="flex justify-between items-center mt-12 mb-6">
              <h2 className="text-2xl font-bold text-white flex items-center">
                <Bot className="mr-3 text-brand-neon" size={28} /> Configuración del Técnico Virtual (PYMI)
              </h2>
              <button
                onClick={() => {
                  setEditingBotRuleId(null);
                  setBotRuleForm({ keywords: "", response: "", isActive: true });
                  setIsBotRuleModalOpen(true);
                }}
                className="bg-brand-neon text-brand-blue-900 font-bold py-2 px-4 rounded-lg flex items-center hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]"
              >
                <Plus size={20} className="mr-2" /> Nueva Regla de Bot
              </button>
            </div>
            <div className="bg-brand-blue-800 border border-brand-blue-700 p-6 rounded-2xl shadow-xl">
              {botRules.length === 0 ? (
                <div className="text-center text-slate-400 py-6">No hay reglas de bot configuradas. El bot responderá con su mensaje predeterminado.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-slate-300">
                    <thead className="text-xs uppercase bg-brand-blue-900 text-slate-400">
                      <tr>
                        <th className="px-6 py-3 rounded-tl-lg">Palabras Clave (Keywords)</th>
                        <th className="px-6 py-3">Respuesta del Bot</th>
                        <th className="px-6 py-3 text-center">Estado</th>
                        <th className="px-6 py-3 rounded-tr-lg text-center">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {botRules.map((rule) => (
                        <tr key={rule.id} className="border-b border-brand-blue-700 hover:bg-brand-blue-900/50 transition-colors">
                          <td className="px-6 py-4 font-medium text-white max-w-xs truncate">{rule.keywords}</td>
                          <td className="px-6 py-4 max-w-md truncate">{rule.response}</td>
                          <td className="px-6 py-4 text-center">
                            <button
                              onClick={() => handleToggleBotRule(rule)}
                              className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${rule.isActive ? 'bg-brand-neon/10 text-brand-neon border-brand-neon/30 hover:bg-brand-neon/20' : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700'}`}
                            >
                              {rule.isActive ? 'Activa' : 'Inactiva'}
                            </button>
                          </td>
                          <td className="px-6 py-4 text-center flex justify-center gap-3">
                            <button
                              onClick={() => {
                                setEditingBotRuleId(rule.id);
                                setBotRuleForm({ keywords: rule.keywords, response: rule.response, isActive: rule.isActive });
                                setIsBotRuleModalOpen(true);
                              }}
                              className="text-slate-400 hover:text-brand-neon transition-colors"
                            >
                              <Edit2 size={18} />
                            </button>
                            <button
                              onClick={() => handleDeleteBotRule(rule.id)}
                              className="text-slate-400 hover:text-red-400 transition-colors"
                            >
                              <Trash2 size={18} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
          )}
      </main>

      {/* Widget PYMI (Técnico Virtual) */}
      {currentUser && <PymiWidget currentUser={currentUser} />}

      {/* Modales Compartidos */}
      
      {/* MODAL: Regla de Bot */}
      {isBotRuleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl p-8 w-full max-w-lg shadow-2xl relative">
            <button onClick={() => setIsBotRuleModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white">
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingBotRuleId ? "Modificar Regla de Bot" : "Nueva Regla de Bot"}
            </h3>
            <form className="space-y-4" onSubmit={handleSaveBotRule}>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Palabras Clave (Keywords)</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: impresora, impresion, toner"
                  value={botRuleForm.keywords}
                  onChange={(e) => setBotRuleForm({ ...botRuleForm, keywords: e.target.value })}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                />
                <p className="text-xs text-slate-500 mt-1">Separa las palabras con comas. Si el usuario escribe alguna de ellas, el bot usará esta respuesta.</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">Respuesta del Bot</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Escribe la respuesta que dará el bot..."
                  value={botRuleForm.response}
                  onChange={(e) => setBotRuleForm({ ...botRuleForm, response: e.target.value })}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors resize-none"
                />
              </div>
              <div className="flex items-center justify-between p-4 bg-brand-blue-900/50 rounded-lg border border-brand-blue-700 mt-2">
                <div>
                  <h4 className="text-sm font-medium text-white">Regla Activa</h4>
                  <p className="text-xs text-slate-400">Si está inactiva, el bot ignorará estas palabras clave.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={botRuleForm.isActive}
                    onChange={(e) => setBotRuleForm({ ...botRuleForm, isActive: e.target.checked })}
                  />
                  <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-neon"></div>
                </label>
              </div>
              <button type="submit" className="w-full bg-brand-neon text-brand-blue-900 font-bold py-3 rounded-lg hover:scale-[1.02] transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)] mt-6">
                Guardar Regla
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nuevo Usuario */}
      {isUserModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsUserModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingUserId ? "Modificar Usuario" : "Aprovisionar Usuario"}
            </h3>
            <form className="space-y-4" onSubmit={handleSaveUser}>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  value={userForm.fullName}
                  onChange={(e) => {
                    let val = e.target.value.replace(
                      /[^a-zA-ZáéíóúÁÉÍÓÚñÑ\s]/g,
                      "",
                    );
                    val = val.replace(/\b\w/g, (l) => l.toUpperCase());
                    setUserForm({ ...userForm, fullName: val });
                  }}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                />
              </div>
              {userForm.role !== "Super Admin" && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Cédula de Identidad (Usuario de Acceso)
                    </label>
                    <input
                      type="text"
                      required
                      value={userForm.cedula}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setUserForm({ ...userForm, cedula: val });
                      }}
                      placeholder="Ej. 16482931"
                      className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Gerencia
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Gerencia General de Tecnología"
                      value={userForm.gerencia}
                      onChange={(e) => setUserForm({ ...userForm, gerencia: e.target.value })}
                      className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Unidad (Opcional)
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Unidad de Soporte Técnico"
                      value={userForm.unidad}
                      onChange={(e) => setUserForm({ ...userForm, unidad: e.target.value })}
                      className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                      Correo Electrónico Institucional
                    </label>
                    <div className="flex bg-brand-blue-900 border border-brand-blue-700 rounded-lg overflow-hidden focus-within:border-brand-neon transition-colors">
                      <input
                        type="text"
                        value={userForm.emailPrefix}
                        onChange={(e) => {
                          const val = e.target.value
                            .replace(/[^a-zA-Z]/g, "")
                            .toLowerCase();
                          setUserForm({ ...userForm, emailPrefix: val });
                        }}
                        placeholder="usuario"
                        className="w-full p-3 text-white bg-transparent focus:outline-none"
                      />
                      <span className="p-3 text-slate-400 bg-brand-blue-800 border-l border-brand-blue-700 font-medium select-none whitespace-nowrap">
                        @inapymi.gob.ve
                      </span>
                    </div>
                  </div>
                </>
              )}
              {userForm.role === "Super Admin" && (
                <div>
                  <label className="block text-sm font-medium text-slate-400 mb-1">
                    Nombre de Usuario (Para iniciar sesión)
                  </label>
                  <input
                    type="text"
                    required
                    value={userForm.cedula}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\s/g, "").toLowerCase();
                      setUserForm({ ...userForm, cedula: val });
                    }}
                    placeholder="Ej. administrador"
                    className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                  />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Rol en el Sistema
                </label>
                <select
                  value={userForm.role}
                  onChange={(e) =>
                    setUserForm({ ...userForm, role: e.target.value })
                  }
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                >
                  <option>Solicitante</option>
                  <option>Técnico IT</option>
                  <option>Super Admin</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Contraseña {editingUserId ? "(Dejar en blanco para no cambiar)" : ""}
                </label>
                <input
                  type="password"
                  value={userForm.password}
                  onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                  placeholder={editingUserId ? "Nueva contraseña..." : "Contraseña por defecto"}
                  required={!editingUserId}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                />
              </div>

              <div className="pt-4 flex gap-4">
                <button
                  type="button"
                  onClick={() => setIsUserModalOpen(false)}
                  className="flex-1 px-4 py-3 bg-brand-blue-700 hover:bg-brand-blue-600 text-white rounded-lg font-bold transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-brand-neon text-brand-blue-900 rounded-lg font-bold hover:scale-105 transition-transform shadow-[0_0_15px_rgba(57,255,20,0.3)]"
                >
                  {editingUserId ? "Guardar Cambios" : "Crear Identidad"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Nueva/Editar Categoría */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              {editingCategoryId
                ? "Editar Categoría"
                : "Nueva Categoría de Requerimiento"}
            </h3>
            <form className="space-y-4" onSubmit={handleCreateCategory}>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Título de la Categoría
                </label>
                <input
                  type="text"
                  required
                  value={categoryForm.title}
                  onChange={(e) => setCategoryForm({ ...categoryForm, title: e.target.value })}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors mb-4"
                  placeholder="Ej. Soporte General"
                />
                
                <div className="flex flex-col space-y-4">
                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                      Hacer obligatoria la descripción para el solicitante
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={categoryForm.requiresDescription || false}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, requiresDescription: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${categoryForm.requiresDescription ? 'bg-brand-neon' : 'bg-brand-blue-700'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${categoryForm.requiresDescription ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </label>

                  <label className="flex items-center justify-between cursor-pointer group">
                    <span className="text-sm font-medium text-slate-300 group-hover:text-white transition-colors">
                      Hacer obligatoria la evidencia fotográfica
                    </span>
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={categoryForm.requiresImage || false}
                        onChange={(e) =>
                          setCategoryForm({ ...categoryForm, requiresImage: e.target.checked })
                        }
                        className="sr-only"
                      />
                      <div className={`block w-14 h-8 rounded-full transition-colors duration-300 ease-in-out ${categoryForm.requiresImage ? 'bg-brand-neon' : 'bg-brand-blue-700'}`}></div>
                      <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform duration-300 ease-in-out ${categoryForm.requiresImage ? 'translate-x-6' : ''}`}></div>
                    </div>
                  </label>
                </div>
              </div>
              <button
                type="submit"
                className="w-full bg-brand-olive text-brand-blue-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all mt-4"
              >
                Registrar Tipo
              </button>
            </form>
          </div>
        </div>
      )}
      {/* TICKET CREATION MODAL */}
      {isTicketModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsTicketModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              Nuevo Requerimiento
            </h3>

            <form onSubmit={handleCreateTicket} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Tipo de Requerimiento
                </label>
                <select
                  required
                  value={ticketForm.categoryId}
                  onChange={(e) =>
                    setTicketForm({ ...ticketForm, categoryId: e.target.value })
                  }
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon mb-6"
                >
                  <option value="" disabled>
                    Seleccione una categoría...
                  </option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1 flex justify-between">
                  <span>
                    Descripción Corta 
                    {categories.find(c => c.id === ticketForm.categoryId)?.requiresDescription ? ' (Obligatoria)' : ' (Opcional)'}
                  </span>
                  <span className={ticketForm.description.split(/\s+/).filter(w => w.length > 0).length > 100 ? "text-red-500 font-bold" : "text-slate-500"}>
                    {ticketForm.description.split(/\s+/).filter(w => w.length > 0).length}/100 palabras
                  </span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Ej: El equipo no enciende desde la falla eléctrica..."
                  value={ticketForm.description}
                  onChange={(e) => {
                    const text = e.target.value;
                    if (!/^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,¿?¡!]*$/.test(text)) {
                      return; // Filtro cognitivo: bloquea garabatos
                    }
                    if (text.split(/\s+/).filter(w => w.length > 0).length <= 100) {
                      setTicketForm({ ...ticketForm, description: text });
                    }
                  }}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon mb-6 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Foto o Evidencia del Problema 
                  {categories.find(c => c.id === ticketForm.categoryId)?.requiresImage ? ' (Obligatoria)' : ' (Opcional)'}
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setTicketForm({ ...ticketForm, image: e.target.files[0] });
                    }
                  }}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-2 text-white focus:outline-none focus:border-brand-neon file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-brand-neon file:text-brand-blue-900 hover:file:bg-green-400 mb-6"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-brand-neon hover:bg-green-400 text-brand-blue-900 font-bold py-4 rounded-xl transition-all shadow-[0_0_15px_rgba(46,204,113,0.3)]"
              >
                Solicitar Asistencia
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Cambio de Contraseña de Usuario */}
      {isChangePasswordModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsChangePasswordModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              Cambiar Mi Contraseña
            </h3>
            <form className="space-y-4" onSubmit={handleChangeOwnPassword}>
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  required
                  value={changePasswordForm.newPassword}
                  onChange={(e) => {
                    setChangePasswordForm({ newPassword: e.target.value });
                  }}
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                />
              </div>
              <button
                type="submit"
                className="w-full bg-brand-neon text-brand-blue-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all mt-4"
              >
                Actualizar Contraseña
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Forzar Cambio de Contraseña Admin */}
      {isForceAdminModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-blue-900/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-brand-blue-800 border border-brand-blue-700 rounded-2xl p-8 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => {
                setIsForceAdminModalOpen(false);
                setForceAdminUserId(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
            <h3 className="text-2xl font-bold text-white mb-6">
              Forzar Nueva Contraseña
            </h3>
            <form
              className="space-y-4"
              onSubmit={handleAdminForcePasswordSubmit}
            >
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">
                  Nueva Contraseña Temporal
                </label>
                <input
                  type="text"
                  required
                  value={forceAdminForm.newPassword}
                  onChange={(e) => {
                    setForceAdminForm({ newPassword: e.target.value });
                  }}
                  placeholder="Ej. INAPYMI-1234"
                  className="w-full bg-brand-blue-900 border border-brand-blue-700 rounded-lg p-3 text-white focus:outline-none focus:border-brand-neon transition-colors"
                />
              </div>
              <p className="text-xs text-brand-neon bg-brand-neon/10 p-2 rounded border border-brand-neon/20">
                Al guardar, se requerirá que el usuario cambie esta contraseña
                inmediatamente al iniciar sesión.
              </p>
              <button
                type="submit"
                className="w-full bg-brand-neon text-brand-blue-900 font-bold py-3 rounded-lg hover:bg-opacity-90 transition-all mt-4"
              >
                Aplicar Cambio
              </button>
            </form>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}

