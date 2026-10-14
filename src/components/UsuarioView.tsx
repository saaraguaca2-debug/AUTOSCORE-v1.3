import React, { useState, useEffect } from "react";
import { 
  User, Car, Shield, QrCode, ClipboardList, Lock, Sparkles, ChevronLeft, 
  Search, Calendar, Gauge, Award, Wrench, RefreshCw, AlertCircle, HelpCircle, 
  CheckCircle, Download, Copy, Check, Phone, ExternalLink, ArrowRight, UserPlus,
  PenTool, Share2, FileText, AlertTriangle, ThumbsUp, ThumbsDown, Star, MessageSquare
} from "lucide-react";
import { Vehiculo, HistorialRow } from "../types";
import { notifyDataChanged } from "../mockData";

// Decodificador seguro para prevenir fallas fatales (URI Malformed) en navegadores móviles
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

interface UsuarioViewProps {
  appScriptUrl: string;
  initialMode?: "login" | "registro";
}

export default function UsuarioView({ appScriptUrl, initialMode = "login" }: UsuarioViewProps) {
  // Variables ocultas para Vercel / Entorno
  const adminPhoneEnv = (import.meta as any).env?.VITE_ADMIN_PHONE || (import.meta as any).env?.NEXT_PUBLIC_ADMIN_PHONE || "584121111111";

  // Estados de control de vista
  const [viewMode, setViewMode] = useState<"login" | "registro" | "garage" | "certificado">(initialMode);

  useEffect(() => {
    if (initialMode && (initialMode === "login" || initialMode === "registro")) {
      setViewMode(initialMode);
    }
  }, [initialMode]);
  const [loggedUser, setLoggedUser] = useState<{ idDueno: string; nombre: string } | null>(null);
  
  // Login / Registro Inputs
  const [idDuenoInput, setIdDuenoInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [contrasenaInput, setContrasenaInput] = useState("");
  
  // Datos y Estados del Garage
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedCar, setSelectedCar] = useState<Vehiculo | null>(null);
  const [activeCertType, setActiveCertType] = useState<"simple" | "completo">("simple");
  const [activeVehicleTab, setActiveVehicleTab] = useState<"certificado" | "firmas">("certificado");
  const [historial, setHistorial] = useState<HistorialRow[]>([]);
  
  // Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Compartir e Interacciones
  const [copiedLink, setCopiedLink] = useState(false);
  const [showFaceToFaceQR, setShowFaceToFaceQR] = useState(false);
  const [showMecanicoQR, setShowMecanicoQR] = useState(false);
  const [activeTecnicoModal, setActiveTecnicoModal] = useState<any | null>(null);

  // Estados para el Sistema de Evaluación de Talleres / Mecánicos por el Dueño
  const [evalModalItem, setEvalModalItem] = useState<{
    idHistorial: number;
    taller: string;
    nombreMecanico: string;
    codigoMecanico: string;
    trabajo: string;
    fecha: string;
    calificacionPrevia?: "Bueno" | "Malo";
    comentarioPrevio?: string;
  } | null>(null);

  const [evalTipo, setEvalTipo] = useState<"Bueno" | "Malo">("Bueno");
  const [evalComentario, setEvalComentario] = useState("");
  const [submittingEval, setSubmittingEval] = useState(false);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [evalSuccessNotice, setEvalSuccessNotice] = useState<string | null>(null);

  // Estados para el Directorio Público de Calidad Técnica de Talleres y Mecánicos
  const [showDirectorioTalleres, setShowDirectorioTalleres] = useState(false);
  const [directorioMecanicos, setDirectorioMecanicos] = useState<any[]>([]);
  const [directorioHistorial, setDirectorioHistorial] = useState<any[]>([]);
  const [loadingDirectorio, setLoadingDirectorio] = useState(false);
  const [filtroDirectorio, setFiltroDirectorio] = useState("");
  const [filtroTipoCalidad, setFiltroTipoCalidad] = useState<"todos" | "oro" | "inconformidad">("todos");
  const [tallerDetalleModal, setTallerDetalleModal] = useState<any | null>(null);

  const cargarDirectorioTalleres = async () => {
    if (!appScriptUrl) return;
    setLoadingDirectorio(true);
    try {
      const res = await fetch(`${appScriptUrl}?accion=adminData`, { mode: "cors" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          if (Array.isArray(json.mecanicos)) setDirectorioMecanicos(json.mecanicos);
          if (Array.isArray(json.historial)) setDirectorioHistorial(json.historial);
        }
      }
    } catch (e) {
      console.warn("Error al consultar directorio de talleres:", e);
    } finally {
      setLoadingDirectorio(false);
    }
  };

  // Sincronizar directorio de talleres y estadísticas de calidad en mount y eventos
  useEffect(() => {
    cargarDirectorioTalleres();
    const handleUpdate = () => {
      cargarDirectorioTalleres();
    };
    window.addEventListener("autoscore_data_updated", handleUpdate);
    return () => window.removeEventListener("autoscore_data_updated", handleUpdate);
  }, [appScriptUrl]);

  const [baseUrlOverride, setBaseUrlOverride] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("autoscore_base_url_override");
      return saved || window.location.origin;
    }
    return "";
  });

  useEffect(() => {
    localStorage.setItem("autoscore_base_url_override", baseUrlOverride);
  }, [baseUrlOverride]);

  // Persistir la placa seleccionada en localStorage para sincronización entre vistas
  useEffect(() => {
    if (selectedCar && selectedCar.placa) {
      localStorage.setItem("autoscore_last_selected_placa", selectedCar.placa);
    }
  }, [selectedCar]);

  // Registro de vehículo
  const [mostrarFormCar, setMostrarFormCar] = useState(false);
  const [newPlaca, setNewPlaca] = useState("");
  const [newMarca, setNewMarca] = useState("");
  const [newModelo, setNewModelo] = useState("");
  const [newAnio, setNewAnio] = useState("");
  const [registrandoCar, setRegistrandoCar] = useState(false);

  // ACCESO PÚBLICO POR ENLACE O QR ESCANEADO (Bypass al cargar)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPlaca = params.get("placa");
    const urlTipo = params.get("tipoCertificado");
    const urlTab = params.get("tab");

    if (urlTab === "firmas") {
      setActiveVehicleTab("firmas");
    }

    if (urlPlaca) {
      const tipoC = urlTipo === "completo" ? "completo" : "simple";
      cargarCertificadoPublico(urlPlaca, tipoC);
    }
  }, []);

  const cargarCertificadoPublico = async (placa: string, tipo: "simple" | "completo") => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(window.location.search);
      const urlApi = params.get("api");
      const apiUr = urlApi ? safeDecodeURIComponent(urlApi) : appScriptUrl;

      if (!apiUr) {
        throw new Error("Debe configurar la URL de la base de datos.");
      }
      const fetchUrl = `${apiUr}?placa=${encodeURIComponent(placa.toUpperCase())}&tipoCertificado=${tipo}`;
      const response = await fetch(fetchUrl, { method: "GET", mode: "cors" });
      if (!response.ok) throw new Error("Fallo en la comunicación con el servidor.");
      const result = await response.json();
      if (result && result.success) {
        setSelectedCar(normalizeVehiculo(result.vehiculo));
        setHistorial(normalizeHistorial(result.historial || []));
        setActiveCertType(tipo);
        setViewMode("certificado");
      } else {
        setError(result.error || "Fallo en la respuesta de la base de datos.");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Autenticación de Propietarios (Login)
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDuenoInput.trim() || !contrasenaInput.trim()) {
      setError("Introduzca su Cédula y Contraseña.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (!appScriptUrl) {
        throw new Error("La URL de la base de datos no está configurada en la barra superior.");
      }
      const url = `${appScriptUrl}?accion=login&idDueno=${encodeURIComponent(idDuenoInput.trim())}&contrasena=${encodeURIComponent(contrasenaInput.trim())}`;
      const res = await fetch(url, { method: "GET", mode: "cors" });
      if (!res.ok) throw new Error("Error de conexión con la base de datos.");
      const json = await res.json();
      if (json && json.success) {
        const userObj = json.usuario || json.user || {};
        const cleanId = userObj.idDueno || userObj.IdDueno || idDuenoInput.trim();
        const cleanNombre = userObj.nombre || userObj.Nombre || idDuenoInput.trim();
        const estado = userObj.estadoUsuario || userObj.EstadoUsuario || "Aprobado";

        if (estado === "Pendiente") {
          setError("ACCESO RESTRINGIDO: Tu cuenta está PENDIENTE DE APROBACIÓN por el Administrador.");
          setLoading(false);
          return;
        }
        if (estado === "Rechazado") {
          setError("ACCESO DENEGADO: Tu cuenta ha sido inhabilitada por el Administrador.");
          setLoading(false);
          return;
        }

        const vehUrl = `${appScriptUrl}?idDueno=${encodeURIComponent(cleanId)}`;
        const vehRes = await fetch(vehUrl, { method: "GET", mode: "cors" });
        const vehJson = await vehRes.json();
        setVehiculos((vehJson.data || []).map(normalizeVehiculo));
        setLoggedUser({
          idDueno: cleanId,
          nombre: cleanNombre
        });
        setViewMode("garage");
      } else {
        setError(json.error || "Credenciales incorrectas en la base de datos.");
      }
    } catch (err: any) {
      setError(err.message || "Fallo la comunicación con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Registro de Propietarios (Nuevo Cliente - requiere aprobación del Admin)
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDuenoInput.trim() || !nombreInput.trim() || !contrasenaInput.trim()) {
      setError("Por favor complete todos los datos requeridos.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const cleanId = idDuenoInput.trim();
    const cleanNombre = nombreInput.trim();

    try {
      if (!appScriptUrl) {
        throw new Error("La URL de la base de datos no está configurada en la barra superior.");
      }
      const payload = {
        accion: "registroUsuario",
        idDueno: cleanId,
        nombre: cleanNombre,
        contrasena: contrasenaInput.trim()
      };

      const res = await fetch(appScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error("Fallo al enviar datos.");
      const json = await res.json();
      if (json && json.success) {
        notifyDataChanged();
        setSuccessMsg("¡Registro guardado con éxito! Tu cuenta está PENDIENTE DE APROBACIÓN por el Administrador antes de ingresar.");
        setViewMode("login");
        setNombreInput("");
        setContrasenaInput("");
      } else {
        setError(json.error || "Error al procesar el registro en la base de datos.");
      }
    } catch (err: any) {
      setError(err.message || "Error al conectar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar Certificado desde el Garage
  const handleVerCertificado = async (veh: Vehiculo, tipo: "simple" | "completo") => {
    setLoading(true);
    setError(null);
    setShowFaceToFaceQR(false);
    setActiveCertType(tipo);
    setActiveVehicleTab("certificado");

    try {
      if (!appScriptUrl) throw new Error("URL de la base de datos no configurada.");
      const fetchUrl = `${appScriptUrl}?placa=${encodeURIComponent(veh.placa)}&tipoCertificado=${tipo}`;
      const response = await fetch(fetchUrl, { method: "GET", mode: "cors" });
      if (!response.ok) throw new Error("Error en red.");
      const result = await response.json();
      if (result && result.success) {
        setSelectedCar(normalizeVehiculo(result.vehiculo));
        setHistorial(normalizeHistorial(result.historial || []));
        setViewMode("certificado");
      } else {
        setError(result.error || "No se encontró el certificado en la base de datos.");
      }
    } catch (err: any) {
      setError(err.message || "Error al sincronizar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Cargar Registros de Firmas Técnicas directamente desde el Garage
  const handleVerRegistrosFirmas = async (veh: Vehiculo) => {
    setLoading(true);
    setError(null);
    setShowFaceToFaceQR(false);
    setActiveCertType("completo");
    setActiveVehicleTab("firmas");

    try {
      if (!appScriptUrl) throw new Error("URL de la base de datos no configurada.");
      const fetchUrl = `${appScriptUrl}?placa=${encodeURIComponent(veh.placa)}&tipoCertificado=completo`;
      const response = await fetch(fetchUrl, { method: "GET", mode: "cors" });
      if (!response.ok) throw new Error("Error en red.");
      const result = await response.json();
      if (result && result.success) {
        setSelectedCar(normalizeVehiculo(result.vehiculo));
        setHistorial(normalizeHistorial(result.historial || []));
        setViewMode("certificado");
      } else {
        setError(result.error || "No se encontraron registros de firmas para este vehículo.");
      }
    } catch (err: any) {
      setError(err.message || "Error al sincronizar con la base de datos.");
    } finally {
      setLoading(false);
    }
  };

  // Registrar Vehículo (Clientes homologan su carro)
  const handleRegistrarVehiculoForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedUser) return;
    if (!newPlaca.trim() || !newMarca.trim() || !newModelo.trim() || !newAnio.trim()) {
      setError("Todos los datos son obligatorios.");
      return;
    }

    setRegistrandoCar(true);
    setError(null);

    const anioNum = Number(newAnio);
    if (isNaN(anioNum) || anioNum < 1950 || anioNum > 2027) {
      setError("Por favor, ingrese un año de fabricación válido.");
      setRegistrandoCar(false);
      return;
    }

    // Algoritmo de Score Base por Antigüedad
    const antiguedad = Math.max(0, new Date().getFullYear() - anioNum);
    const scoreBaseCalculado = Math.max(50, Math.min(100, 100 - (antiguedad * 1.5)));

    const nuevoVehiculo: Vehiculo = {
      placa: newPlaca.trim().toUpperCase(),
      marca: newMarca.trim(),
      modelo: newModelo.trim(),
      anio: anioNum,
      idDueno: loggedUser.idDueno,
      score: Math.round(scoreBaseCalculado),
      estadoCertificado: "Activo"
    };

    try {
      if (!appScriptUrl) throw new Error("URL de la base de datos no configurada.");
      const payload = {
        accion: "registrarVehiculo",
        ...nuevoVehiculo
      };
      const res = await fetch(appScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error("Fallo en la comunicación con el servidor.");
      const json = await res.json();
      if (json && json.success) {
        setVehiculos((prev) => [...prev, nuevoVehiculo]);
        setMostrarFormCar(false);
        setNewPlaca("");
        setNewMarca("");
        setNewModelo("");
        setNewAnio("");
      } else {
        setError(json.error || "No se pudo registrar en la base de datos.");
      }
    } catch (err: any) {
      setError(err.message || "Fallo la sincronización con la base de datos.");
    } finally {
      setRegistrandoCar(false);
    }
  };

  const handleBackToGarage = () => {
    // Si entramos con un enlace público y no estamos logeados, limpiamos y vamos a login
    if (!loggedUser) {
      // Limpiar query params de la URL limpiamente para refrescar la vista
      const cleanUrl = window.location.origin + window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
      setViewMode("login");
      setSelectedCar(null);
    } else {
      setViewMode("garage");
      setSelectedCar(null);
    }
  };

  // Limpiar base URL de cualquier query string (?placa=...) o barra diagonal para evitar duplicación de parámetros o URLs rotas
  const getCleanBaseAndPath = () => {
    const rawBase = baseUrlOverride || window.location.origin;
    // Eliminar parámetros de búsqueda que puedan haberse copiado por accidente (ej. ?placa=AB123CD)
    let base = rawBase.split("?")[0];
    // Quitar barras diagonales al final de la URL base
    while (base.endsWith("/")) {
      base = base.slice(0, -1);
    }
    let path = window.location.pathname;
    if (!path.startsWith("/")) {
      path = "/" + path;
    }
    return `${base}${path}`;
  };

  // Obtener Enlace Digital de Certificado Completo
  const getPublicShareUrl = () => {
    if (!selectedCar) return "";
    const basePath = getCleanBaseAndPath();
    let path = `${basePath}?placa=${selectedCar.placa}&tipoCertificado=completo`;
    if (appScriptUrl) {
      path += `&api=${encodeURIComponent(appScriptUrl)}`;
    }
    return path;
  };

  // Copiar Enlace Digital para WhatsApp o Marketplace
  const copyPublicLink = () => {
    const path = getPublicShareUrl();
    if (!path) return;
    navigator.clipboard.writeText(path);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Formatear teléfono a formato internacional WhatsApp para evitar fallas
  const formatWhatsAppNumber = (phone: string): string => {
    let cleaned = String(phone).replace(/[^0-9]/g, "");
    if (!cleaned) return "";
    
    // Si empieza con 0, quitarlo (ej: 04141234567 -> 4141234567)
    if (cleaned.startsWith("0")) {
      cleaned = cleaned.substring(1);
    }
    
    // Si ya empieza con 58 (código país de Venezuela) y tiene 12 dígitos, es perfecto
    if (cleaned.startsWith("58") && cleaned.length === 12) {
      return cleaned;
    }
    
    // Autocompletar código de país de Venezuela (58) si no lo tiene y empieza con prefijos comunes
    const prefijosComunes = ["414", "424", "412", "416", "426"];
    const startsWithPrefijo = prefijosComunes.some(p => cleaned.startsWith(p));
    
    if (startsWithPrefijo) {
      if (cleaned.length === 10 || cleaned.length === 9) {
        cleaned = "58" + cleaned;
      }
    }
    
    // Si la longitud es 10 y no empieza con 58 (por ejemplo, 4141234567), anteponer 58
    if (cleaned.length === 10 && !cleaned.startsWith("58")) {
      cleaned = "58" + cleaned;
    }
    
    return cleaned;
  };

  // Obtener de forma ultra robusta el teléfono de un mecánico cruzando todas las fuentes y nombres de columna posibles
  // Obtener de forma ultra robusta el teléfono de un mecánico buscando en todas las columnas posibles
  const getMechanicPhone = (row: any): string => {
    if (!row) return "";
    
    const keys = [
      "telefonoMecanico", "telefono", "telefono_mecanico", "telefonoMec", "telefono_mec",
      "teléfono", "Teléfono", "Telefono", "TELEFONO", "TELÉFONO", "tel", "phone",
      "wassap", "Wassap", "WASSAP", "whatsapp", "WhatsApp", "WHATSAPP", "wasa", "Wasa",
      "celular", "Celular", "cel", "Cel", "contacto", "Contacto", "movil", "Movil", "móvil", "Móvil"
    ];
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
        return String(row[key]).trim();
      }
    }
    
    return "";
  };

  // Guardar Evaluación del Dueño hacia un Servicio de Taller/Mecánico (Bueno o Malo + Experiencia)
  const handleGuardarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!evalModalItem || !selectedCar) return;

    if (evalTipo === "Malo" && !evalComentario.trim()) {
      setEvalError("Por favor describe el motivo de tu evaluación negativa para auditar la calidad técnica del taller.");
      return;
    }

    setSubmittingEval(true);
    setEvalError(null);

    const targetId = evalModalItem.idHistorial;
    const finalTipo = evalTipo;
    const finalCom = evalComentario.trim();
    const fechaHoy = new Date().toISOString().split("T")[0];

    // 1. Actualización optimista inmediata en el estado local de la interfaz
    setHistorial(prev => prev.map(item => {
      if (item.idHistorial === targetId) {
        return {
          ...item,
          evaluacion: finalTipo,
          comentarioEvaluacion: finalCom,
          fechaEvaluacion: fechaHoy
        };
      }
      return item;
    }));

    // 2. Guardar en localStorage para persistencia instantánea y offline
    try {
      localStorage.setItem(`autoscore_eval_${targetId}`, JSON.stringify({
        idHistorial: targetId,
        evaluacion: finalTipo,
        comentarioEvaluacion: finalCom,
        fechaEvaluacion: fechaHoy
      }));
    } catch {
      // Ignorar errores de quota en localStorage
    }

    // 3. Enviar a Google Apps Script
    try {
      if (appScriptUrl) {
        const payload = {
          accion: "evaluarServicio",
          idHistorial: targetId,
          evaluacion: finalTipo,
          comentario: finalCom,
          placa: selectedCar.placa
        };

        await fetch(appScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(payload)
        });
      }

      setEvalSuccessNotice(`¡Evaluación ${finalTipo === "Bueno" ? "positiva 👍" : "negativa 👎"} guardada exitosamente!`);
      setTimeout(() => setEvalSuccessNotice(null), 3500);
      setEvalModalItem(null);
      setEvalComentario("");
      notifyDataChanged();
    } catch (err: any) {
      console.warn("Fallo al enviar evaluación a la base de datos:", err);
      setEvalModalItem(null);
      setEvalSuccessNotice("Evaluación guardada en tu dispositivo.");
      setTimeout(() => setEvalSuccessNotice(null), 3000);
    } finally {
      setSubmittingEval(false);
    }
  };

  // Obtener la suma acumulada de calificaciones (Buenas, Malas y Total) de un taller o mecánico
  const getMecanicoStats = (codigoMecanico?: string, taller?: string) => {
    const codUpper = (codigoMecanico || "").trim().toUpperCase();
    const tallerNorm = (taller || "").trim().toLowerCase();

    // 1. Estadísticas consolidadas desde la base de datos oficial
    const found = directorioMecanicos.find((m: any) => {
      const mCod = (m.codigoMecanico || "").trim().toUpperCase();
      const mTaller = (m.taller || "").trim().toLowerCase();
      return (codUpper && mCod === codUpper) || (tallerNorm && mTaller === tallerNorm);
    });

    let basePos = found ? Number(found.totalPositivas || 0) : 0;
    let baseNeg = found ? Number(found.totalNegativas || 0) : 0;

    // 2. Sumar en vivo con el historial actual y directorioHistorial (incluyendo calificaciones optimistas en sesión)
    const todosServicios = [...historial, ...directorioHistorial];
    const idsVistos = new Set<number>();
    let conteoPos = 0;
    let conteoNeg = 0;

    todosServicios.forEach((h: any) => {
      if (!h || !h.idHistorial || idsVistos.has(h.idHistorial)) return;
      idsVistos.add(h.idHistorial);
      const matchCod = codUpper && (h.codigoMecanico || "").trim().toUpperCase() === codUpper;
      const matchTaller = tallerNorm && (h.taller || "").trim().toLowerCase() === tallerNorm;
      if (matchCod || matchTaller) {
        const ev = (h.evaluacion || "").trim();
        if (ev === "Bueno") conteoPos++;
        else if (ev === "Malo") conteoNeg++;
      }
    });

    const finalPos = Math.max(basePos, conteoPos);
    const finalNeg = Math.max(baseNeg, conteoNeg);
    const total = finalPos + finalNeg;
    const porcentaje = total > 0 ? Math.round((finalPos / total) * 100) : 100;

    return { pos: finalPos, neg: finalNeg, total, porcentaje };
  };

  // Renderizar bloque de Evaluación y Calidad Técnica de un servicio
  const renderEvaluacionServicio = (row: HistorialRow, tallerReal: string, nombreMec: string) => {
    const isCarOwner = !!(loggedUser && selectedCar && String(loggedUser.idDueno).trim().toLowerCase() === String(selectedCar.idDueno).trim().toLowerCase());
    const stats = getMecanicoStats(row.codigoMecanico, tallerReal);

    if (row.evaluacion) {
      const esBueno = row.evaluacion === "Bueno";
      return (
        <div className={`mt-2 p-2.5 rounded-xl border flex flex-col gap-1.5 transition-all ${
          esBueno
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-300"
            : "bg-red-500/10 border-red-500/25 text-red-300"
        }`}>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-xs font-bold font-display flex-wrap">
              <span className="text-base">{esBueno ? "👍" : "👎"}</span>
              <span className={esBueno ? "text-emerald-400 font-extrabold" : "text-red-400 font-extrabold"}>
                {esBueno ? "Servicio Calificado Positivo por el Dueño" : "Reporte de Inconformidad Técnica del Dueño"}
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                esBueno
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : "bg-red-500/20 text-red-300 border-red-500/30"
              }`}>
                {esBueno ? `👍 Suma acumulada: ${stats.pos} buenas` : `👎 Suma acumulada: ${stats.neg} reportes`}
              </span>
            </div>
            {isCarOwner && (
              <button
                type="button"
                onClick={() => {
                  setEvalModalItem({
                    idHistorial: row.idHistorial,
                    taller: tallerReal,
                    nombreMecanico: nombreMec,
                    codigoMecanico: row.codigoMecanico,
                    trabajo: row.trabajoRealizado,
                    fecha: row.fecha,
                    calificacionPrevia: row.evaluacion,
                    comentarioPrevio: row.comentarioEvaluacion
                  });
                  setEvalTipo(row.evaluacion || "Bueno");
                  setEvalComentario(row.comentarioEvaluacion || "");
                  setEvalError(null);
                }}
                className="text-[9.5px] font-bold text-slate-400 hover:text-white px-2 py-0.5 rounded bg-white/5 border border-white/10 hover:border-white/20 transition-colors cursor-pointer"
              >
                Editar reseña ✏️
              </button>
            )}
          </div>
          {row.comentarioEvaluacion ? (
            <p className="text-[11px] text-slate-200 bg-black/40 p-2 rounded-lg border border-white/5 font-sans leading-relaxed">
              "{row.comentarioEvaluacion}"
            </p>
          ) : !esBueno ? (
            <p className="text-[10px] text-slate-400 italic">
              El propietario reportó fallas técnicas o desacuerdo con esta reparación.
            </p>
          ) : null}
        </div>
      );
    }

    if (isCarOwner) {
      return (
        <div className="mt-2 p-2.5 rounded-xl bg-slate-900/60 border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
          <div className="min-w-0">
            <span className="text-[11px] font-bold text-slate-200 block">
              ¿Cómo fue la calidad técnica de este servicio?
            </span>
            <span className="text-[10px] text-slate-400 block mt-0.5">
              Califica con Bueno o Malo para ayudar a la comunidad a determinar la reputación del taller.
            </span>
            <div className="flex items-center gap-2 mt-1 text-[9.5px] font-mono text-slate-400">
              <span>Suma total de calificaciones del taller:</span>
              <span className="text-emerald-400 font-bold">👍 {stats.pos}</span>
              <span>·</span>
              <span className="text-red-400 font-bold">👎 {stats.neg}</span>
              <span>·</span>
              <span className="text-amber-400 font-bold">{stats.porcentaje}% Calidad</span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                setEvalModalItem({
                  idHistorial: row.idHistorial,
                  taller: tallerReal,
                  nombreMecanico: nombreMec,
                  codigoMecanico: row.codigoMecanico,
                  trabajo: row.trabajoRealizado,
                  fecha: row.fecha
                });
                setEvalTipo("Bueno");
                setEvalComentario("");
                setEvalError(null);
              }}
              className="text-xs font-bold bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title={`Suma de calificaciones buenas acumuladas por este taller: ${stats.pos}`}
            >
              <span>👍</span>
              <span>Bueno</span>
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-[10px] font-black text-emerald-300 group-hover:bg-emerald-500/30">
                {stats.pos}
              </span>
            </button>
            <button
              type="button"
              onClick={() => {
                setEvalModalItem({
                  idHistorial: row.idHistorial,
                  taller: tallerReal,
                  nombreMecanico: nombreMec,
                  codigoMecanico: row.codigoMecanico,
                  trabajo: row.trabajoRealizado,
                  fecha: row.fecha
                });
                setEvalTipo("Malo");
                setEvalComentario("");
                setEvalError(null);
              }}
              className="text-xs font-bold bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer shadow-sm group"
              title={`Suma de quejas y reportes negativos acumulados por este taller: ${stats.neg}`}
            >
              <span>👎</span>
              <span>Malo</span>
              <span className="px-1.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-[10px] font-black text-red-300 group-hover:bg-red-500/30">
                {stats.neg}
              </span>
            </button>
          </div>
        </div>
      );
    }

    return null;
  };

  // Normalizar de forma ultra robusta los datos del vehículo para reflejar con 100% de exactitud el Score y datos de la base de datos
  const normalizeVehiculo = (rawCar: any): Vehiculo => {
    if (!rawCar || typeof rawCar !== "object") {
      return {
        placa: "",
        marca: "",
        modelo: "",
        anio: new Date().getFullYear(),
        idDueno: "",
        score: 90,
        estadoCertificado: "Activo"
      };
    }

    // 1. Extraer score con tolerancia total a nombres de columna y formatos en la Base de Datos
    let parsedScore: number | null = null;
    const scoreKeys = [
      "score", "Score", "SCORE", "puntaje", "Puntaje", "PUNTAJE", 
      "puntos", "Puntos", "scoreMecanico", "ScoreMecanico", "calificacion"
    ];
    
    for (const k of scoreKeys) {
      if (rawCar[k] !== undefined && rawCar[k] !== null && String(rawCar[k]).trim() !== "") {
        const cleanNum = Number(String(rawCar[k]).replace(/[^0-9.]/g, ""));
        if (!isNaN(cleanNum)) {
          parsedScore = cleanNum;
          break;
        }
      }
    }

    // Priorizar score original de la base de datos si viene en scoreBase
    if (parsedScore === null && rawCar.scoreBase !== undefined && rawCar.scoreBase !== null) {
      const cleanNum = Number(String(rawCar.scoreBase).replace(/[^0-9.]/g, ""));
      if (!isNaN(cleanNum)) parsedScore = cleanNum;
    }

    const cleanScore = parsedScore !== null ? Math.max(0, Math.min(100, Math.round(parsedScore))) : 90;

    // 2. Extraer año
    let cleanAnio = Number(rawCar.anio || rawCar.Anio || rawCar.año || rawCar.Año || 0);
    if (isNaN(cleanAnio) || cleanAnio < 1900) {
      cleanAnio = new Date().getFullYear();
    }

    // 3. Extraer estado del certificado
    const rawEstado = rawCar.estadoCertificado || rawCar.EstadoCertificado || rawCar.estado || rawCar.Estado || "Activo";
    const cleanEstado: "Activo" | "Vencido" = String(rawEstado).trim().toLowerCase() === "vencido" ? "Vencido" : "Activo";

    return {
      placa: String(rawCar.placa || rawCar.Placa || "").trim().toUpperCase(),
      marca: String(rawCar.marca || rawCar.Marca || "").trim(),
      modelo: String(rawCar.modelo || rawCar.Modelo || "").trim(),
      anio: cleanAnio,
      idDueno: String(rawCar.idDueno || rawCar.IdDueno || "").trim(),
      score: cleanScore,
      estadoCertificado: cleanEstado
    };
  };

  // Normalizar de forma ultra robusta los registros de historial para que sus campos siempre coincidan con las expectativas de la UI
  const normalizeHistorial = (rawHistorial: any[]): HistorialRow[] => {
    if (!Array.isArray(rawHistorial)) return [];

    const getRowVal = (rowObj: any, candidateKeys: string[]): string => {
      if (!rowObj || typeof rowObj !== "object") return "";
      
      // 1. Coincidencia exacta de propiedad
      for (const key of candidateKeys) {
        if (rowObj[key] !== undefined && rowObj[key] !== null && String(rowObj[key]).trim() !== "") {
          return String(rowObj[key]).trim();
        }
      }

      // 2. Coincidencia insensible a mayúsculas, espacios, guiones y tildes
      const cleanCandidates = candidateKeys.map(k =>
        k.toLowerCase()
         .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
         .replace(/[^a-z0-9]/g, "")
      );

      for (const actualKey of Object.keys(rowObj)) {
        const val = rowObj[actualKey];
        if (val !== undefined && val !== null && String(val).trim() !== "") {
          const cleanActualKey = actualKey.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/[^a-z0-9]/g, "");
          if (cleanCandidates.includes(cleanActualKey)) {
            return String(val).trim();
          }
        }
      }

      return "";
    };

    return rawHistorial.map((row) => {
      const normalized: any = { ...row };

      // 1. Código de mecánico
      const codeKeys = [
        "codigoMecanico", "codigomecanico", "codigo_mecanico", "codigoMec", 
        "codigo_mec", "codigo", "cod", "mecanico", "mecanicoCodigo", 
        "idMecanico", "id_mecanico", "idmecanico", "firma", "sello", "codmecanico",
        "codigodemecanico", "codigomecanicocertificado"
      ];
      const foundCode = getRowVal(row, codeKeys);
      if (foundCode) normalized.codigoMecanico = foundCode;

      // 2. Taller / Establecimiento
      const tallerKeys = [
        "taller", "nombretaller", "nombre_taller", "taller_mecanico", "establecimiento",
        "empresa", "nombre_del_taller", "tallermecanico", "tallerautorizado", "nombredeltaller",
        "talleroficial", "centroservicio", "centro_servicio", "tallerempresa"
      ];
      const foundTaller = getRowVal(row, tallerKeys);
      if (foundTaller) normalized.taller = foundTaller;

      // 3. Fecha
      const fechaKeys = [
        "fecha", "fecha_servicio", "fechaServicio", "dia", "date", "createdat",
        "fechademantenimiento", "fechadeservicio"
      ];
      const foundFecha = getRowVal(row, fechaKeys);
      if (foundFecha) normalized.fecha = foundFecha;

      // 4. Kilometraje
      const kmKeys = [
        "kilometraje", "km", "kilómetros", "kilometros", "kms", "odometro", "odómetro", "kilometrajerecord"
      ];
      const foundKm = getRowVal(row, kmKeys);
      if (foundKm) {
        normalized.kilometraje = Number(foundKm.replace(/[^0-9]/g, "")) || 0;
      }

      // 5. Trabajo realizado
      const trabajoKeys = [
        "trabajoRealizado", "trabajo_realizado", "trabajorealizado", "trabajo",
        "descripcion", "servicio", "mantenimiento", "reparacion", "detalle"
      ];
      const foundTrabajo = getRowVal(row, trabajoKeys);
      if (foundTrabajo) normalized.trabajoRealizado = foundTrabajo;

      // 6. Nombre del mecánico
      const nameKeys = [
        "nombreMecanico", "nombre_mecanico", "mecanico", "nombreMec", "tecnico", "técnico",
        "nombreTecnico", "nombre_tecnico", "mecanico_responsable", "mecanicoresponsable",
        "nombre_del_mecanico", "nombredelmecanico", "tecnico_certificador", "responsable"
      ];
      const foundName = getRowVal(row, nameKeys);
      if (foundName) normalized.nombreMecanico = foundName;

      // 7. Teléfono del mecánico
      const telKeys = [
        "telefonoMecanico", "telefono", "telefono_mecanico", "telefonoMec",
        "teléfono", "tel", "phone", "wassap", "whatsapp", "wasa", "celular", "contacto"
      ];
      const foundTel = getRowVal(row, telKeys);
      if (foundTel) normalized.telefonoMecanico = foundTel;

      // 8. Hidratar con datos de teléfono y taller si están en el registro
      if (normalized.codigoMecanico) {
        if (!normalized.telefonoMecanico) {
          const tel = getMechanicPhone(row);
          if (tel) normalized.telefonoMecanico = tel;
        }
      }

      // Valores por defecto seguros solo si el dato original venía completamente vacío
      if (!normalized.codigoMecanico) {
        normalized.codigoMecanico = row.codigoMecanico || row.codigo || "";
      }
      if (!normalized.taller) {
        normalized.taller = "Taller Autorizado AutoScore";
      }
      if (!normalized.nombreMecanico) {
        normalized.nombreMecanico = normalized.taller ? `Técnico de ${normalized.taller}` : "Mecánico Certificado";
      }
      if (!normalized.fecha) {
        normalized.fecha = row.fecha || "";
      }
      if (normalized.kilometraje === undefined || normalized.kilometraje === null) {
        normalized.kilometraje = Number(row.kilometraje) || 0;
      }
      if (!normalized.trabajoRealizado) {
        normalized.trabajoRealizado = row.trabajoRealizado || row.trabajo || "";
      }

      // 9. Evaluación del Servicio por el Dueño ("Bueno" | "Malo")
      const evalKeys = [
        "evaluacion", "calificacion", "satisfaccion", "voto", "rating", "opinion", "status_evaluacion"
      ];
      const foundEval = getRowVal(row, evalKeys);
      if (foundEval) {
        const lower = foundEval.toLowerCase();
        if (lower.includes("buen") || lower.includes("positiv") || lower === "1" || lower === "ok") {
          normalized.evaluacion = "Bueno";
        } else if (lower.includes("mal") || lower.includes("negativ") || lower === "0") {
          normalized.evaluacion = "Malo";
        }
      }

      // 10. Comentario / Experiencia reportada
      const comKeys = [
        "comentarioEvaluacion", "comentario_evaluacion", "comentario", "experiencia", "motivo", "feedback", "observacion", "queja"
      ];
      const foundCom = getRowVal(row, comKeys);
      if (foundCom) {
        normalized.comentarioEvaluacion = foundCom;
      }

      // 11. Fecha de Evaluación
      const fechaEvalKeys = [
        "fechaEvaluacion", "fecha_evaluacion", "fechaeval"
      ];
      const foundFechaEval = getRowVal(row, fechaEvalKeys);
      if (foundFechaEval) {
        normalized.fechaEvaluacion = foundFechaEval;
      }

      // 12. Fusionar con caché local de evaluaciones para persistencia inmediata y offline
      try {
        if (typeof window !== "undefined") {
          const localKey = `autoscore_eval_${normalized.idHistorial}`;
          const savedLocal = localStorage.getItem(localKey);
          if (savedLocal) {
            const parsed = JSON.parse(savedLocal);
            if (parsed && parsed.evaluacion) {
              normalized.evaluacion = parsed.evaluacion;
              if (parsed.comentarioEvaluacion) {
                normalized.comentarioEvaluacion = parsed.comentarioEvaluacion;
              }
              if (parsed.fechaEvaluacion) {
                normalized.fechaEvaluacion = parsed.fechaEvaluacion;
              }
            }
          }
        }
      } catch (e) {
        // Ignorar
      }

      return normalized as HistorialRow;
    });
  };

  const [copiedMecanicos, setCopiedMecanicos] = useState(false);

  // Copiar resumen de trazabilidad de los mecánicos firmantes
  const copyMecanicosTrazabilidad = () => {
    if (!selectedCar || historial.length === 0) return;
    
    // Obtener lista única de mecánicos/talleres del historial
    const uniqueMecsMap: { [key: string]: { taller: string, nombre: string, telefono: string, codigo: string } } = {};

    historial.forEach((row) => {
      const cod = row.codigoMecanico || "";
      if (cod && !uniqueMecsMap[cod]) {
        const tel = getMechanicPhone(row);
        uniqueMecsMap[cod] = {
          taller: row.taller && row.taller !== "Taller Independiente" ? row.taller : "Taller Autorizado",
          nombre: row.nombreMecanico || (row.taller ? `Técnico de ${row.taller}` : "Mecánico Certificado"),
          telefono: tel ? String(tel) : "",
          codigo: cod
        };
      }
    });

    const listStr = Object.values(uniqueMecsMap).map(m => {
      const waLink = m.telefono ? `https://wa.me/${formatWhatsAppNumber(m.telefono)}` : "WhatsApp no configurado";
      const maskedSeal = m.codigo ? String(m.codigo).replace(/./g, (c, i) => i === 0 ? c : "*") : "";
      return `- Taller: ${m.taller} | Mecánico: ${m.nombre} (Sello Digital: #${maskedSeal}) | WhatsApp: ${m.telefono ? `+${formatWhatsAppNumber(m.telefono)} (${waLink})` : "No registrado"}`;
    }).join("\n");

    const text = `Trazabilidad Oficial de Reparaciones Autorizadas - AutoScore v1.3\nVehículo: ${selectedCar.marca} ${selectedCar.modelo} (Placa: ${selectedCar.placa})\nScore de Salud: ${selectedCar.score}/100\n\nMecánicos Firmantes Certificados:\n${listStr}\n\nVerificado digitalmente en la plataforma AutoScore.`;
    
    navigator.clipboard.writeText(text);
    setCopiedMecanicos(true);
    setTimeout(() => setCopiedMecanicos(false), 2500);
  };

  const [usarQrUltraligero, setUsarQrUltraligero] = useState(true);

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 70) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  const getSaludMecanicaTag = (score: number) => {
    if (score >= 90) return "🟢 MANTENIMIENTO AL DÍA";
    if (score >= 70) return "🟡 MANTENIMIENTO RETRASADO";
    return "🔴 ALERTA MECÁNICA";
  };

  // URL del QR de certificación interactivo cara a cara
  const generateQRCodeUrl = () => {
    if (!selectedCar) return "";
    const basePath = getCleanBaseAndPath();
    let publicLink = `${basePath}?placa=${selectedCar.placa}&tipoCertificado=completo`;
    if (!usarQrUltraligero && appScriptUrl) {
      publicLink += `&api=${encodeURIComponent(appScriptUrl)}`;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&color=000000&ecc=H&data=${encodeURIComponent(publicLink)}`;
  };

  // URL del QR para firma de mecánicos
  const generateMecanicoQRCodeUrl = () => {
    if (!selectedCar) return "";
    const basePath = getCleanBaseAndPath();
    let mechanicLink = `${basePath}?vista=mecanico&placa=${selectedCar.placa}`;
    if (!usarQrUltraligero && appScriptUrl) {
      mechanicLink += `&api=${encodeURIComponent(appScriptUrl)}`;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&color=000000&ecc=H&data=${encodeURIComponent(mechanicLink)}`;
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 text-slate-100 flex flex-col space-y-5 animate-fade-in">
      
      {/* ---------------- VISTA A: LOGIN ---------------- */}
      {viewMode === "login" && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-4 shadow-lg">
              <User className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-extrabold text-white">Mi Garaje Virtual</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[85%] mx-auto leading-normal">
              Inspecciona tu Score, genera QRs de mantenimiento y comparte tus certificados de venta homologados.
            </p>
          </div>

          <form onSubmit={handleLogin} className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Cédula de Identidad (C.I.):
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 26123456"
                value={idDuenoInput}
                onChange={(e) => setIdDuenoInput(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Contraseña Privada:
              </label>
              <input
                type="password"
                required
                placeholder="Introduzca su clave"
                value={contrasenaInput}
                onChange={(e) => setContrasenaInput(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{error}</span>
              </div>
            )}

            {successMsg && (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle className="w-4 h-4 shrink-0" />
                <span className="leading-tight">{successMsg}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
              id="btn-login-dueno"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Ingresar al Garaje</span>}
            </button>
          </form>

          <div className="text-center space-y-2 pt-1">
            <button
              onClick={() => { setViewMode("registro"); setError(null); setSuccessMsg(null); }}
              className="text-xs text-slate-400 hover:text-amber-500 font-medium inline-flex items-center gap-1.5 py-1 cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>¿No tienes cuenta? Registra tu usuario aquí</span>
            </button>

            {/* Acceso público al Directorio de Calidad Técnica */}
            <div className="pt-2 border-t border-white/5">
              <button
                type="button"
                onClick={() => {
                  setShowDirectorioTalleres(true);
                  cargarDirectorioTalleres();
                }}
                className="w-full bg-slate-900/60 hover:bg-slate-900 border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs text-amber-300 font-bold shadow-md transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-2">
                  <span className="p-1 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">⭐</span>
                  <div className="text-left">
                    <span className="block font-black text-white text-[11px]">Directorio de Calidad Técnica</span>
                    <span className="block text-[9.5px] text-amber-400/80 font-normal">Consulta reputación y opiniones de talleres oficiales</span>
                  </div>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
                  Explorar <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- VISTA B: REGISTRO CLIENTE ---------------- */}
      {viewMode === "registro" && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 mb-3">
              <UserPlus className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-display font-extrabold text-white">Registro de Propietario</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-[80%] mx-auto leading-normal">
              Crea tu perfil oficial de AutoScore. Tu cuenta iniciará como PENDIENTE para revisión del Administrador.
            </p>
          </div>

          <form onSubmit={handleRegistro} className="bg-slate-900/40 border border-white/5 p-5 rounded-2xl space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Cédula de Identidad (C.I.):
              </label>
              <input
                type="text"
                required
                placeholder="Ej: 26123456"
                value={idDuenoInput}
                onChange={(e) => setIdDuenoInput(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Nombre Completo:
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Pedro Pérez"
                value={nombreInput}
                onChange={(e) => setNombreInput(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Establecer Contraseña:
              </label>
              <input
                type="password"
                required
                placeholder="Cree una contraseña segura"
                value={contrasenaInput}
                onChange={(e) => setContrasenaInput(e.target.value)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 text-red-400 text-xs rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <span>Solicitar Aprobación</span>}
            </button>
          </form>

          <div className="text-center">
            <button
              onClick={() => { setViewMode("login"); setError(null); setSuccessMsg(null); }}
              className="text-xs text-slate-400 hover:text-white inline-flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Volver a Inicio de Sesión</span>
            </button>
          </div>
        </div>
      )}

      {/* ---------------- VISTA C: GARAJE VIRTUAL (DUEÑO) ---------------- */}
      {viewMode === "garage" && loggedUser && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/30 p-3 rounded-2xl border border-white/5">
            <div>
              <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block">PROPIETARIO HOMOLOGADO</span>
              <span className="text-sm font-bold text-white block mt-0.5">{loggedUser.nombre}</span>
              <span className="text-[10px] text-slate-500 font-mono block">C.I: {loggedUser.idDueno}</span>
            </div>
            <button
              onClick={() => { setLoggedUser(null); setVehiculos([]); setViewMode("login"); }}
              className="text-[10px] font-bold bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-400 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer"
            >
              Salir
            </button>
          </div>

          {/* Botón de Acceso al Directorio Oficial de Calidad Técnica de Talleres */}
          <button
            type="button"
            onClick={() => {
              setShowDirectorioTalleres(true);
              cargarDirectorioTalleres();
            }}
            className="w-full bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/10 hover:from-amber-500/20 hover:to-amber-500/20 border border-amber-500/30 p-2.5 rounded-2xl flex items-center justify-between text-xs text-amber-300 font-bold shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">⭐</span>
              <div className="text-left">
                <span className="block font-black text-white text-[11px]">Directorio de Calidad Técnica</span>
                <span className="block text-[9.5px] text-amber-400/80 font-normal">Consulta ranking y opiniones de talleres oficiales</span>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-lg flex items-center gap-1">
              Ver Talleres <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </span>
          </button>

          <div className="flex justify-between items-center bg-white/5 p-3 rounded-xl border border-white/5 text-xs">
            <span className="text-slate-400">Tus Vehículos: <strong className="text-white font-mono">{vehiculos.length}</strong></span>
            <button
              onClick={() => setMostrarFormCar(!mostrarFormCar)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[10px] transition-all"
            >
              {mostrarFormCar ? "Cerrar" : "➕ Registrar Vehículo"}
            </button>
          </div>

          {mostrarFormCar && (
            <form onSubmit={handleRegistrarVehiculoForm} className="bg-slate-900/60 border border-amber-500/20 p-4 rounded-2xl space-y-3.5">
              <span className="block text-[10px] font-bold text-amber-500 uppercase tracking-widest border-b border-white/5 pb-1">Homologar Nuevo Vehículo</span>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Placa:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: AB123CD"
                    value={newPlaca}
                    onChange={(e) => setNewPlaca(e.target.value.toUpperCase())}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono font-bold uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Año:</label>
                  <input
                    type="number"
                    required
                    placeholder="Ej: 2018"
                    value={newAnio}
                    onChange={(e) => setNewAnio(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Marca:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Toyota"
                    value={newMarca}
                    onChange={(e) => setNewMarca(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Modelo:</label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Corolla"
                    value={newModelo}
                    onChange={(e) => setNewModelo(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs"
                  />
                </div>
              </div>

              {error && <p className="text-[10px] text-red-400">{error}</p>}

              <button
                type="submit"
                disabled={registrandoCar}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-lg text-[10px] transition-all"
              >
                {registrandoCar ? "Guardando en la Nube..." : "Homologar de Forma Gratuita"}
              </button>
            </form>
          )}

          {/* Vehículos Listado */}
          <div className="space-y-3">
            {vehiculos.map((car, idx) => (
              <div key={idx} className="bg-slate-950/60 border border-white/10 rounded-2xl p-4 space-y-3.5 hover:border-amber-500/25 transition-all shadow-xl">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">{car.marca}</span>
                    <h4 className="text-base font-display font-extrabold text-white mt-0.5">{car.modelo} <span className="text-slate-400 font-normal text-xs">({car.anio})</span></h4>
                    <span className="inline-block bg-black border border-white/20 font-mono text-xs font-bold tracking-widest px-2.5 py-0.5 rounded text-amber-400 mt-2">
                      {car.placa}
                    </span>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      car.estadoCertificado === "Activo"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      Cert: {car.estadoCertificado}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                      Score: <strong className="text-amber-400">{car.score} pts</strong>
                    </span>
                  </div>
                </div>

                {/* ACCIONES SEPARADAS PARA EL PROPIETARIO: CERTIFICADOS vs REGISTROS DE FIRMAS */}
                <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => {
                      handleVerCertificado(car, "completo");
                      setActiveVehicleTab("certificado");
                    }}
                    className="py-2 px-3 text-[11px] font-black bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-400 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>📜 Ver Certificado</span>
                  </button>
                  <button
                    onClick={() => {
                      handleVerRegistrosFirmas(car);
                    }}
                    className="py-2 px-3 text-[11px] font-black bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-400 rounded-xl text-center flex items-center justify-center gap-1.5 transition-all active:scale-[0.98] cursor-pointer shadow-sm"
                  >
                    <PenTool className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                    <span>✍️ Registros de Firmas</span>
                  </button>
                </div>
              </div>
            ))}
            {vehiculos.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-6">Aún no tiene vehículos homologados en su Garaje Virtual.</p>
            )}
          </div>
        </div>
      )}

      {/* ---------------- VISTA D: DETALLE DE VEHÍCULO (CERTIFICADO Y REGISTROS DE FIRMAS SEPARADOS) ---------------- */}
      {viewMode === "certificado" && selectedCar && (
        <div className="space-y-4 animate-fade-in">
          
          {/* Botón Volver y Header de Navegación */}
          <div className="flex items-center justify-between no-print">
            <button
              onClick={handleBackToGarage}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-extrabold uppercase tracking-wider cursor-pointer"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span>Volver</span>
            </button>
            <span className="text-[10px] font-mono text-slate-400 font-bold">AUTOSCORE VERIFIED ID</span>
          </div>

          {/* SELECTOR DE PESTAÑAS: SEPARACIÓN DE CERTIFICADOS Y REGISTROS DE FIRMAS */}
          <div className="flex bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shadow-lg no-print gap-1.5">
            <button
              type="button"
              onClick={() => setActiveVehicleTab("certificado")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeVehicleTab === "certificado"
                  ? "bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Shield className="w-4 h-4 shrink-0" />
              <span>Certificado Oficial</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveVehicleTab("firmas")}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeVehicleTab === "firmas"
                  ? "bg-gradient-to-r from-emerald-500 to-emerald-600 text-slate-950 shadow-md font-black"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <PenTool className="w-4 h-4 shrink-0" />
              <span>Registros de Firmas</span>
              <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded-full font-bold ${
                activeVehicleTab === "firmas" ? "bg-black/40 text-emerald-300" : "bg-white/10 text-slate-300"
              }`}>
                {historial.length}
              </span>
            </button>
          </div>

          {/* ALERTA Y REGLA DE CERTIFICADO VENCIDO (SOLO VISTA SIMPLE EN APP, SIN DESCARGAS NI COMPARTIR) */}
          {selectedCar.estadoCertificado === "Vencido" && (
            <div className="bg-red-950/40 border border-red-500/40 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-red-200 shadow-xl no-print animate-in fade-in">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-red-500/20 text-red-400 shrink-0 border border-red-500/30">
                  <AlertTriangle className="w-4.5 h-4.5" />
                </div>
                <div>
                  <span className="font-bold text-white block">Certificado Vencido — Solo Vista Simple en App</span>
                  <span className="text-[10px] text-red-300/80 leading-tight block mt-0.5">
                    Visualización disponible únicamente en modo Simple dentro de la app. Descargas en PDF, compartir y auditoría VIP inhabilitadas hasta su renovación.
                  </span>
                </div>
              </div>
              <a
                href={`https://wa.me/${adminPhoneEnv.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hola Administrador de AutoScore. Deseo renovar el certificado para mi vehículo placa ${selectedCar.placa}.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-red-500 hover:bg-red-600 text-white font-black px-3.5 py-2 rounded-xl text-[10px] flex items-center justify-center gap-1.5 shrink-0 transition-all shadow-md cursor-pointer"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Renovar Certificado</span>
              </a>
            </div>
          )}

          {/* ============================================================== */}
          {/* SUB-VISTA 1: CERTIFICADO OFICIAL DE SALUD MECÁNICA */}
          {/* ============================================================== */}
          {activeVehicleTab === "certificado" && (
            <div className="space-y-4">
              {/* Selector de Tipo (Simple / Completo) */}
              <div className="flex justify-between items-center bg-slate-950/60 p-2 rounded-xl border border-white/10 no-print text-[11px]">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider pl-1.5 font-bold">Tipo de Certificado:</span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setActiveCertType("simple")}
                    className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                      activeCertType === "simple" || selectedCar.estadoCertificado === "Vencido"
                        ? "bg-white/20 text-white border border-white/25 shadow-sm"
                        : "text-slate-400 hover:text-white"
                    }`}
                  >
                    Simple
                  </button>
                  <button
                    onClick={() => {
                      if (selectedCar.estadoCertificado === "Vencido") {
                        alert("El Certificado Completo VIP está inhabilitado porque el certificado está vencido. Solo se permite ver en modo Simple dentro de la app. Renueva la suscripción para reactivar el modo VIP.");
                        return;
                      }
                      setActiveCertType("completo");
                    }}
                    disabled={selectedCar.estadoCertificado === "Vencido"}
                    className={`px-3 py-1 rounded-lg font-bold transition-all ${
                      selectedCar.estadoCertificado === "Vencido"
                        ? "opacity-40 text-slate-500 cursor-not-allowed bg-black/40 flex items-center gap-1 border border-white/5"
                        : activeCertType === "completo"
                        ? "bg-amber-500/25 text-amber-400 border border-amber-500/35 font-black shadow-sm cursor-pointer"
                        : "text-slate-400 hover:text-amber-400 cursor-pointer"
                    }`}
                    title={selectedCar.estadoCertificado === "Vencido" ? "Bloqueado por vencimiento" : "Certificado Completo VIP"}
                  >
                    {selectedCar.estadoCertificado === "Vencido" && <Lock className="w-3 h-3 text-red-400" />}
                    <span>Completo VIP</span>
                  </button>
                </div>
              </div>

              {/* Contenedor Físico Imprimible del Certificado (HOJA 1) */}
              <div className={`cert-printable-card cert-page-1 relative rounded-3xl p-5 border overflow-hidden ${
                selectedCar.estadoCertificado !== "Vencido" && activeCertType === "completo"
                  ? "bg-gradient-to-b from-[#0f0e0c] to-[#040404] border-amber-500/40 shadow-2xl shadow-amber-500/5"
                  : selectedCar.estadoCertificado === "Vencido"
                  ? "bg-gradient-to-b from-slate-900/80 to-slate-950/95 border-red-500/30 shadow-xl"
                  : "bg-gradient-to-b from-slate-900/60 to-slate-950/90 border-white/10 shadow-xl"
              }`}>
                    
                    {/* Encabezado Oficial Exclusivo para Impresión / PDF */}
                    <div className="hidden print-only-header">
                      <div className="flex justify-between items-center pb-2 border-b-2 border-slate-900">
                        <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-wider">AUTOSCORE 1.3</h2>
                          <p className="text-[10px] text-slate-700 font-mono">SISTEMA OFICIAL DE HISTORIAL Y TRAZABILIDAD AUTOMOTRIZ</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-700 font-mono">
                          <div>Folio / Placa: <strong className="text-slate-900 font-bold">{selectedCar.placa}</strong></div>
                          <div>Fecha de Emisión: {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}</div>
                        </div>
                      </div>
                    </div>

                    {/* Sello de Autenticidad */}
                    <div className="flex justify-between items-start mb-5 relative z-10">
                      <div>
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
                          selectedCar.estadoCertificado === "Vencido"
                            ? "bg-red-500/10 text-red-400 border-red-500/30"
                            : activeCertType === "completo"
                            ? "bg-amber-400/10 text-amber-400 border-amber-500/20"
                            : "bg-slate-400/10 text-slate-400 border-slate-400/20"
                        }`}>
                          {selectedCar.estadoCertificado === "Vencido" ? (
                            <>
                              <Lock className="w-3 h-3 text-red-400" />
                              <span>Certificado Simple (VENCIDO)</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3 h-3 text-amber-400" />
                              <span>Certificado {activeCertType.toUpperCase()}</span>
                            </>
                          )}
                        </span>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest mt-1">
                          {selectedCar.estadoCertificado === "Vencido" ? "Suscripción Expirada — Solo Vista en App" : "Sello Oficial Inalterable"}
                        </span>
                      </div>
                      <Shield className={`w-5 h-5 ${
                        selectedCar.estadoCertificado === "Vencido"
                          ? "text-red-500"
                          : activeCertType === "completo"
                          ? "text-amber-500"
                          : "text-slate-400"
                      }`} />
                    </div>

                    {/* Caja de Datos y Score en Grande (cert-data-box) */}
                    <div className="cert-data-box bg-black/50 border border-white/10 rounded-2xl p-4 space-y-4 relative z-10">
                      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                        <div className="text-center sm:text-left">
                          <span className="text-[9px] text-slate-400 font-mono uppercase tracking-wider block">UNIDAD EVALUADA</span>
                          <h4 className="text-lg font-display font-black text-white mt-0.5 leading-tight">{selectedCar.marca} {selectedCar.modelo}</h4>
                          <span className="text-xs text-slate-300 font-light block">Año fabricación: {selectedCar.anio}</span>
                          <div className="cert-placa-badge inline-block bg-slate-900 border border-white/20 font-mono text-xs font-bold tracking-widest px-3 py-1 rounded text-amber-400 mt-2 shadow-inner">
                            PLACA: {selectedCar.placa}
                          </div>
                        </div>

                        <div className="flex flex-col items-center">
                          <div className={`cert-score-circle w-28 h-28 rounded-full border-4 border-amber-500/20 flex flex-col items-center justify-center ${getScoreColor(selectedCar.score)}`}>
                            <span className="text-3xl font-black text-white leading-none">{selectedCar.score}</span>
                            <span className="text-[9px] font-bold tracking-widest uppercase opacity-75 mt-1">SCORE</span>
                          </div>
                          <span className="cert-tag-salud text-[10px] text-slate-300 mt-2 font-black uppercase tracking-wider">
                            {getSaludMecanicaTag(selectedCar.score)}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Validación Pública y QR en Hoja 1 (Solo Certificado Completo VIP) */}
                    {activeCertType === "completo" && selectedCar.estadoCertificado !== "Vencido" && (
                      <div className="mt-4 space-y-3 relative z-10">
                        <div className="cert-qr-container bg-slate-900/60 border border-amber-500/20 rounded-2xl p-3.5 flex flex-col sm:flex-row items-center gap-3.5 text-left">
                          <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                            <img
                              src={generateQRCodeUrl()}
                              alt="QR Validación Certificado"
                              className="w-24 h-24 cert-qr-img block object-contain"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <div className="space-y-1.5 text-center sm:text-left flex-1 min-w-0">
                            <div className="flex items-center justify-center sm:justify-start gap-1.5 flex-wrap">
                              <span className="inline-block text-[9px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                                Verificación Pública en Línea
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">
                                Folio: <strong className="text-slate-200">{selectedCar.placa}</strong>
                              </span>
                            </div>
                            <p className="text-[11px] text-white leading-tight font-bold">
                              Escanear para validar autenticidad en tiempo real
                            </p>
                            <p className="text-[9.5px] text-slate-300 leading-normal">
                              Cualquier interesado, comprador o aseguradora puede verificar este certificado directamente en la plataforma oficial de AutoScore.
                            </p>
                            <div className="grid grid-cols-3 gap-2 pt-1.5 text-[9.5px] font-mono text-slate-300 border-t border-white/10">
                              <div>Km: <strong className="text-white">{historial.length > 0 && historial[0]?.kilometraje != null ? `${Number(historial[0].kilometraje).toLocaleString()} km` : "0 km"}</strong></div>
                              <div>Firmas: <strong className="text-amber-400">{historial.length}</strong></div>
                              <div>Talleres: <strong className="text-emerald-400">{Array.from(new Set(historial.map(h => h.taller).filter(Boolean))).length}</strong></div>
                            </div>
                          </div>
                        </div>

                        {/* Nota al pie de Hoja 1 */}
                        <div className="p-2.5 bg-slate-950/60 border border-white/10 rounded-xl text-center text-[10px] text-slate-400">
                          <span className="font-semibold text-slate-200">Constancia Oficial de Salud Mecánica emitida por AutoScore.</span>
                          <span className="block text-[9px] text-amber-400/90 font-mono mt-0.5 font-bold">
                            Página 1 de 2 · El anexo de reparaciones y mantenimientos detallados continúa en la Hoja 2.
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Información en Certificado Simple o Vencido */}
                    {(activeCertType === "simple" || selectedCar.estadoCertificado === "Vencido") && (
                      <div className="mt-4 p-4 bg-slate-950/60 border border-white/10 rounded-2xl text-center relative z-10 space-y-1">
                        <p className="text-xs text-slate-300 font-semibold leading-normal">Constancia Oficial de Score emitida para uso personal.</p>
                        <p className="text-[10px] text-slate-400 max-w-[85%] mx-auto leading-normal">
                          Para acceder a la auditoría de intervenciones y compartir con compradores, seleccione el <strong>Certificado Completo VIP</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* ---------------- HOJA 2: ANEXO DE HISTORIAL Y REPARACIONES TÉCNICAS (VIP) ---------------- */}
                  {activeCertType === "completo" && selectedCar.estadoCertificado !== "Vencido" && (
                    <div className="cert-printable-card cert-page-2 relative rounded-3xl p-5 border overflow-hidden bg-gradient-to-b from-[#0f0e0c] to-[#040404] border-amber-500/40 shadow-2xl mt-4">
                      {/* Encabezado Oficial de Hoja 2 */}
                      <div className="border-b-2 border-slate-900 pb-2.5 mb-3 flex justify-between items-center text-left">
                        <div>
                          <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                            AUTOSCORE · HOJA 2 DE 2
                          </span>
                          <h3 className="text-base font-display font-black text-white">
                            Anexo Oficial: Historial de Reparaciones y Mantenimientos
                          </h3>
                          <p className="text-[10px] text-slate-400 font-mono">
                            Vehículo: <strong className="text-white">{selectedCar.marca} {selectedCar.modelo} ({selectedCar.anio})</strong> · Placa: <strong className="text-amber-400">{selectedCar.placa}</strong> · Score: <strong className="text-emerald-400">{selectedCar.score}/100</strong>
                          </p>
                        </div>
                        <div className="text-right text-[9.5px] font-mono text-slate-400 shrink-0">
                          <span className="bg-amber-500/10 border border-amber-500/20 text-amber-400 px-2 py-0.5 rounded font-bold block">
                            Anexo Técnico VIP
                          </span>
                          <span className="text-[8.5px] text-slate-500 block mt-0.5">
                            {new Date().toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' })}
                          </span>
                        </div>
                      </div>

                      {/* Resumen de Trazabilidad */}
                      <div className="flex items-center justify-between bg-slate-900/60 p-2.5 rounded-xl border border-white/5 mb-3 text-[10px] font-mono flex-wrap gap-2">
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold">
                          <Wrench className="w-3.5 h-3.5 text-amber-500" />
                          <span>{historial.length} Mantenimientos Certificados</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-bold">
                            👍 {historial.filter(h => h.evaluacion === "Bueno").length} Aprobadas
                          </span>
                          <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-bold">
                            👎 {historial.filter(h => h.evaluacion === "Malo").length} Reclamos
                          </span>
                        </div>
                      </div>

                      {/* Listado Cronológico de Mantenimientos (cert-history-list) */}
                      <div className="cert-history-list space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {historial.map((row, idx) => {
                          const tel = row.telefonoMecanico || "";
                          const formattedTel = formatWhatsAppNumber(tel);
                          const tallerReal = row.taller && row.taller !== "Taller Independiente" ? row.taller : "Taller Autorizado AutoScore";
                          const nombreMec = row.nombreMecanico && !row.nombreMecanico.startsWith("Técnico de") ? row.nombreMecanico : (row.trabajoRealizado && row.trabajoRealizado.includes("Realizado por:") ? (row.trabajoRealizado.match(/Realizado por:\s*([^\(]+)/i)?.[1]?.trim()) : null) || (tallerReal ? `Técnico de ${tallerReal}` : "Mecánico Certificado");
                          const maskedCode = row.codigoMecanico ? String(row.codigoMecanico).replace(/./g, (c, i) => i === 0 ? c : "*") : "";

                          return (
                            <div key={idx} className="cert-timeline-item border-l-3 border-amber-500 pl-4 py-2.5 relative space-y-2 bg-slate-950/40 rounded-r-xl pr-3 border border-white/5 shadow-md">
                              {/* Fecha y Kilometraje */}
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                                <span className="bg-slate-900 border border-white/10 px-2.5 py-0.5 rounded text-white font-bold">
                                  📅 {row.fecha ? row.fecha.split(" ")[0] : "Fecha no registrada"}
                                </span>
                                <span className="text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                  ⚡ {row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km
                                </span>
                              </div>
                              
                              {/* Trabajo Realizado */}
                              <p className="cert-work-desc text-xs text-slate-100 leading-relaxed font-normal bg-black/40 p-2.5 rounded-lg border border-white/10">
                                {row.trabajoRealizado}
                              </p>
                              
                              {/* Taller y Mecánico Certificado */}
                              <div className="cert-workshop-box bg-[#0b0c10] border border-amber-500/20 rounded-xl p-2.5 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-2.5 shadow-md">
                                <div className="text-left space-y-0.5">
                                  <div className="flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">Taller:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTecnicoModal({
                                          taller: tallerReal,
                                          codigo: row.codigoMecanico,
                                          nombreMecanico: nombreMec,
                                          mecanicoNombre: nombreMec,
                                          telefono: tel,
                                          fecha: row.fecha,
                                          kilometraje: row.kilometraje,
                                          trabajo: row.trabajoRealizado,
                                          trabajoRealizado: row.trabajoRealizado
                                        });
                                      }}
                                      className="font-black text-white text-[11px] uppercase tracking-wide hover:text-amber-400 transition-colors text-left cursor-pointer"
                                    >
                                      {tallerReal}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px] text-slate-300">
                                    <div className="flex items-center gap-1 text-slate-200 font-medium">
                                      <User className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span>Mecánico: <strong className="text-white font-bold">{nombreMec}</strong></span>
                                    </div>
                                    {maskedCode && <span className="text-slate-400 font-mono text-[9px]">• Sello: #{maskedCode}</span>}
                                    {tel && <span className="text-slate-400 font-mono text-[9px]">• Tel: +{tel}</span>}
                                  </div>
                                </div>
                                
                                {/* Botón WhatsApp de Verificación (no-print) */}
                                <div className="no-print">
                                  {(() => {
                                    const hasPhone = !!formattedTel;
                                    const finalPhone = hasPhone ? formattedTel : formatWhatsAppNumber(adminPhoneEnv);
                                    const targetName = hasPhone ? (row.taller || "Taller") : "Soporte Técnico";
                                    const directTextMsg = `Hola ${targetName}. Tengo en mano el Certificado Oficial AutoScore VIP del vehículo ${selectedCar?.marca || ""} ${selectedCar?.modelo || ""} (Placa: ${selectedCar?.placa || ""}) donde figura que su taller realizó el siguiente trabajo el día ${row.fecha ? row.fecha.split(" ")[0] : ""} con ${row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km:\n\n"${row.trabajoRealizado || ""}"\n\n¿Podrían confirmarme la autenticidad de este registro técnico? Muchas gracias.`;
                                    
                                    return (
                                      <a
                                        href={`https://wa.me/${finalPhone}?text=${encodeURIComponent(directTextMsg)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black px-2.5 py-1.5 rounded-lg text-[9.5px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-lg border border-emerald-400/20 cursor-pointer"
                                      >
                                        <Phone className="w-3 h-3 shrink-0 fill-current" />
                                        <span>Verificar en WhatsApp</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-85 shrink-0" />
                                      </a>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Evaluación del Servicio por el Dueño (Bueno/Malo) */}
                              {renderEvaluacionServicio(row, tallerReal, nombreMec)}
                            </div>
                          );
                        })}

                        {historial.length === 0 && (
                          <div className="p-5 bg-slate-950/60 border border-white/10 rounded-2xl text-center space-y-1.5">
                            <PenTool className="w-7 h-7 text-slate-500 mx-auto" />
                            <p className="text-xs text-slate-200 font-bold">Sin mantenimientos registrados aún en la base de datos.</p>
                            <p className="text-[10px] text-slate-400">
                              Los servicios y reparaciones realizadas en talleres autorizados aparecerán aquí automáticamente una vez estampada la firma del mecánico.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Directorio de Talleres Auditores */}
                      {historial.length > 0 && (
                        <div className="pt-3 border-t border-white/5 space-y-2 text-left mt-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block font-bold">
                            Talleres Certificados que han auditado este vehículo ({Array.from(new Set(historial.map(h => h.taller).filter(Boolean))).length}):
                          </span>
                          <div className="flex flex-wrap gap-1.5">
                            {Array.from(new Set(historial.map(h => h.taller).filter(Boolean))).map((tall, tIdx) => (
                              <span key={tIdx} className="text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Wrench className="w-3 h-3" />
                                <span>{tall}</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Pie de Página de Hoja 2 */}
                      <div className="mt-3 pt-2 border-t border-white/5 text-center text-[9px] font-mono text-slate-500">
                        AutoScore Certificación Oficial · Página 2 de 2 · Trazabilidad y Mantenimientos Validados
                      </div>
                    </div>
                  )}

                  {/* OPCIONES DE COMPARTIR Y ACCIONES (no-print) - Bloqueado si está vencido */}
                  {activeCertType === "completo" && selectedCar.estadoCertificado !== "Vencido" && (
                    <div className="bg-slate-900/40 border border-white/10 p-4 rounded-2xl space-y-3.5 no-print text-left">
                      <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                        <Share2 className="w-4 h-4 text-amber-500" />
                        <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest">COMPARTIR CERTIFICADO CON COMPRADORES</span>
                      </div>

                      <div className="flex flex-col gap-2.5">
                        <a
                          href={`https://wa.me/?text=${encodeURIComponent(
                            `¡Hola! Te comparto el Certificado Oficial de AutoScore de mi vehículo *${selectedCar.marca} ${selectedCar.modelo} ${selectedCar.anio}* (Placa: *${selectedCar.placa}*), con un Score de Salud Mecánica de *${selectedCar.score}/100*. Puedes verificar todo el historial detallado de mantenimientos certificados en talleres autorizados aquí:\n\n${getPublicShareUrl()}`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#25D366]/10 active:scale-[0.99] cursor-pointer"
                        >
                          <Phone className="w-4 h-4 shrink-0 fill-current" />
                          <span>Compartir por WhatsApp</span>
                        </a>

                        <button
                          onClick={copyPublicLink}
                          className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99] cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span className="text-emerald-400 font-black">¡Enlace Copiado al Portapapeles!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4 text-amber-500 shrink-0" />
                              <span>Copiar Enlace para Compradores o Marketplace</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Botón Imprimir / Guardar en PDF para dueño (Solo si NO está vencido) */}
                  <div className="space-y-2.5 no-print">
                    {selectedCar.estadoCertificado === "Vencido" ? (
                      <div className="p-3.5 bg-red-950/25 border border-red-500/30 rounded-2xl text-center space-y-1.5">
                        <div className="flex items-center justify-center gap-1.5 text-red-300 text-xs font-bold">
                          <Lock className="w-3.5 h-3.5 text-red-400" />
                          <span>Descarga en PDF e Impresión Inhabilitadas</span>
                        </div>
                        <p className="text-[10px] text-slate-400 max-w-sm mx-auto leading-normal">
                          Este certificado está vencido. Solo se permite su visualización en pantalla dentro de la app. Para descargar el documento PDF oficial o compartirlo, renueva tu suscripción.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => window.print()}
                        className="w-full bg-slate-950 hover:bg-slate-900 border border-amber-500/25 py-3.5 rounded-2xl text-xs text-white font-black text-center flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Download className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                        <span>Imprimir / Descargar Certificado en PDF</span>
                      </button>
                    )}
                    
                    <button
                      onClick={() => setActiveVehicleTab("firmas")}
                      className="w-full text-center py-2 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PenTool className="w-3.5 h-3.5" />
                      <span>¿Necesitas que el mecánico firme un trabajo? Ir a Registros de Firmas →</span>
                    </button>
                  </div>
                </div>
              )}

              {/* ============================================================== */}
              {/* SUB-VISTA 2: REGISTROS DE FIRMAS TÉCNICAS (TALLER Y BITÁCORA) */}
              {/* ============================================================== */}
              {activeVehicleTab === "firmas" && (
                <div className="space-y-4">
                  {/* Contenedor Imprimible de Bitácora y Firmas */}
                  <div className="cert-printable-card cert-signatures-sheet bg-gradient-to-b from-[#0c100e] to-[#040605] border border-emerald-500/30 rounded-3xl p-5 shadow-2xl space-y-5">
                    
                    {/* Encabezado Oficial Exclusivo para Impresión y PDF */}
                    <div className="hidden print-only-header">
                      <div className="flex justify-between items-center pb-2 border-b-2 border-slate-900">
                        <div>
                          <h2 className="text-xl font-black text-slate-900 tracking-wider">AUTOSCORE 1.3</h2>
                          <p className="text-[10px] text-slate-700 font-mono">HOJA OFICIAL DE REGISTRO DE FIRMAS TÉCNICAS Y MANTENIMIENTOS</p>
                        </div>
                        <div className="text-right text-[10px] text-slate-700 font-mono">
                          <div>Vehículo: <strong className="text-slate-900 font-bold">{selectedCar.marca} {selectedCar.modelo}</strong></div>
                          <div>Placa: <strong className="text-slate-900 font-bold">{selectedCar.placa}</strong></div>
                        </div>
                      </div>
                    </div>

                    {/* Encabezado en pantalla */}
                    <div className="flex justify-between items-start border-b border-white/10 pb-3">
                      <div>
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <PenTool className="w-3 h-3 text-emerald-400" />
                          <span>Trazabilidad de Taller</span>
                        </span>
                        <h4 className="text-base font-display font-black text-white mt-1">Registros de Firmas Técnicas</h4>
                        <span className="text-[10px] text-slate-400 font-mono">Placa: {selectedCar.placa} • {selectedCar.marca} {selectedCar.modelo}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                          {historial.length} Firmas
                        </span>
                      </div>
                    </div>

                    {/* BLOQUE QR PARA QUE EL MECÁNICO O TALLER FIRME */}
                    <div className="cert-qr-container bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-4 text-left space-y-3">
                      <div className="flex items-center gap-2.5">
                        <QrCode className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                        <div>
                          <h5 className="text-[11px] font-mono font-extrabold uppercase tracking-wider text-emerald-400 leading-none">
                            CÓDIGO QR PARA FIRMA TÉCNICA EN TALLER
                          </h5>
                          <span className="text-[9px] text-slate-300 block mt-0.5">
                            Muestra este código al mecánico para que asiente y certifique la reparación desde su celular
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/50 p-3.5 rounded-xl border border-emerald-500/15">
                        <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-lg">
                          <img
                            src={generateMecanicoQRCodeUrl()}
                            alt="QR Firma Técnico"
                            className="w-32 h-32 block mx-auto"
                            referrerPolicy="no-referrer"
                          />
                        </div>
                        <div className="space-y-2 text-center sm:text-left flex-1">
                          <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
                            <span className="inline-block text-[9px] font-mono font-black text-white bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                              Placa: {selectedCar.placa}
                            </span>
                            <span className="inline-block text-[9px] font-mono font-bold text-slate-300 bg-white/5 border border-white/10 px-2 py-0.5 rounded">
                              {selectedCar.marca} {selectedCar.modelo} ({selectedCar.anio})
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-200 leading-snug font-medium">
                            El mecánico escanea este QR para cargar automáticamente los datos del auto, registrar el servicio y estampar su sello digital.
                          </p>
                          
                          {/* Acciones de Compartir QR al Mecánico (no-print) */}
                          <div className="flex flex-wrap gap-2 pt-1 no-print justify-center sm:justify-start">
                            <a
                              href={`https://wa.me/?text=${encodeURIComponent(
                                `Hola, te comparto el enlace de firma técnica de AutoScore para mi vehículo *${selectedCar.marca} ${selectedCar.modelo}* (Placa: *${selectedCar.placa}*). Por favor entra aquí para registrar y firmar el mantenimiento realizado:\n\n${generateMecanicoQRCodeUrl() ? `${getCleanBaseAndPath()}?vista=mecanico&placa=${selectedCar.placa}${appScriptUrl ? `&api=${encodeURIComponent(appScriptUrl)}` : ""}` : ""}`
                              )}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black px-3 py-1.5 rounded-lg text-[10px] flex items-center gap-1.5 shadow-md active:scale-95 cursor-pointer"
                            >
                              <Phone className="w-3 h-3 fill-current" />
                              <span>Enviar al Mecánico por WhatsApp</span>
                            </a>

                            <button
                              onClick={() => {
                                const link = `${getCleanBaseAndPath()}?vista=mecanico&placa=${selectedCar.placa}${appScriptUrl ? `&api=${encodeURIComponent(appScriptUrl)}` : ""}`;
                                navigator.clipboard.writeText(link);
                                setCopiedLink(true);
                                setTimeout(() => setCopiedLink(false), 2000);
                              }}
                              className="bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 active:scale-95 cursor-pointer"
                            >
                              {copiedLink ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-amber-500" />}
                              <span>{copiedLink ? "¡Copiado!" : "Copiar Enlace"}</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* BITÁCORA CRONOLÓGICA DE FIRMAS REGISTRADAS */}
                    <div className="space-y-3.5 text-left">
                      <div className="flex justify-between items-center border-b border-white/10 pb-2 flex-wrap gap-2">
                        <h5 className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4" />
                          <span>Firmas de Mantenimientos ({historial.length})</span>
                        </h5>
                        <div className="flex items-center gap-1.5 font-mono text-[9.5px]">
                          <span className="text-emerald-400 bg-emerald-500/10 border border-emerald-500/25 px-2 py-0.5 rounded-full font-bold flex items-center gap-1" title="Suma de calificaciones buenas en este vehículo">
                            <span>👍</span>
                            <span>{historial.filter(h => h.evaluacion === "Bueno").length} Buenas</span>
                          </span>
                          <span className="text-red-400 bg-red-500/10 border border-red-500/25 px-2 py-0.5 rounded-full font-bold flex items-center gap-1" title="Suma de reportes de inconformidad en este vehículo">
                            <span>👎</span>
                            <span>{historial.filter(h => h.evaluacion === "Malo").length} Reclamos</span>
                          </span>
                        </div>
                      </div>

                      <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                        {historial.map((row, idx) => {
                          const tel = row.telefonoMecanico || "";
                          const formattedTel = formatWhatsAppNumber(tel);
                          const tallerReal = row.taller && row.taller !== "Taller Independiente" ? row.taller : "Taller Autorizado AutoScore";
                          const nombreMec = row.nombreMecanico && !row.nombreMecanico.startsWith("Técnico de") ? row.nombreMecanico : (row.trabajoRealizado && row.trabajoRealizado.includes("Realizado por:") ? (row.trabajoRealizado.match(/Realizado por:\s*([^\(]+)/i)?.[1]?.trim()) : null) || (tallerReal ? `Técnico de ${tallerReal}` : "Mecánico Certificado");
                          const maskedCode = row.codigoMecanico ? String(row.codigoMecanico).replace(/./g, (c, i) => i === 0 ? c : "*") : "";

                          return (
                            <div key={idx} className="cert-timeline-item border-l-3 border-emerald-500 pl-4 py-2.5 relative space-y-2.5 bg-slate-950/40 rounded-r-xl pr-3 border border-white/5 shadow-md">
                              {/* Fecha y Kilometraje */}
                              <div className="flex items-center justify-between text-[10px] font-mono text-slate-300">
                                <span className="bg-slate-900 border border-white/10 px-2.5 py-0.5 rounded text-white font-bold">
                                  📅 {row.fecha ? row.fecha.split(" ")[0] : "Fecha no registrada"}
                                </span>
                                <span className="text-amber-400 font-extrabold bg-amber-500/10 px-2.5 py-0.5 rounded border border-amber-500/20">
                                  ⚡ {row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km
                                </span>
                              </div>
                              
                              {/* Trabajo Realizado */}
                              <p className="cert-work-desc text-xs text-slate-100 leading-relaxed font-normal bg-black/40 p-2.5 rounded-lg border border-white/10">
                                {row.trabajoRealizado}
                              </p>
                              
                              {/* Tarjeta del Taller y Mecánico Firmante */}
                              <div className="cert-workshop-box bg-[#0b0c10] border border-emerald-500/20 rounded-xl p-3 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 shadow-md">
                                <div className="text-left space-y-1">
                                  <div className="flex items-center gap-1.5">
                                    <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wide">Taller:</span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveTecnicoModal({
                                          taller: tallerReal,
                                          codigo: row.codigoMecanico,
                                          nombreMecanico: nombreMec,
                                          mecanicoNombre: nombreMec,
                                          telefono: tel,
                                          fecha: row.fecha,
                                          kilometraje: row.kilometraje,
                                          trabajo: row.trabajoRealizado,
                                          trabajoRealizado: row.trabajoRealizado
                                        });
                                      }}
                                      className="font-black text-white text-[11px] uppercase tracking-wide hover:text-amber-400 transition-colors text-left cursor-pointer"
                                    >
                                      {tallerReal}
                                    </button>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-[10px] text-slate-300">
                                    <div className="flex items-center gap-1 text-emerald-400 font-bold">
                                      <User className="w-3 h-3 text-emerald-400 shrink-0" />
                                      <span>Mecánico: <strong className="text-slate-100 font-black">{nombreMec}</strong></span>
                                    </div>
                                    <span className="text-slate-400 font-mono text-[9px]">• Sello: #{maskedCode}</span>
                                    {tel && <span className="text-slate-400 font-mono text-[9px]">• Tel: +{tel}</span>}
                                  </div>
                                </div>
                                
                                {/* Botón WhatsApp de Verificación (no-print) */}
                                <div className="no-print">
                                  {(() => {
                                    const hasPhone = !!formattedTel;
                                    const finalPhone = hasPhone ? formattedTel : formatWhatsAppNumber(adminPhoneEnv);
                                    const targetName = hasPhone ? (row.taller || "Taller") : "Soporte Técnico";
                                    const directTextMsg = `Hola ${targetName}. Tengo en mano el registro de mantenimiento del vehículo ${selectedCar?.marca || ""} ${selectedCar?.modelo || ""} (Placa: ${selectedCar?.placa || ""}) donde figura que su taller realizó el siguiente trabajo el día ${row.fecha ? row.fecha.split(" ")[0] : ""} con ${row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km:\n\n"${row.trabajoRealizado || ""}"\n\n¿Podrían confirmarme la autenticidad de esta firma técnica? Muchas gracias.`;
                                    
                                    return (
                                      <a
                                        href={`https://wa.me/${finalPhone}?text=${encodeURIComponent(directTextMsg)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black px-3 py-2 rounded-lg text-[9.5px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-lg border border-emerald-400/20 cursor-pointer"
                                      >
                                        <Phone className="w-3 h-3 shrink-0 fill-current" />
                                        <span>Verificar Firma en WhatsApp</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-85 shrink-0" />
                                      </a>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Evaluación del Servicio por el Dueño (Bueno/Malo) */}
                              {renderEvaluacionServicio(row, tallerReal, nombreMec)}
                            </div>
                          );
                        })}
                        {historial.length === 0 && (
                          <div className="p-6 bg-slate-950/60 border border-white/10 rounded-2xl text-center space-y-2">
                            <PenTool className="w-8 h-8 text-slate-600 mx-auto" />
                            <p className="text-xs text-slate-300 font-bold">Aún no se han registrado firmas técnicas en este vehículo.</p>
                            <p className="text-[10px] text-slate-400 max-w-xs mx-auto">
                              Muestra el código QR de arriba a tu mecánico en el taller para que registre y certifique su primera reparación.
                            </p>
                          </div>
                        )}
                      </div>

                      {/* DIRECTORIO CONSOLIDADO DE TALLERES FIRMANTES */}
                      {historial.length > 0 && (
                        <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl mt-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Shield className="w-4 h-4 text-emerald-400" />
                              <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">
                                Talleres Firmantes ({Array.from(new Set(historial.map(h => h.codigoMecanico).filter(Boolean))).length})
                              </span>
                            </div>
                            
                            <button
                              onClick={copyMecanicosTrazabilidad}
                              className="text-[9px] font-bold text-slate-200 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 px-2 py-0.5 rounded transition-all bg-slate-950 flex items-center gap-1 cursor-pointer no-print"
                            >
                              {copiedMecanicos ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-amber-500" />}
                              <span>Copiar Lista</span>
                            </button>
                          </div>

                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {(() => {
                              const uniqueMecsMap: { [key: string]: { taller: string, nombre: string, telefono: string, codigo: string } } = {};
                              historial.forEach((row) => {
                                const cod = row.codigoMecanico || "";
                                if (cod && !uniqueMecsMap[cod]) {
                                  const tel = getMechanicPhone(row);
                                  uniqueMecsMap[cod] = {
                                    taller: row.taller && row.taller !== "Taller Independiente" ? row.taller : "Taller Autorizado",
                                    nombre: row.nombreMecanico || (row.taller ? `Técnico de ${row.taller}` : "Mecánico Certificado"),
                                    telefono: tel ? String(tel) : "",
                                    codigo: cod
                                  };
                                }
                              });

                              return Object.values(uniqueMecsMap).map((mec, index) => {
                                const cleanedPhone = formatWhatsAppNumber(mec.telefono);
                                const maskedSeal = mec.codigo ? String(mec.codigo).replace(/./g, (c, i) => i === 0 ? c : "*") : "";
                                const hasPhone = !!mec.telefono;
                                const finalPhone = hasPhone ? cleanedPhone : formatWhatsAppNumber(adminPhoneEnv);
                                const targetName = hasPhone ? mec.taller : "Soporte / Administrador";
                                const customTextMsg = `Hola ${targetName}. Tengo en mano los registros de firmas del vehículo placa ${selectedCar?.placa || ""} donde el taller "${mec.taller}" figura con sello digital #${maskedSeal}. ¿Podrían corroborar la validez de estas intervenciones? Muchas gracias.`;

                                return (
                                  <div key={index} className="flex items-center justify-between p-2 bg-slate-950/80 border border-white/5 rounded-xl text-xs">
                                    <div>
                                      <span className="font-extrabold text-white block truncate max-w-[150px]">{mec.taller}</span>
                                      <span className="text-[9px] text-slate-300 block font-mono">Mecánico: {mec.nombre}</span>
                                      <span className="text-[8px] text-slate-400 font-mono block">Sello Digital: #{maskedSeal}</span>
                                    </div>
                                    <div className="no-print">
                                      <a
                                        href={`https://wa.me/${finalPhone}?text=${encodeURIComponent(customTextMsg)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold px-2.5 py-1 rounded text-[10px] flex items-center gap-1.5 transition-all border border-[#25D366]/20 active:scale-95 cursor-pointer"
                                      >
                                        <Phone className="w-3 h-3 text-[#25D366] fill-current" />
                                        <span>WhatsApp</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                      </a>
                                    </div>
                                  </div>
                                );
                              });
                            })()}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTÓN IMPRIMIR / DESCARGAR BITÁCORA DE FIRMAS (no-print) */}
                  <div className="space-y-2.5 no-print">
                    {selectedCar.estadoCertificado === "Vencido" ? (
                      <div className="p-3 bg-red-950/25 border border-red-500/30 rounded-2xl text-center space-y-1">
                        <div className="flex items-center justify-center gap-1.5 text-red-300 text-xs font-bold">
                          <Lock className="w-3.5 h-3.5 text-red-400" />
                          <span>Descarga de Bitácora Bloqueada por Vencimiento</span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Renueva el certificado para descargar o imprimir la bitácora técnica oficial en PDF.
                        </p>
                      </div>
                    ) : (
                      <button
                        onClick={() => window.print()}
                        className="w-full bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 py-3.5 rounded-2xl text-xs text-white font-black text-center flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                      >
                        <Download className="w-4.5 h-4.5 text-emerald-400 animate-bounce" />
                        <span>Imprimir / Descargar Bitácora de Firmas en PDF</span>
                      </button>
                    )}

                    <button
                      onClick={() => setActiveVehicleTab("certificado")}
                      className="w-full text-center py-2 text-[11px] text-amber-400 hover:text-amber-300 font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Shield className="w-3.5 h-3.5" />
                      <span>← Volver a la Vista del Certificado Oficial</span>
                    </button>
                  </div>
                </div>
              )}
        </div>
      )}

      {/* MODAL FLOTANTE DE TRAZABILIDAD (VERIFICAR TALLER REAL) */}
      {activeTecnicoModal && (() => {
        const selectedMantenimiento = activeTecnicoModal;
        const modalTel = selectedMantenimiento.telefono ? String(selectedMantenimiento.telefono).trim() : "";
        const finalModalPhone = modalTel ? formatWhatsAppNumber(modalTel) : formatWhatsAppNumber(adminPhoneEnv);
        const isFallback = !modalTel;
        
        const maskedCode = "M****";
        const tallerName = isFallback ? "Soporte Técnico" : (selectedMantenimiento.taller || "Taller");
        const trabajoTexto = selectedMantenimiento.trabajoRealizado || selectedMantenimiento.trabajo || "";
        const fechaTexto = selectedMantenimiento.fecha ? selectedMantenimiento.fecha.split(" ")[0] : "";
        const kmTexto = selectedMantenimiento.kilometraje != null ? Number(selectedMantenimiento.kilometraje).toLocaleString() : "0";
        const mecanicoNombre = selectedMantenimiento.mecanicoNombre || selectedMantenimiento.nombreMecanico || "Mecánico Certificado";

        const modalMsg = `Hola ${tallerName}. Estoy evaluando la compra del vehículo placa ${selectedCar?.placa || ""} y tiene registrado en AutoScore un mantenimiento firmado por el taller "${selectedMantenimiento.taller || "Taller"}" con sello digital #${maskedCode} el día ${fechaTexto} con ${kmTexto} km ("${trabajoTexto}"). ¿Podrían corroborar la validez de este trabajo? Muchas gracias.`;

        return (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in no-print">
            <div className="bg-[#0b0c10] border border-emerald-500/30 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative">
              <button
                type="button"
                onClick={() => setActiveTecnicoModal(null)}
                className="absolute top-4 right-4 text-slate-500 hover:text-white text-base font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="text-center border-b border-white/5 pb-3.5">
                <div className="inline-flex p-3 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="text-[9px] font-mono font-extrabold text-amber-500 uppercase tracking-widest mb-0.5">
                  Tarjeta de Taller Certificado
                </div>
                <h4 className="text-base font-display font-black text-amber-400">
                  {selectedMantenimiento.taller || "Taller Autorizado AutoScore"}
                </h4>
                <div className="inline-flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full text-xs text-emerald-400 font-bold mt-2">
                  <User className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Mecánico Certificador: <strong className="text-white font-black">{mecanicoNombre}</strong></span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono mt-2">Sello Digital: #M****</p>
              </div>

              <div className="space-y-2 text-xs bg-slate-950 p-3.5 border border-white/5 rounded-xl text-slate-300">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400">Taller / Establecimiento:</span>
                  <strong className="text-amber-400 font-extrabold">{selectedMantenimiento.taller || "Taller Autorizado"}</strong>
                </div>
                <div className="flex justify-between items-center pt-1.5 border-t border-white/5">
                  <span className="text-slate-400">Mecánico Responsable:</span>
                  <strong className="text-white font-bold">{mecanicoNombre}</strong>
                </div>
                <div className="pt-2 border-t border-white/5 mt-2">
                  <span>Reparación Certificada:</span>
                  <p className="text-[11px] text-slate-400 leading-normal font-light mt-1 bg-black/40 p-2 rounded-lg border border-white/5">
                    "{trabajoTexto}"
                  </p>
                </div>
                <div className="pt-2 border-t border-white/5 mt-2 flex flex-col sm:flex-row justify-between items-start gap-2 text-[10px]">
                  <div>Fecha: <span className="text-white block font-mono">{fechaTexto}</span></div>
                  <div>Kilometraje: <span className="text-white block font-mono">{kmTexto} km</span></div>
                </div>
              </div>

              {/* BOTÓN WA.ME DIRECTO DE CORROBORACIÓN */}
              <a
                href={`https://wa.me/${finalModalPhone}?text=${encodeURIComponent(modalMsg)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-lg cursor-pointer"
              >
                <Phone className="w-4 h-4 shrink-0 fill-current" />
                <span>{isFallback ? "Validar con Administrador" : "Corroborar con el Taller"}</span>
              </a>
            </div>
          </div>
        );
      })()}

      {/* ---------------- AVISO FLOTANTE DE EVALUACIÓN GUARDADA ---------------- */}
      {evalSuccessNotice && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-50 bg-emerald-500 text-slate-950 font-black px-4 py-2.5 rounded-2xl shadow-2xl flex items-center gap-2 text-xs border border-emerald-300 animate-in slide-in-from-top duration-300 no-print">
          <CheckCircle className="w-4 h-4 shrink-0" />
          <span>{evalSuccessNotice}</span>
        </div>
      )}

      {/* ---------------- MODAL OFICIAL DE EVALUACIÓN DE TALLER / MECÁNICO ---------------- */}
      {evalModalItem && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 animate-fade-in no-print">
          <div className="bg-[#0b0c10] border border-amber-500/30 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative max-h-[92vh] overflow-y-auto">
            <button
              type="button"
              onClick={() => {
                setEvalModalItem(null);
                setEvalError(null);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-base font-bold cursor-pointer"
            >
              ✕
            </button>

            {/* Cabecera */}
            <div className="text-center border-b border-white/5 pb-3">
              <div className="inline-flex p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <Star className="w-5 h-5 fill-amber-400/20" />
              </div>
              <div className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest">
                Calidad Técnica de Servicio
              </div>
              <h4 className="text-base font-display font-black text-white mt-0.5">
                {evalModalItem.taller || "Taller Autorizado"}
              </h4>
              <p className="text-[11px] text-slate-400 mt-1">
                Técnico: <strong className="text-slate-200">{evalModalItem.nombreMecanico || "Mecánico"}</strong> ({evalModalItem.codigoMecanico})
              </p>
              <div className="mt-2 bg-slate-950/70 p-2.5 rounded-xl border border-white/5 text-[10px] text-slate-300 text-left space-y-0.5">
                <span className="text-slate-400 block font-mono">Trabajo evaluado:</span>
                <span className="font-semibold text-amber-400 block">"{evalModalItem.trabajo}"</span>
                <span className="text-[9px] text-slate-500 block font-mono">Fecha del servicio: {evalModalItem.fecha}</span>
              </div>
            </div>

            <form onSubmit={handleGuardarEvaluacion} className="space-y-4">
              {/* Selector Bueno / Malo con la suma de todas las calificaciones */}
              {(() => {
                const modalStats = evalModalItem ? getMecanicoStats(evalModalItem.codigoMecanico, evalModalItem.taller) : { pos: 0, neg: 0, total: 0, porcentaje: 100 };
                return (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 text-center">
                      ¿Cómo calificas la calidad técnica de este servicio?
                    </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          setEvalTipo("Bueno");
                          setEvalError(null);
                        }}
                        className={`py-3 px-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative overflow-hidden ${
                          evalTipo === "Bueno"
                            ? "bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/30 scale-[1.02]"
                            : "bg-slate-900/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl">👍</span>
                          <span className="text-xs font-black">Bueno</span>
                        </div>
                        {/* Suma de calificaciones buenas */}
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                          <span className="text-[11px] font-black">{modalStats.pos}</span>
                          <span className="text-[9px] font-semibold">{modalStats.pos === 1 ? "aprobación" : "aprobaciones"}</span>
                        </div>
                        <span className="text-[9px] opacity-80 text-center font-normal">Calidad garantizada</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setEvalTipo("Malo");
                          setEvalError(null);
                        }}
                        className={`py-3 px-3 rounded-2xl border flex flex-col items-center gap-1.5 transition-all cursor-pointer relative overflow-hidden ${
                          evalTipo === "Malo"
                            ? "bg-red-500/20 border-red-500 text-red-300 ring-2 ring-red-500/30 scale-[1.02]"
                            : "bg-slate-900/50 border-white/10 text-slate-400 hover:text-white hover:bg-slate-900"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span className="text-2xl">👎</span>
                          <span className="text-xs font-black">Malo</span>
                        </div>
                        {/* Suma de calificaciones malas */}
                        <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-red-500/20 border border-red-500/40 text-red-300">
                          <span className="text-[11px] font-black">{modalStats.neg}</span>
                          <span className="text-[9px] font-semibold">{modalStats.neg === 1 ? "reporte" : "reportes"}</span>
                        </div>
                        <span className="text-[9px] opacity-80 text-center font-normal">Inconformidad / Falla</span>
                      </button>
                    </div>

                    {/* Suma consolidada de todas las calificaciones acumuladas */}
                    <div className="mt-2.5 px-3 py-1.5 bg-slate-950/80 rounded-xl border border-white/5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-medium">Suma total de calificaciones del taller:</span>
                      <span className="font-bold text-amber-400 font-mono">
                        {modalStats.total} en total ({modalStats.pos} 👍 / {modalStats.neg} 👎) · {modalStats.porcentaje}% Calidad
                      </span>
                    </div>
                  </div>
                );
              })()}

              {/* Formulario Dinámico según selección */}
              {evalTipo === "Malo" ? (
                <div className="bg-red-950/25 border border-red-500/30 p-3 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-1.5 text-xs text-red-300">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-white text-[11px]">Describe tu experiencia técnica:</span>
                      <span className="text-[10px] text-red-300/80 leading-tight">
                        Por favor detalla por qué evaluaste negativo. Tu experiencia es fundamental para que la comunidad determine la calidad técnica del taller.
                      </span>
                    </div>
                  </div>

                  {/* Motivos rápidos */}
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Motivos frecuentes (click para agregar):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Falla persistente no resuelta",
                        "Pieza defectuosa o mal instalada",
                        "Cobro excesivo no presupuestado",
                        "Falta de garantía del taller",
                        "Demora excesiva en entrega",
                        "Daño colateral al vehículo"
                      ].map((motivo, mIdx) => (
                        <button
                          key={mIdx}
                          type="button"
                          onClick={() => {
                            if (!evalComentario.includes(motivo)) {
                              setEvalComentario(prev => prev ? `${prev}. ${motivo}` : motivo);
                            }
                          }}
                          className="text-[9px] bg-red-500/10 hover:bg-red-500/20 text-red-300 border border-red-500/20 rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                        >
                          + {motivo}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      required
                      rows={3}
                      value={evalComentario}
                      onChange={(e) => setEvalComentario(e.target.value)}
                      placeholder="Explica detalladamente qué sucedió con esta reparación (ej: el ruido no se quitó, la pieza falló a los pocos días, cobraron más de lo acordado...)"
                      className="w-full glass-input rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-red-500 resize-none"
                    />
                    <span className="text-[9px] text-slate-500 block text-right">Mínimo 5 caracteres para guardar</span>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-950/20 border border-emerald-500/30 p-3 rounded-2xl space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-start gap-1.5 text-xs text-emerald-300">
                    <Sparkles className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                    <div>
                      <span className="font-extrabold block text-white text-[11px]">¡Trabajo técnico destacado!</span>
                      <span className="text-[10px] text-emerald-300/80 leading-tight">
                        Puedes dejar un comentario opcional sobre la calidad o profesionalismo del taller:
                      </span>
                    </div>
                  </div>

                  {/* Elogios rápidos */}
                  <div>
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
                      Aspectos positivos (click para agregar):
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {[
                        "Diagnóstico certero y profesional",
                        "Reparación rápida y garantizada",
                        "Trabajo limpio y repuestos de calidad",
                        "Excelente trato y precio justo"
                      ].map((elogio, eIdx) => (
                        <button
                          key={eIdx}
                          type="button"
                          onClick={() => {
                            if (!evalComentario.includes(elogio)) {
                              setEvalComentario(prev => prev ? `${prev}. ${elogio}` : elogio);
                            }
                          }}
                          className="text-[9px] bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 rounded-lg px-2 py-0.5 transition-colors cursor-pointer"
                        >
                          + {elogio}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <textarea
                      rows={2}
                      value={evalComentario}
                      onChange={(e) => setEvalComentario(e.target.value)}
                      placeholder="Escribe un comentario sobre el servicio recibido (opcional)..."
                      className="w-full glass-input rounded-xl p-2.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                    />
                  </div>
                </div>
              )}

              {evalError && (
                <div className="p-2.5 bg-red-950/30 border border-red-500/40 rounded-xl text-red-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span className="leading-tight">{evalError}</span>
                </div>
              )}

              {/* Botones */}
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEvalModalItem(null);
                    setEvalError(null);
                  }}
                  className="flex-1 bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={submittingEval}
                  className={`flex-1 font-black py-2.5 rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-lg ${
                    evalTipo === "Bueno"
                      ? "bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/20"
                      : "bg-red-500 hover:bg-red-400 text-white shadow-red-500/20"
                  }`}
                >
                  {submittingEval ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Guardar Evaluación</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ---------------- MODAL DIRECTORIO PÚBLICO DE CALIDAD TÉCNICA DE TALLERES ---------------- */}
      {showDirectorioTalleres && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in no-print">
          <div className="bg-[#0b0c10] border border-amber-500/30 rounded-3xl p-5 w-full max-w-md space-y-4 shadow-2xl relative max-h-[92vh] flex flex-col">
            <button
              type="button"
              onClick={() => setShowDirectorioTalleres(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-base font-bold cursor-pointer"
            >
              ✕
            </button>

            {/* Cabecera Directorio */}
            <div className="text-center border-b border-white/5 pb-3 shrink-0">
              <div className="inline-flex p-2.5 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 text-slate-950 font-black shadow-lg mb-2">
                <Star className="w-5 h-5 fill-current" />
              </div>
              <h3 className="text-lg font-display font-extrabold text-white">
                Directorio Oficial de Calidad Técnica
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Ranking de reputación y opiniones de propietarios sobre talleres y mecánicos oficiales.
              </p>
            </div>

            {/* Buscador y Filtros */}
            <div className="space-y-2 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Buscar taller, mecánico o código..."
                  value={filtroDirectorio}
                  onChange={(e) => setFiltroDirectorio(e.target.value)}
                  className="w-full glass-input rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder:text-slate-500 focus:outline-none"
                />
              </div>

              {(() => {
                const sumaTotalPos = directorioMecanicos.reduce((acc, m) => acc + Number(m.totalPositivas || 0), 0);
                const sumaTotalNeg = directorioMecanicos.reduce((acc, m) => acc + Number(m.totalNegativas || 0), 0);
                return (
                  <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-xl border border-white/5 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setFiltroTipoCalidad("todos")}
                      className={`py-1.5 rounded-lg font-bold transition-all ${
                        filtroTipoCalidad === "todos" ? "bg-amber-500 text-slate-950 font-black shadow" : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Todos ({directorioMecanicos.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipoCalidad("oro")}
                      className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                        filtroTipoCalidad === "oro" ? "bg-emerald-500 text-slate-950 font-black shadow" : "text-emerald-400/90 hover:text-emerald-300"
                      }`}
                    >
                      <span>👍 Oro</span>
                      <span className="opacity-90 font-mono">({sumaTotalPos})</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFiltroTipoCalidad("inconformidad")}
                      className={`py-1.5 rounded-lg font-bold transition-all flex items-center justify-center gap-1 ${
                        filtroTipoCalidad === "inconformidad" ? "bg-red-500 text-white font-black shadow" : "text-red-400/90 hover:text-red-300"
                      }`}
                    >
                      <span>👎 Quejas</span>
                      <span className="opacity-90 font-mono">({sumaTotalNeg})</span>
                    </button>
                  </div>
                );
              })()}
            </div>

            {/* Listado con scroll */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingDirectorio ? (
                <div className="py-12 text-center text-xs text-slate-400 space-y-2">
                  <RefreshCw className="w-6 h-6 animate-spin text-amber-500 mx-auto" />
                  <p>Consultando base de datos oficial de talleres...</p>
                </div>
              ) : (() => {
                const query = filtroDirectorio.trim().toLowerCase();
                const lista = directorioMecanicos.filter((m: any) => {
                  const matchQuery = !query || 
                    (m.taller && m.taller.toLowerCase().includes(query)) ||
                    (m.nombre && m.nombre.toLowerCase().includes(query)) ||
                    (m.codigoMecanico && m.codigoMecanico.toLowerCase().includes(query));
                  
                  if (!matchQuery) return false;

                  const pct = m.porcentajeCalidad != null ? Number(m.porcentajeCalidad) : 100;
                  const neg = Number(m.totalNegativas || 0);

                  if (filtroTipoCalidad === "oro") return pct >= 90;
                  if (filtroTipoCalidad === "inconformidad") return neg > 0;
                  return true;
                });

                if (lista.length === 0) {
                  return (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No se encontraron talleres con los criterios de búsqueda seleccionados.
                    </div>
                  );
                }

                return lista.map((mec: any, idx: number) => {
                  const pct = mec.porcentajeCalidad != null ? Number(mec.porcentajeCalidad) : 100;
                  const pos = Number(mec.totalPositivas || 0);
                  const neg = Number(mec.totalNegativas || 0);
                  const total = Number(mec.totalServicios || (pos + neg));
                  
                  let badgeBadge = {
                    texto: "Taller Certificado Oro",
                    clase: "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  };
                  if (neg > 0 && pct < 75) {
                    badgeBadge = {
                      texto: "Alerta Técnica / En Observación",
                      clase: "bg-red-500/10 text-red-400 border-red-500/30"
                    };
                  } else if (pct < 90) {
                    badgeBadge = {
                      texto: "Calidad Técnica Confiable",
                      clase: "bg-blue-500/10 text-blue-400 border-blue-500/30"
                    };
                  }

                  // Reseñas de este mecánico
                  const opinionesTaller = directorioHistorial.filter((h: any) => 
                    (h.codigoMecanico && h.codigoMecanico.toString().toUpperCase() === (mec.codigoMecanico || "").toString().toUpperCase()) &&
                    h.evaluacion
                  );

                  return (
                    <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-2xl p-3.5 space-y-3 hover:border-amber-500/30 transition-all">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                            <h4 className="text-sm font-extrabold text-white leading-tight">
                              {mec.taller || "Taller Oficial"}
                            </h4>
                          </div>
                          <span className="text-[11px] text-slate-300 block mt-0.5">
                            Mecánico: <strong className="text-white">{mec.nombre}</strong> <span className="text-slate-500 font-mono">({mec.codigoMecanico})</span>
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-sm font-black font-display text-amber-400 block">
                            {pct}%
                          </span>
                          <span className="text-[8.5px] uppercase font-mono text-slate-400 block">
                            Calidad Técnica
                          </span>
                        </div>
                      </div>

                      {/* Badge e Indicadores */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 pt-2 border-t border-white/5 text-[10px]">
                        <span className={`px-2 py-0.5 rounded-lg border font-bold text-[9px] ${badgeBadge.clase}`}>
                          {badgeBadge.texto}
                        </span>

                        <div className="flex items-center gap-2 font-mono text-[9.5px]">
                          <span className="text-emerald-400 flex items-center gap-0.5">
                            <ThumbsUp className="w-3 h-3" /> {pos}
                          </span>
                          <span className="text-red-400 flex items-center gap-0.5">
                            <ThumbsDown className="w-3 h-3" /> {neg}
                          </span>
                          <span className="text-slate-500">
                            ({total} trabajos)
                          </span>
                        </div>
                      </div>

                      {/* Botones de Acción */}
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setTallerDetalleModal({ mecanico: mec, opiniones: opinionesTaller })}
                          className="py-1.5 px-2 bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                        >
                          <MessageSquare className="w-3 h-3 text-amber-400" />
                          <span>Ver Opiniones ({opinionesTaller.length})</span>
                        </button>

                        {mec.telefono ? (
                          <a
                            href={`https://wa.me/${mec.telefono}?text=${encodeURIComponent(`Hola ${mec.taller || "Taller"}. Los contacto a través del Directorio Oficial de AutoScore para consultar disponibilidad técnica.`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="py-1.5 px-2 bg-[#25D366]/20 hover:bg-[#25D366]/30 text-[#25D366] border border-[#25D366]/30 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer"
                          >
                            <Phone className="w-3 h-3 fill-current" />
                            <span>Contactar WhatsApp</span>
                          </a>
                        ) : (
                          <span className="text-[10px] text-slate-500 flex items-center justify-center">
                            Sin teléfono público
                          </span>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            <div className="pt-2 border-t border-white/5 text-center shrink-0">
              <button
                type="button"
                onClick={() => setShowDirectorioTalleres(false)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Cerrar Directorio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ---------------- MODAL DE DETALLE DE OPINIONES Y AUDITORÍA DE UN TALLER ---------------- */}
      {tallerDetalleModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 animate-fade-in no-print">
          <div className="bg-[#0b0c10] border border-amber-500/40 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative max-h-[90vh] flex flex-col">
            <button
              type="button"
              onClick={() => setTallerDetalleModal(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-base font-bold cursor-pointer"
            >
              ✕
            </button>

            <div className="text-center border-b border-white/5 pb-3 shrink-0">
              <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                Auditoría de Calidad Técnica
              </span>
              <h4 className="text-base font-display font-black text-white mt-0.5">
                {tallerDetalleModal.mecanico.taller || "Taller Autorizado"}
              </h4>
              <p className="text-xs text-slate-400">
                Mecánico: <strong className="text-slate-200">{tallerDetalleModal.mecanico.nombre}</strong>
              </p>
              <div className="mt-2 inline-flex items-center gap-2 bg-slate-950 px-3 py-1 rounded-full border border-white/10 text-xs">
                <span className="font-extrabold text-amber-400">
                  {tallerDetalleModal.mecanico.porcentajeCalidad || 100}% de Aprobación
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-emerald-400 font-mono text-[11px]">
                  👍 {tallerDetalleModal.mecanico.totalPositivas || 0}
                </span>
                <span className="text-red-400 font-mono text-[11px]">
                  👎 {tallerDetalleModal.mecanico.totalNegativas || 0}
                </span>
              </div>
            </div>

            {/* Listado de Opiniones */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
              {tallerDetalleModal.opiniones.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500 space-y-1">
                  <p>Aún no hay reseñas registradas para este taller.</p>
                  <p className="text-[10px]">Los clientes pueden calificar sus servicios en el historial de su vehículo.</p>
                </div>
              ) : (
                tallerDetalleModal.opiniones.map((op: any, oIdx: number) => {
                  const esPositivo = op.evaluacion === "Bueno";
                  return (
                    <div
                      key={oIdx}
                      className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                        esPositivo
                          ? "bg-emerald-500/10 border-emerald-500/20 text-slate-200"
                          : "bg-red-500/10 border-red-500/25 text-slate-200"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                          esPositivo ? "text-emerald-400" : "text-red-400"
                        }`}>
                          <span>{esPositivo ? "👍" : "👎"}</span>
                          <span>{esPositivo ? "Calidad Aprobada" : "Reporte Negativo"}</span>
                        </span>
                        <span className="text-[9px] font-mono text-slate-400">
                          {op.fechaEvaluacion ? op.fechaEvaluacion.split(" ")[0] : op.fecha}
                        </span>
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono">
                        Vehículo: {op.placa ? op.placa.slice(0, 3) + "***" : "Homologado"} · Reparación: "{op.trabajoRealizado}"
                      </div>

                      {op.comentarioEvaluacion ? (
                        <p className={`p-2 rounded-xl text-[11px] leading-relaxed border ${
                          esPositivo 
                            ? "bg-black/40 text-emerald-100 border-emerald-500/20" 
                            : "bg-black/50 text-red-100 border-red-500/30 font-medium"
                        }`}>
                          "{op.comentarioEvaluacion}"
                        </p>
                      ) : (
                        <p className="text-[10px] text-slate-500 italic">
                          {esPositivo ? "El cliente calificó el trabajo como satisfactorio." : "El cliente reportó inconformidad técnica con este trabajo."}
                        </p>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="pt-2 border-t border-white/5 shrink-0">
              <button
                type="button"
                onClick={() => setTallerDetalleModal(null)}
                className="w-full bg-slate-900 hover:bg-slate-800 text-slate-300 font-bold py-2 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Volver al Directorio
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
