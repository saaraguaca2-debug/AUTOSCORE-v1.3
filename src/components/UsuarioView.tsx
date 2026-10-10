import React, { useState, useEffect } from "react";
import { 
  User, Car, Shield, QrCode, ClipboardList, Lock, Sparkles, ChevronLeft, 
  Search, Calendar, Gauge, Award, Wrench, RefreshCw, AlertCircle, HelpCircle, 
  CheckCircle, Download, Copy, Check, Phone, ExternalLink, ArrowRight, UserPlus,
  PenTool, Share2, FileText
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

          <div className="text-center">
            <button
              onClick={() => { setViewMode("registro"); setError(null); setSuccessMsg(null); }}
              className="text-xs text-slate-400 hover:text-amber-500 font-medium inline-flex items-center gap-1.5 py-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>¿No tienes cuenta? Registra tu usuario aquí</span>
            </button>
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
              className="text-[10px] font-bold bg-slate-950 hover:bg-slate-900 border border-white/5 text-slate-400 px-2.5 py-1.5 rounded-lg transition-colors"
            >
              Salir
            </button>
          </div>

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

          {/* VALIDACIÓN DE CERTIFICADO VENCIDO (BLOQUEO COMERCIAL) */}
          {selectedCar.estadoCertificado === "Vencido" ? (
            <div className="bg-red-950/20 border-2 border-red-500/30 p-6 rounded-3xl text-center space-y-4 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600 animate-pulse"></div>
              <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 mb-2">
                <Lock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-display font-black text-white">CERTIFICADO EXPIRADO</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                La visualización del Score mecánico, la descarga técnica y la auditoría cronológica están inhabilitadas por vencimiento de suscripción técnica.
              </p>
              
              <div className="bg-black/50 p-4 rounded-xl border border-white/5 text-xs font-mono text-slate-400 space-y-1">
                <div>Placa: <span className="text-amber-400 font-bold">{selectedCar.placa}</span></div>
                <div>Vehículo: <span>{selectedCar.marca} {selectedCar.modelo}</span></div>
              </div>

              {/* Botón Rojo Parpadeante al WhatsApp del Admin */}
              <a
                href={`https://wa.me/${adminPhoneEnv.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(
                  `Hola Administrador de AutoScore. Deseo pagar la renovación técnica del certificado para el vehículo placa ${selectedCar.placa} y reactivar mi Score de confianza.`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl text-xs transition-all animate-pulse shadow-lg border border-red-500/30 cursor-pointer"
              >
                <Phone className="w-4 h-4" />
                <span>Pagar Renovación por WhatsApp</span>
              </a>
            </div>
          ) : (
            <>
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
                          activeCertType === "simple"
                            ? "bg-white/20 text-white border border-white/25 shadow-sm"
                            : "text-slate-400 hover:text-white"
                        }`}
                      >
                        Simple
                      </button>
                      <button
                        onClick={() => setActiveCertType("completo")}
                        className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          activeCertType === "completo"
                            ? "bg-amber-500/25 text-amber-400 border border-amber-500/35 font-black shadow-sm"
                            : "text-slate-400 hover:text-amber-400"
                        }`}
                      >
                        Completo VIP
                      </button>
                    </div>
                  </div>

                  {/* Contenedor Físico Imprimible del Certificado */}
                  <div className={`cert-printable-card relative rounded-3xl p-5 border overflow-hidden ${
                    activeCertType === "completo"
                      ? "bg-gradient-to-b from-[#0f0e0c] to-[#040404] border-amber-500/40 shadow-2xl shadow-amber-500/5"
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
                          activeCertType === "completo"
                            ? "bg-amber-400/10 text-amber-400 border-amber-500/20"
                            : "bg-slate-400/10 text-slate-400 border-slate-400/20"
                        }`}>
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          <span>Certificado {activeCertType.toUpperCase()}</span>
                        </span>
                        <span className="block text-[8px] font-mono text-slate-400 uppercase tracking-widest mt-1">Sello Oficial Inalterable</span>
                      </div>
                      <Shield className={`w-5 h-5 ${activeCertType === "completo" ? "text-amber-500" : "text-slate-400"}`} />
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

                    {/* Resumen de Auditoría y QR de Validación para Compradores (Solo Certificado Completo) */}
                    {activeCertType === "completo" && (
                      <div className="mt-4 space-y-3.5 relative z-10">
                        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 space-y-3 text-left">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-500 flex items-center gap-1.5">
                              <ClipboardList className="w-3.5 h-3.5" />
                              <span>Auditoría de Salud Mecánica</span>
                            </span>
                            <span className="text-[10px] font-mono text-slate-300 bg-white/5 px-2 py-0.5 rounded border border-white/10">
                              {historial.length} Firmas en Taller
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[9px] text-slate-400 block font-mono">Último Kilometraje:</span>
                              <strong className="text-white font-mono text-sm block mt-0.5">
                                {historial.length > 0 && historial[0]?.kilometraje != null
                                  ? `${Number(historial[0].kilometraje).toLocaleString()} km`
                                  : "0 km"}
                              </strong>
                            </div>
                            <div className="bg-black/40 p-2.5 rounded-xl border border-white/5">
                              <span className="text-[9px] text-slate-400 block font-mono">Talleres Auditores:</span>
                              <strong className="text-amber-400 font-mono text-sm block mt-0.5">
                                {Array.from(new Set(historial.map(h => h.taller).filter(Boolean))).length} Talleres
                              </strong>
                            </div>
                          </div>

                          {/* QR Oficial de Validación Pública del Certificado para Compradores */}
                          <div className="cert-qr-container pt-2 border-t border-white/5 flex flex-col sm:flex-row items-center gap-3.5 bg-black/40 p-3 rounded-xl border border-amber-500/10">
                            <div className="bg-white p-2 rounded-xl shrink-0 shadow-md">
                              <img
                                src={generateQRCodeUrl()}
                                alt="QR Validación Certificado"
                                className="w-24 h-24 block"
                                referrerPolicy="no-referrer"
                              />
                            </div>
                            <div className="space-y-1 text-center sm:text-left">
                              <span className="inline-block text-[9px] font-mono font-black text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded uppercase">
                                Verificación Pública
                              </span>
                              <p className="text-[11px] text-white leading-tight font-bold">
                                Escanear para validar autenticidad en tiempo real
                              </p>
                              <p className="text-[9px] text-slate-300 leading-normal">
                                Cualquier interesado, comprador o aseguradora puede verificar este certificado directamente en la plataforma oficial de AutoScore.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* HISTORIAL OFICIAL DE MANTENIMIENTOS REGISTRADOS EN EL CERTIFICADO VIP */}
                        <div className="bg-slate-900/40 border border-white/10 rounded-2xl p-4 space-y-3.5 text-left">
                          <div className="flex items-center justify-between border-b border-white/5 pb-2">
                            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                              <Wrench className="w-3.5 h-3.5 text-amber-400" />
                              <span>Mantenimientos Certificados Registrados ({historial.length})</span>
                            </span>
                            <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded border border-white/10 font-bold">
                              Hoja de Vida Oficial
                            </span>
                          </div>

                          <div className="space-y-3 max-h-[460px] overflow-y-auto pr-1">
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
                        </div>

                        {/* Directorio de Talleres Auditores */}
                        {historial.length > 0 && (
                          <div className="pt-2 border-t border-white/5 space-y-2 text-left">
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
                      </div>
                    )}

                    {/* Información en Certificado Simple */}
                    {activeCertType === "simple" && (
                      <div className="mt-5 p-4 bg-slate-950/60 border border-white/10 rounded-2xl text-center relative z-10 space-y-1">
                        <p className="text-xs text-slate-300 font-semibold leading-normal">Constancia Oficial de Score emitida para uso personal.</p>
                        <p className="text-[10px] text-slate-400 max-w-[85%] mx-auto leading-normal">
                          Para acceder a la auditoría de intervenciones y compartir con compradores, seleccione el <strong>Certificado Completo VIP</strong>.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* OPCIONES DE COMPARTIR Y ACCIONES (no-print) */}
                  {activeCertType === "completo" && (
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

                  {/* Botón Imprimir / Guardar en PDF para dueño */}
                  <div className="space-y-2.5 no-print">
                    <button
                      onClick={() => window.print()}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-amber-500/25 py-3.5 rounded-2xl text-xs text-white font-black text-center flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Download className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                      <span>Imprimir / Descargar Certificado en PDF</span>
                    </button>
                    
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
                      <div className="flex justify-between items-center border-b border-white/10 pb-2">
                        <h5 className="text-[11px] font-mono font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
                          <ClipboardList className="w-4 h-4" />
                          <span>Firmas de Mantenimientos Registradas ({historial.length})</span>
                        </h5>
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
                    <button
                      onClick={() => window.print()}
                      className="w-full bg-slate-950 hover:bg-slate-900 border border-emerald-500/30 py-3.5 rounded-2xl text-xs text-white font-black text-center flex items-center justify-center gap-2 shadow-xl transition-all active:scale-[0.98] cursor-pointer"
                    >
                      <Download className="w-4.5 h-4.5 text-emerald-400 animate-bounce" />
                      <span>Imprimir / Descargar Bitácora de Firmas en PDF</span>
                    </button>

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
            </>
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

    </div>
  );
}
