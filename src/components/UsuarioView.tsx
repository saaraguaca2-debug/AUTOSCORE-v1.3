import React, { useState, useEffect } from "react";
import { 
  User, Car, Shield, QrCode, ClipboardList, Lock, Sparkles, ChevronLeft, 
  Search, Calendar, Gauge, Award, Wrench, RefreshCw, AlertCircle, HelpCircle, 
  CheckCircle, Download, Copy, Check, Phone, ExternalLink, ArrowRight, UserPlus,
  PenTool, Share2
} from "lucide-react";
import { Vehiculo, HistorialRow } from "../types";
import { 
  simularGetPorDueno, simularGetCertificado, simularRegistrarVehiculo, 
  simularLogin, simularRegistroUsuario, getSimulatedData
} from "../mockData";

// Decodificador seguro para prevenir fallas fatales (URI Malformed) en navegadores móviles
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

interface UsuarioViewProps {
  useSimulado: boolean;
  appScriptUrl: string;
}

export default function UsuarioView({ useSimulado, appScriptUrl }: UsuarioViewProps) {
  // Variables ocultas para Vercel / Entorno
  const adminPhoneEnv = (import.meta as any).env?.VITE_ADMIN_PHONE || (import.meta as any).env?.NEXT_PUBLIC_ADMIN_PHONE || "584121111111";

  // Estados de control de vista
  const [viewMode, setViewMode] = useState<"login" | "registro" | "garage" | "certificado">("login");
  const [loggedUser, setLoggedUser] = useState<{ idDueno: string; nombre: string } | null>(null);
  
  // Login / Registro Inputs
  const [idDuenoInput, setIdDuenoInput] = useState("");
  const [nombreInput, setNombreInput] = useState("");
  const [contrasenaInput, setContrasenaInput] = useState("");
  
  // Datos y Estados del Garage
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [selectedCar, setSelectedCar] = useState<Vehiculo | null>(null);
  const [activeCertType, setActiveCertType] = useState<"simple" | "completo">("simple");
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
      const urlSimulado = params.get("simulado");
      const urlApi = params.get("api");
      
      // FALLBACK SÓLIDO PARA EVITAR CONDICIÓN DE CARRERA DE ESTADOS DE REACT
      const isSimulado = urlSimulado !== null ? urlSimulado === "true" : useSimulado;
      const apiUr = urlApi ? safeDecodeURIComponent(urlApi) : appScriptUrl;

      if (isSimulado) {
        const res = simularGetCertificado(placa, tipo);
        if (res.success) {
          setSelectedCar(res.vehiculo);
          setHistorial(res.historial || []);
          setActiveCertType(tipo);
          setViewMode("certificado");
        } else {
          setError(res.error || "No se pudo recuperar el certificado.");
        }
      } else {
        if (!apiUr) {
          throw new Error("Debe configurar la URL del Google Sheets Apps Script.");
        }
        const fetchUrl = `${apiUr}?placa=${encodeURIComponent(placa.toUpperCase())}&tipoCertificado=${tipo}`;
        const response = await fetch(fetchUrl, { method: "GET", mode: "cors" });
        if (!response.ok) throw new Error("Fallo en la comunicación con el servidor.");
        const result = await response.json();
        if (result && result.success) {
          setSelectedCar(result.vehiculo);
          setHistorial(normalizeHistorial(result.historial || []));
          setActiveCertType(tipo);
          setViewMode("certificado");
        } else {
          setError(result.error || "Fallo en la respuesta de Google Sheets.");
        }
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
      if (useSimulado) {
        const res = simularLogin(idDuenoInput, contrasenaInput);
        if (res.success && res.usuario) {
          const resVeh = simularGetPorDueno(idDuenoInput);
          setVehiculos(resVeh.data || []);
          setLoggedUser({
            idDueno: res.usuario?.idDueno || idDuenoInput.trim(),
            nombre: res.usuario?.nombre || idDuenoInput.trim()
          });
          setViewMode("garage");
        } else {
          setError(res.error || "Error de credenciales.");
        }
      } else {
        if (!appScriptUrl) {
          throw new Error("La URL de Google Sheets Apps Script no está configurada.");
        }
        const url = `${appScriptUrl}?accion=login&idDueno=${encodeURIComponent(idDuenoInput.trim())}&contrasena=${encodeURIComponent(contrasenaInput.trim())}`;
        const res = await fetch(url, { method: "GET", mode: "cors" });
        if (!res.ok) throw new Error("Error de conexión con Google Sheets.");
        const json = await res.json();
        if (json && json.success) {
          // Obtener vehículos de este dueño de forma ultra segura
          const userObj = json.usuario || json.user || {};
          const cleanId = userObj.idDueno || userObj.IdDueno || idDuenoInput.trim();
          const cleanNombre = userObj.nombre || userObj.Nombre || idDuenoInput.trim();

          const vehUrl = `${appScriptUrl}?idDueno=${encodeURIComponent(cleanId)}`;
          const vehRes = await fetch(vehUrl, { method: "GET", mode: "cors" });
          const vehJson = await vehRes.json();
          setVehiculos(vehJson.data || []);
          setLoggedUser({
            idDueno: cleanId,
            nombre: cleanNombre
          });
          setViewMode("garage");
        } else {
          setError(json.error || "Error de autenticación.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Fallo la comunicación con el servidor.");
    } finally {
      setLoading(false);
    }
  };

  // Registro de Propietarios (Nuevo Cliente en estado Pendiente)
  const handleRegistro = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDuenoInput.trim() || !nombreInput.trim() || !contrasenaInput.trim()) {
      setError("Por favor complete todos los datos requeridos.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      if (useSimulado) {
        const res = simularRegistroUsuario(idDuenoInput, nombreInput, contrasenaInput);
        if (res.success) {
          setSuccessMsg("¡Registro Exitoso! Tu cuenta está en espera de aprobación por el Administrador.");
          setViewMode("login");
          setNombreInput("");
          setContrasenaInput("");
        } else {
          setError(res.error || "Error en el auto-registro.");
        }
      } else {
        if (!appScriptUrl) {
          throw new Error("URL de Sheets no configurada.");
        }
        const payload = {
          accion: "registroUsuario",
          idDueno: idDuenoInput.trim(),
          nombre: nombreInput.trim(),
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
          setSuccessMsg("¡Registro guardado! Cuenta PENDIENTE de aprobación por el Administrador.");
          setViewMode("login");
          setNombreInput("");
          setContrasenaInput("");
        } else {
          setError(json.error || "Fallo el registro en Google Sheets.");
        }
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

    try {
      if (useSimulado) {
        const res = simularGetCertificado(veh.placa, tipo);
        if (res.success) {
          setSelectedCar(res.vehiculo);
          setHistorial(normalizeHistorial(res.historial || []));
          setViewMode("certificado");
        } else {
          setError(res.error || "No se pudo recuperar el certificado.");
        }
      } else {
        if (!appScriptUrl) throw new Error("URL de Sheets no configurada.");
        const fetchUrl = `${appScriptUrl}?placa=${encodeURIComponent(veh.placa)}&tipoCertificado=${tipo}`;
        const response = await fetch(fetchUrl, { method: "GET", mode: "cors" });
        if (!response.ok) throw new Error("Error en red.");
        const result = await response.json();
        if (result && result.success) {
          setSelectedCar(result.vehiculo);
          setHistorial(normalizeHistorial(result.historial || []));
          setViewMode("certificado");
        } else {
          setError(result.error || "No se encontró el certificado.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Error al sincronizar con el Sheets.");
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
      if (useSimulado) {
        const res = simularRegistrarVehiculo(nuevoVehiculo);
        if (res.success) {
          setVehiculos((prev) => [...prev, nuevoVehiculo]);
          setMostrarFormCar(false);
          setNewPlaca("");
          setNewMarca("");
          setNewModelo("");
          setNewAnio("");
        } else {
          setError(res.error || "Error al registrar vehículo.");
        }
      } else {
        if (!appScriptUrl) throw new Error("URL de Sheets no configurada.");
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
          setError(json.error || "No se pudo registrar en Google Sheets.");
        }
      }
    } catch (err: any) {
      setError(err.message || "Fallo la sincronización.");
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
    let path = `${basePath}?placa=${selectedCar.placa}&tipoCertificado=completo&simulado=${useSimulado}`;
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
  const getMechanicPhone = (row: any, localMecs: any[]): string => {
    if (!row) return "";
    
    // 1. Intentar buscar en las columnas comunes que podrían venir desde Google Sheets (con varias ortografías, mayúsculas/minúsculas, "whatsapp", "celular", etc.)
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
    
    // 2. Si no viene en el registro directo de Sheets, buscar en los mecánicos locales usando el código de firma digital
    const rawCode = row.codigoMecanico || row.codigo || "";
    const cleanCode = String(rawCode).trim().toLowerCase();
    if (cleanCode) {
      const match = localMecs.find(
        m => String(m.codigoMecanico || "").trim().toLowerCase() === cleanCode
      );
      if (match) {
        // Buscar teléfono en cualquier propiedad posible del mecánico encontrado
        for (const key of keys) {
          if (match[key] !== undefined && match[key] !== null && String(match[key]).trim()) {
            return String(match[key]).trim();
          }
        }
        if (match.telefono) {
          return String(match.telefono).trim();
        }
      }
    }
    
    return "";
  };

  // Normalizar de forma ultra robusta los registros de historial para que sus campos siempre coincidan con las expectativas de la UI
  const normalizeHistorial = (rawHistorial: any[]): HistorialRow[] => {
    if (!Array.isArray(rawHistorial)) return [];
    return rawHistorial.map((row) => {
      const normalized: any = { ...row };
      
      // 1. Encontrar el código de mecánico
      const codeKeys = [
        "codigoMecanico", "codigomecanico", "codigo_mecanico", "codigoMec", 
        "codigo_mec", "codigo", "cod", "mecanico", "mecanicoCodigo", 
        "idMecanico", "id_mecanico", "idmecanico", "firma", "sello"
      ];
      for (const key of codeKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
          normalized.codigoMecanico = String(row[key]).trim();
          break;
        }
      }
      
      // 2. Encontrar el taller
      const tallerKeys = [
        "taller", "nombretaller", "nombre_taller", "taller_mecanico", "establecimiento", "empresa"
      ];
      for (const key of tallerKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
          normalized.taller = String(row[key]).trim();
          break;
        }
      }

      // 3. Encontrar la fecha
      const fechaKeys = [
        "fecha", "fecha_servicio", "fechaServicio", "dia", "date", "createdat"
      ];
      for (const key of fechaKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
          normalized.fecha = String(row[key]).trim();
          break;
        }
      }

      // 4. Encontrar el kilometraje
      const kmKeys = [
        "kilometraje", "km", "kilómetros", "kilometros", "kms", "odometro", "odómetro"
      ];
      for (const key of kmKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
          normalized.kilometraje = Number(String(row[key]).replace(/[^0-9]/g, "")) || 0;
          break;
        }
      }

      // 5. Encontrar el trabajo realizado
      const trabajoKeys = [
        "trabajoRealizado", "trabajo_realizado", "trabajorealizado", "trabajo", "descripcion", "servicio", "mantenimiento"
      ];
      for (const key of trabajoKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
          normalized.trabajoRealizado = String(row[key]).trim();
          break;
        }
      }

      // 6. Encontrar el teléfono del mecánico si viniera en el historial
      const telKeys = [
        "telefonoMecanico", "telefono", "telefono_mecanico", "telefonoMec",
        "teléfono", "Teléfono", "Telefono", "TELEFONO", "TELÉFONO", "tel", "phone",
        "wassap", "Wassap", "WASSAP", "whatsapp", "WhatsApp", "WHATSAPP", "wasa", "Wasa"
      ];
      for (const key of telKeys) {
        if (row[key] !== undefined && row[key] !== null && String(row[key]).trim()) {
          normalized.telefonoMecanico = String(row[key]).trim();
          break;
        }
      }

      // 7. Si no viene directo, buscar por CodigoMecanico en el listado de mecánicos locales para hidratarlo de forma ultra segura
      if (!normalized.telefonoMecanico && normalized.codigoMecanico) {
        try {
          const localMecs = getSimulatedData().mecanicos;
          const cleanCode = String(normalized.codigoMecanico).trim().toLowerCase();
          const match = localMecs.find(
            m => String(m.codigoMecanico || "").trim().toLowerCase() === cleanCode
          );
          if (match && match.telefono) {
            normalized.telefonoMecanico = String(match.telefono).trim();
          }
        } catch (e) {
          console.warn("Error hidratando telefonoMecanico:", e);
        }
      }

      // Valores por defecto seguros si no se encontraron
      if (!normalized.codigoMecanico) {
        normalized.codigoMecanico = row.codigoMecanico || row.codigo || "";
      }
      if (!normalized.taller) {
        normalized.taller = row.taller || "Taller Oficial";
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
    const localMecanicos = getSimulatedData().mecanicos;

    historial.forEach((row) => {
      const cod = row.codigoMecanico || "";
      if (cod && !uniqueMecsMap[cod]) {
        const tel = getMechanicPhone(row, localMecanicos);
        const foundM = localMecanicos.find(m => m.codigoMecanico === cod);
        uniqueMecsMap[cod] = {
          taller: row.taller,
          nombre: foundM ? foundM.nombre : "Técnico Certificado",
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
    let publicLink = `${basePath}?placa=${selectedCar.placa}&tipoCertificado=completo&simulado=${useSimulado}`;
    if ((!usarQrUltraligero || !useSimulado) && appScriptUrl) {
      publicLink += `&api=${encodeURIComponent(appScriptUrl)}`;
    }
    return `https://api.qrserver.com/v1/create-qr-code/?size=600x600&color=000000&ecc=H&data=${encodeURIComponent(publicLink)}`;
  };

  // URL del QR para firma de mecánicos
  const generateMecanicoQRCodeUrl = () => {
    if (!selectedCar) return "";
    const basePath = getCleanBaseAndPath();
    let mechanicLink = `${basePath}?vista=mecanico&placa=${selectedCar.placa}&simulado=${useSimulado}`;
    if ((!usarQrUltraligero || !useSimulado) && appScriptUrl) {
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
              <div key={idx} className="bg-slate-950/40 border border-white/5 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-mono text-slate-500 uppercase tracking-wider">{car.marca}</span>
                    <h4 className="text-base font-display font-extrabold text-white mt-0.5">{car.modelo} <span className="text-slate-400 font-normal text-xs">({car.anio})</span></h4>
                    <span className="inline-block bg-black border border-white/10 font-mono text-xs font-bold tracking-widest px-2.5 py-0.5 rounded text-slate-300 mt-2">
                      {car.placa}
                    </span>
                  </div>
                  
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    car.estadoCertificado === "Activo"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-red-500/10 text-red-400 border border-red-500/20"
                  }`}>
                    Cert: {car.estadoCertificado}
                  </span>
                </div>

                <div className="pt-3 border-t border-white/5 grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleVerCertificado(car, "simple")}
                    className="py-1.5 text-[11px] font-bold bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-center"
                  >
                    Certificado Simple
                  </button>
                  <button
                    onClick={() => handleVerCertificado(car, "completo")}
                    className="py-1.5 text-[11px] font-bold bg-amber-500/10 hover:bg-amber-500/25 border border-amber-500/20 text-amber-400 rounded-lg text-center"
                  >
                    Certificado Completo
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

      {/* ---------------- VISTA D: CERTIFICADO VIP DETALLADO ---------------- */}
      {viewMode === "certificado" && selectedCar && (
        <div className="space-y-5 animate-fade-in">
          
          {/* Botón Volver */}
          <div className="flex items-center justify-between no-print">
            <button
              onClick={handleBackToGarage}
              className="flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-extrabold uppercase tracking-wider"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              <span>Volver</span>
            </button>
            <span className="text-[10px] font-mono text-slate-500">AUTOSCORE VERIFIED ID</span>
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
                className="w-full inline-flex items-center justify-center gap-2 bg-red-500 hover:bg-red-600 text-white font-black py-4 rounded-2xl text-xs transition-all animate-pulse shadow-lg border border-red-500/30"
              >
                <Phone className="w-4 h-4" />
                <span>Pagar Renovación por WhatsApp</span>
              </a>
            </div>
          ) : (
            // CERTIFICADO VÁLIDO (SIMPLE O COMPLETO)
            <div className="space-y-4">
              
              {/* Contenedor Físico del Certificado */}
              <div className={`relative rounded-3xl p-5 border overflow-hidden ${
                activeCertType === "completo"
                  ? "bg-gradient-to-b from-[#0f0e0c] to-[#040404] border-amber-500/40 shadow-2xl shadow-amber-500/5"
                  : "bg-gradient-to-b from-slate-900/60 to-slate-950/90 border-white/10 shadow-xl"
              }`}>
                
                {/* MARCA DE AGUA DIGITAL EN FONDO SATINADO (SOLO COMPLETO) */}
                {activeCertType === "completo" && (
                  <div className="absolute inset-0 pointer-events-none select-none overflow-hidden opacity-[0.03] flex items-center justify-center">
                    <div className="text-[52px] font-black text-amber-500 tracking-widest uppercase rotate-[-30deg] whitespace-nowrap leading-none space-y-8 select-none">
                      <div>AUTOSCORE CERTIFIED</div>
                      <div>VERIFICADO VIP</div>
                      <div>AUTOSCORE CERTIFIED</div>
                    </div>
                  </div>
                )}

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
                    <span className="block text-[8px] font-mono text-slate-500 uppercase tracking-widest mt-1">Sello Oficial Inalterable</span>
                  </div>
                  <Shield className={`w-5 h-5 ${activeCertType === "completo" ? "text-amber-500" : "text-slate-400"}`} />
                </div>

                {/* Caja de Datos y Score en Grande */}
                <div className="bg-black/50 border border-white/5 rounded-2xl p-4 space-y-4 relative z-10">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-center sm:text-left">
                      <span className="text-[9px] text-slate-500 font-mono uppercase tracking-wider block">UNIDAD EVALUADA</span>
                      <h4 className="text-lg font-display font-black text-white mt-0.5 leading-tight">{selectedCar.marca} {selectedCar.modelo}</h4>
                      <span className="text-xs text-slate-400 font-light block">Año fabricación: {selectedCar.anio}</span>
                      <div className="inline-block bg-slate-900 border border-white/10 font-mono text-xs font-bold tracking-widest px-3 py-1 rounded text-slate-300 mt-2">
                        PLACA: {selectedCar.placa}
                      </div>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className={`w-28 h-28 rounded-full border-4 border-amber-500/10 flex flex-col items-center justify-center ${getScoreColor(selectedCar.score)}`}>
                        <span className="text-3xl font-black text-white leading-none">{selectedCar.score}</span>
                        <span className="text-[9px] font-bold tracking-widest uppercase opacity-75 mt-1">SCORE</span>
                      </div>
                      <span className="text-[10px] text-slate-400 mt-2 font-black uppercase tracking-wider">
                        {getSaludMecanicaTag(selectedCar.score)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Bloque QR de Firma Técnica Integrado en el Certificado / Hoja del Vehículo */}
                <div className="mt-4 p-4 bg-emerald-950/25 border border-emerald-500/20 rounded-2xl relative z-10 text-left">
                  <div className="flex items-center gap-3 mb-2.5">
                    <PenTool className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
                    <div>
                      <h5 className="text-[10px] font-mono font-bold uppercase tracking-wider text-emerald-400 leading-none">REGISTRO DE FIRMA TÉCNICA</h5>
                      <span className="text-[8px] text-slate-400 block mt-0.5">Escáner rápido para el mecánico o taller de confianza</span>
                    </div>
                  </div>
                  
                  <div className="flex flex-col sm:flex-row items-center gap-4 bg-black/40 p-3 rounded-xl border border-emerald-500/10">
                    <div className="bg-white p-2.5 rounded-xl shrink-0 shadow-md">
                      <img
                        src={generateMecanicoQRCodeUrl()}
                        alt="QR Firma Técnico"
                        className="w-28 h-28 block"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <div className="space-y-1.5 text-center sm:text-left">
                      <span className="inline-block text-[9px] font-mono font-black text-white bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded uppercase">
                        Placa: {selectedCar.placa}
                      </span>
                      <p className="text-[11px] text-slate-300 leading-tight font-bold">
                        Escanear para firmar reparaciones en este vehículo
                      </p>
                      <p className="text-[9px] text-slate-400 leading-normal">
                        Pre-carga automáticamente los datos del <strong>{selectedCar.marca} {selectedCar.modelo} ({selectedCar.anio})</strong> para registrar su firma digital y actualizar su score de salud mecánica de forma instantánea.
                      </p>
                    </div>
                  </div>
                </div>

                {/* LÍNEA DE TIEMPO COMPLETA (SOLO CERTIFICADO COMPLETO) */}
                {activeCertType === "completo" && (
                  <div className="mt-6 space-y-4 relative z-10">
                    <h5 className="text-[10px] font-mono font-bold uppercase tracking-widest text-amber-500 flex items-center gap-1.5 border-b border-white/5 pb-2">
                      <ClipboardList className="w-4 h-4" />
                      <span>Línea de Tiempo Verificada ({historial.length})</span>
                    </h5>

                    <div className="space-y-5 max-h-[360px] overflow-y-auto pr-1">
                      {historial.map((row, idx) => {
                        // Obtener teléfono del mecánico de forma segura directamente desde la propiedad telefonoMecanico hidratada
                        const tel = row.telefonoMecanico || "";
                        const formattedTel = formatWhatsAppNumber(tel);
                        
                        const localMecanicos = getSimulatedData().mecanicos;
                        const foundMec = localMecanicos.find(m => m.codigoMecanico === row.codigoMecanico);
                        const nombreMec = foundMec ? foundMec.nombre : "Técnico Certificado";
                        const maskedCode = row.codigoMecanico ? String(row.codigoMecanico).replace(/./g, (c, i) => i === 0 ? c : "*") : "";

                        // Mensaje personalizado de corroboración para compradores interesados
                        const textMsg = `Hola ${row.taller || "Taller"}. Estoy evaluando la compra del vehículo ${selectedCar?.marca} ${selectedCar?.modelo} (Placa: ${selectedCar?.placa}) y en su Certificado de AutoScore aparece registrado que ustedes realizaron el siguiente trabajo el día ${row.fecha ? row.fecha.split(" ")[0] : ""} con ${row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km:\n\n"${row.trabajoRealizado}"\n\n¿Podrían confirmarme la validez de este servicio realizado en su taller? Muchas gracias.`;

                        return (
                          <div key={idx} className="border-l-2 border-amber-500 pl-4 py-2 relative space-y-3 bg-slate-950/20 rounded-r-xl pr-2 hover:bg-slate-950/40 transition-all duration-200">
                            {/* Fecha y Kilometraje */}
                            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                              <span className="bg-slate-900 border border-white/5 px-2 py-0.5 rounded text-slate-300 font-bold">{row.fecha ? row.fecha.split(" ")[0] : ""}</span>
                              <span className="text-amber-400 font-extrabold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/10">{row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km</span>
                            </div>
                            
                            {/* Trabajo Realizado */}
                            <p className="text-xs text-slate-100 leading-relaxed font-normal bg-black/30 p-2.5 rounded-lg border border-white/5">{row.trabajoRealizado}</p>
                            
                            {/* ENLACE QUE ABRE TARJETA DEL TALLER */}
                            <div className="flex justify-start">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveTecnicoModal({
                                    taller: row.taller,
                                    codigo: row.codigoMecanico,
                                    nombreMecanico: nombreMec,
                                    telefono: tel,
                                    fecha: row.fecha,
                                    kilometraje: row.kilometraje,
                                    trabajo: row.trabajoRealizado
                                  });
                                }}
                                className="text-[9.5px] font-bold text-amber-400 hover:text-amber-300 bg-amber-500/5 hover:bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20 transition-all flex items-center gap-1.5 active:scale-95 cursor-pointer"
                              >
                                <Shield className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                <span>Ver Tarjeta del Taller ({row.taller})</span>
                              </button>
                            </div>

                            {/* TARJETA DEL TALLER INTEGRADA (Trazabilidad Inmediata) */}
                            <div className="bg-[#0b0c10] border border-emerald-500/20 rounded-xl p-3 flex flex-col xs:flex-row items-stretch xs:items-center justify-between gap-3 shadow-md">
                              <div className="text-left space-y-0.5">
                                <div className="flex items-center gap-1.5">
                                  <Shield className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTecnicoModal({
                                        taller: row.taller,
                                        codigo: row.codigoMecanico,
                                        nombreMecanico: nombreMec,
                                        telefono: tel,
                                        fecha: row.fecha,
                                        kilometraje: row.kilometraje,
                                        trabajo: row.trabajoRealizado
                                      });
                                    }}
                                    className="font-black text-white text-[11px] uppercase tracking-wide hover:text-emerald-400 transition-colors text-left cursor-pointer"
                                  >
                                    {row.taller}
                                  </button>
                                </div>
                                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[9px] text-slate-400 font-mono">
                                  <span className="text-emerald-500 font-bold">Mecánico: {nombreMec}</span>
                                  <span className="text-slate-500">• Sello Digital: #{maskedCode}</span>
                                  {tel && <span className="text-slate-500">• Tel: {tel}</span>}
                                </div>
                              </div>
                              
                              {/* Botón de Contacto Directo WhatsApp - Siempre visible en verde brillante, con fallback al administrador */}
                              {(() => {
                                const hasPhone = !!formattedTel;
                                const finalPhone = hasPhone ? formattedTel : formatWhatsAppNumber(adminPhoneEnv);
                                const targetName = hasPhone ? (row.taller || "Taller") : "Soporte Técnico";
                                const directTextMsg = `Hola ${targetName}. Estoy evaluando la compra del vehículo ${selectedCar?.marca || ""} ${selectedCar?.modelo || ""} (Placa: ${selectedCar?.placa || ""}) y en su Certificado de AutoScore aparece registrado que el taller "${row.taller || "Taller"}" realizó el siguiente trabajo el día ${row.fecha ? row.fecha.split(" ")[0] : ""} con ${row.kilometraje != null ? Number(row.kilometraje).toLocaleString() : "0"} km:\n\n"${row.trabajoRealizado || ""}"\n\n¿Podrían confirmarme la validez de este servicio? Muchas gracias.`;
                                
                                return (
                                  <a
                                    href={`https://wa.me/${finalPhone}?text=${encodeURIComponent(directTextMsg)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black px-3 py-2 rounded-lg text-[9.5px] flex items-center justify-center gap-1.5 transition-all active:scale-95 shrink-0 shadow-lg border border-emerald-400/20 cursor-pointer"
                                  >
                                    <Phone className="w-3 h-3 shrink-0 fill-current" />
                                    <span>Contactar por WhatsApp</span>
                                    <ExternalLink className="w-2.5 h-2.5 opacity-85 shrink-0" />
                                  </a>
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })}
                      {historial.length === 0 && (
                        <p className="text-xs text-slate-500 text-center py-4">No se han firmado mantenimientos técnicos aún.</p>
                      )}
                    </div>

                    {/* SECCIÓN CONSOLIDADA DE MECÁNICOS CERTIFICADOS CON ENLACE DE WHATSAPP DIRECTO */}
                    {historial.length > 0 && (
                      <div className="bg-emerald-500/5 border border-emerald-500/20 p-4 rounded-2xl mt-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-emerald-400" />
                            <span className="text-[10px] font-mono font-bold text-slate-200 uppercase tracking-wider">Mecánicos Reparadores ({
                              Array.from(new Set(historial.map(h => h.codigoMecanico).filter(Boolean))).length
                            })</span>
                          </div>
                          
                          <button
                            onClick={copyMecanicosTrazabilidad}
                            className="text-[8.5px] font-bold text-slate-300 hover:text-amber-400 border border-white/10 hover:border-amber-500/30 px-2 py-0.5 rounded transition-all bg-slate-950 flex items-center gap-1"
                          >
                            {copiedMecanicos ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5 text-amber-500" />}
                            <span>Copiar Lista</span>
                          </button>
                        </div>

                        <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                          {(() => {
                            const uniqueMecsMap: { [key: string]: { taller: string, nombre: string, telefono: string, codigo: string } } = {};
                            const localMecanicos = getSimulatedData().mecanicos;

                            historial.forEach((row) => {
                              const cod = row.codigoMecanico || "";
                              if (cod && !uniqueMecsMap[cod]) {
                                const tel = getMechanicPhone(row, localMecanicos);
                                const foundM = localMecanicos.find(m => m.codigoMecanico === cod);
                                uniqueMecsMap[cod] = {
                                  taller: row.taller,
                                  nombre: foundM ? foundM.nombre : "Técnico Certificado",
                                  telefono: tel ? String(tel) : "",
                                  codigo: cod
                                };
                              }
                            });

                            return Object.values(uniqueMecsMap).map((mec, index) => {
                              const cleanedPhone = formatWhatsAppNumber(mec.telefono);
                              const maskedSeal = mec.codigo ? String(mec.codigo).replace(/./g, (c, i) => i === 0 ? c : "*") : "";
                              const textMsg = `Hola ${mec.taller}. Estoy evaluando la compra del vehículo placa ${selectedCar?.placa} y en la plataforma de AutoScore aparece registrado que ustedes firmaron su mantenimiento con sello digital #${maskedSeal}. ¿Podrían confirmarme la validez de estos trabajos en su taller? Muchas gracias.`;
                              
                              return (
                                <div key={index} className="flex items-center justify-between p-2 bg-slate-950/80 border border-white/5 rounded-xl text-xs">
                                  <div>
                                    <span className="font-extrabold text-white block truncate max-w-[150px]">{mec.taller}</span>
                                    <span className="text-[9px] text-slate-400 block font-mono">Mecánico: {mec.nombre}</span>
                                    <span className="text-[8px] text-slate-500 font-mono block">Sello Digital: #{maskedSeal}</span>
                                  </div>
                                  
                                  {(() => {
                                    const hasPhone = !!mec.telefono;
                                    const finalPhone = hasPhone ? cleanedPhone : formatWhatsAppNumber(adminPhoneEnv);
                                    const targetName = hasPhone ? mec.taller : "Soporte / Administrador";
                                    const customTextMsg = `Hola ${targetName}. Estoy evaluando la compra del vehículo placa ${selectedCar?.placa || ""} y en la plataforma de AutoScore aparece registrado que el taller "${mec.taller}" firmó su mantenimiento con sello digital #${maskedSeal}. ¿Podrían confirmarme la validez de estos trabajos? Muchas gracias.`;
                                    
                                    return (
                                      <a
                                        href={`https://wa.me/${finalPhone}?text=${encodeURIComponent(customTextMsg)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#25D366] font-bold px-2.5 py-1 rounded text-[10px] flex items-center gap-1.5 transition-all border border-[#25D366]/20 active:scale-95 cursor-pointer"
                                      >
                                        <Phone className="w-3 h-3 text-[#25D366] fill-current" />
                                        <span>{hasPhone ? "WhatsApp" : "Soporte"}</span>
                                        <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                                      </a>
                                    );
                                  })()}
                                </div>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* INFORMACIÓN SIMPLE (OCULTA LÍNEA DE TIEMPO) */}
                {activeCertType === "simple" && (
                  <div className="mt-5 p-4 bg-slate-950/60 border border-white/5 rounded-2xl text-center relative z-10 space-y-1">
                    <p className="text-xs text-slate-400 font-semibold leading-normal">Línea de Tiempo detallada oculta por privacidad personal.</p>
                    <p className="text-[10px] text-slate-600 max-w-[80%] mx-auto leading-normal">
                      La versión simple está bloqueada para compartirse y no genera ningún tipo de link ni QR de acceso externo.
                    </p>
                  </div>
                )}
              </div>

              {/* OPCIONES DE COMPARTIR INTERACTIVAS (SOLO COMPLETO) */}
              {activeCertType === "completo" && (
                <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl space-y-4 no-print text-left">
                  <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                    <Share2 className="w-4 h-4 text-amber-500" />
                    <span className="block text-[10px] font-bold text-slate-300 uppercase tracking-widest">COMPARTIR CERTIFICADO PRESTIGIO</span>
                  </div>

                  <div className="flex flex-col gap-2.5">
                    {/* ACCIÓN PRINCIPAL: COMPARTIR DIRECTAMENTE EN WHATSAPP */}
                    <a
                      href={`https://wa.me/?text=${encodeURIComponent(
                        `¡Hola! Te comparto el Certificado Oficial de AutoScore de mi vehículo *${selectedCar.marca} ${selectedCar.modelo} ${selectedCar.anio}* (Placa: *${selectedCar.placa}*), con un Score de Salud Mecánica de *${selectedCar.score}/100*. Puedes verificar todo el historial detallado de mantenimientos certificados en talleres autorizados aquí:\n\n${getPublicShareUrl()}`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 shadow-lg hover:shadow-[#25D366]/10 active:scale-[0.99]"
                    >
                      <Phone className="w-4 h-4 shrink-0 fill-current" />
                      <span>Compartir por WhatsApp</span>
                    </a>

                    {/* ACCIÓN SECUNDARIA: COPIAR ENLACE */}
                    <button
                      onClick={copyPublicLink}
                      className="w-full bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 font-bold py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-[0.99]"
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

                  {/* AJUSTES AVANZADOS Y CÓDIGOS QR (COLAPSADOS PARA EVITAR RUIDO VISUAL) */}
                  <details className="group border border-white/5 bg-slate-950/40 rounded-xl overflow-hidden">
                    <summary className="cursor-pointer text-[9.5px] font-bold text-slate-400 hover:text-white p-3 flex justify-between items-center select-none bg-slate-950/25">
                      <span className="flex items-center gap-1.5 font-mono uppercase tracking-wider">
                        <QrCode className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Ver Código QR de Firma Técnica (Avanzado)</span>
                      </span>
                      <span className="text-[8px] opacity-70 transition-transform group-open:rotate-180">▼</span>
                    </summary>
                    <div className="p-3 border-t border-white/5 space-y-4 bg-slate-950/15">
                      <div className="flex flex-col items-stretch gap-2">
                        {/* QR Mecánico */}
                        <button
                          onClick={() => {
                            setShowMecanicoQR(!showMecanicoQR);
                          }}
                          className={`p-2.5 rounded-lg border text-[10px] font-bold transition-all text-center flex flex-col items-center justify-center gap-1.5 ${
                            showMecanicoQR
                              ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                              : "bg-slate-900 border-white/5 text-slate-300 hover:bg-slate-900/80"
                          }`}
                        >
                          <PenTool className="w-4 h-4 text-emerald-400" />
                          <div>
                            <span className="block leading-tight text-emerald-400 font-extrabold">QR para Mecánico</span>
                            <span className="block text-[8px] font-normal text-slate-400 mt-0.5">Para firmar en sitio</span>
                          </div>
                        </button>
                      </div>

                      {/* AJUSTE COMPATIBILIDAD QR PARA CELULARES */}
                      <div className="bg-slate-950 p-3 rounded-lg border border-white/5 space-y-2.5">
                        <div className="flex items-center justify-between gap-3">
                          <div className="text-left">
                            <span className="text-[9px] font-bold text-white block">Sello QR Ultraligero</span>
                            <span className="text-[8px] text-slate-400 block mt-0.5">Mejora el escaneo en teléfonos antiguos</span>
                          </div>
                          <button
                            onClick={() => setUsarQrUltraligero(!usarQrUltraligero)}
                            className={`text-[8px] font-black px-2 py-1 rounded transition-all shrink-0 ${
                              usarQrUltraligero
                                ? "bg-amber-500 text-slate-950"
                                : "bg-slate-900 border border-white/10 text-slate-300"
                            }`}
                          >
                            {usarQrUltraligero ? "⚡ Activado" : "Standard"}
                          </button>
                        </div>

                        <div className="pt-2 border-t border-white/5">
                          <label className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                            URL Base del Servidor (QR)
                          </label>
                          <div className="flex gap-1">
                            <input
                              type="text"
                              value={baseUrlOverride}
                              onChange={(e) => setBaseUrlOverride(e.target.value)}
                              placeholder="Ej: https://mi-dominio.com"
                              className="flex-1 bg-slate-900 text-[9.5px] text-slate-200 border border-white/10 px-2.5 py-1 rounded font-mono focus:outline-none"
                            />
                            <button
                              onClick={() => setBaseUrlOverride(window.location.origin)}
                              className="bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white px-2 py-1 rounded text-[8px] font-bold transition-all border border-white/5 shrink-0"
                            >
                              Reset
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* RENDER QR MECÁNICO */}
                      {showMecanicoQR && (
                        <div className="p-3 bg-slate-950 border border-emerald-500/10 rounded-lg text-center space-y-2">
                          <div className="bg-white p-3 rounded-xl inline-block shadow-lg border border-emerald-500/10">
                            <img
                              src={generateMecanicoQRCodeUrl()}
                              alt="QR Firma Técnico"
                              className="w-52 h-52 block mx-auto"
                              referrerPolicy="no-referrer"
                            />
                          </div>
                          <p className="text-[10px] text-slate-300 leading-tight">
                            El mecánico escanea este código para firmar reparaciones del vehículo desde su celular de forma directa.
                          </p>
                        </div>
                      )}
                    </div>
                  </details>
                </div>
              )}

              {/* Botón Imprimir / Guardar en PDF para dueño */}
              <div className="space-y-2.5 no-print">
                <button
                  onClick={() => window.print()}
                  className="w-full bg-slate-950 hover:bg-slate-900 border border-white/5 py-3 rounded-2xl text-xs text-slate-300 hover:text-white font-bold text-center flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.98]"
                >
                  <Download className="w-4.5 h-4.5 text-amber-500 animate-bounce" />
                  <span>Imprimir / Descargar en PDF</span>
                </button>
                
                {typeof window !== "undefined" && window.self !== window.top && (
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left">
                    <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">⚠️ Restricción de Vista Previa</span>
                    <p className="text-[9.5px] text-slate-300 leading-normal mt-1">
                      El botón de impresión está bloqueado por la seguridad del visualizador de AI Studio. Haz clic en el botón <strong className="text-white">"Abrir en nueva pestaña"</strong> arriba a la derecha para ver la app en pantalla completa y poder descargar tu PDF.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL FLOTANTE DE TRAZABILIDAD (VERIFICAR TALLER REAL) */}
      {activeTecnicoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-[#0b0c10] border border-emerald-500/30 rounded-3xl p-5 w-full max-w-sm space-y-4 shadow-2xl relative">
            <button
              onClick={() => setActiveTecnicoModal(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-base font-bold"
            >
              ✕
            </button>

            <div className="text-center border-b border-white/5 pb-3">
              <div className="inline-flex p-3 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2.5">
                <Shield className="w-6 h-6" />
              </div>
              <h4 className="text-base font-display font-extrabold text-white">Taller Firmante Autorizado</h4>
              <p className="text-[10px] text-slate-500 font-mono mt-0.5">Sello Digital: #{activeTecnicoModal.codigo ? String(activeTecnicoModal.codigo).replace(/./g, (c, i) => i === 0 ? c : "*") : ""}</p>
              {activeTecnicoModal.nombreMecanico && (
                <p className="text-[10px] text-emerald-400 font-mono mt-0.5">Mecánico: {activeTecnicoModal.nombreMecanico}</p>
              )}
            </div>

            <div className="space-y-2 text-xs bg-slate-950 p-3.5 border border-white/5 rounded-xl text-slate-300">
              <div>Establecimiento: <strong className="text-white block mt-0.5">{activeTecnicoModal.taller}</strong></div>
              <div className="pt-2 border-t border-white/5 mt-2">
                <span>Reparación Certificada:</span>
                <p className="text-[11px] text-slate-400 leading-normal font-light mt-1 bg-black/40 p-2 rounded-lg border border-white/5">
                  "{activeTecnicoModal.trabajo}"
                </p>
              </div>
              <div className="pt-2 border-t border-white/5 mt-2 flex flex-col sm:flex-row justify-between items-start gap-2 text-[10px]">
                <div>Fecha: <span className="text-white block font-mono">{activeTecnicoModal.fecha ? activeTecnicoModal.fecha.split(" ")[0] : ""}</span></div>
                <div>Kilometraje: <span className="text-white block font-mono">{activeTecnicoModal.kilometraje != null ? Number(activeTecnicoModal.kilometraje).toLocaleString() : "0"} km</span></div>
              </div>
            </div>

            {/* BOTÓN WA.ME DIRECTO DE CORROBORACIÓN - Siempre visible, con fallback al administrador si es necesario */}
            {(() => {
              const modalTel = activeTecnicoModal.telefono ? String(activeTecnicoModal.telefono).trim() : "";
              const finalModalPhone = modalTel ? formatWhatsAppNumber(modalTel) : formatWhatsAppNumber(adminPhoneEnv);
              const isFallback = !modalTel;
              
              const maskedCode = activeTecnicoModal.codigo ? String(activeTecnicoModal.codigo).replace(/./g, (c, i) => i === 0 ? c : "*") : "";
              const tallerName = isFallback ? "Soporte Técnico" : (activeTecnicoModal.taller || "Taller");
              const modalMsg = `Hola ${tallerName}. Estoy evaluando la compra del vehículo placa ${selectedCar?.placa || ""} y tiene registrado en AutoScore un mantenimiento firmado por el taller "${activeTecnicoModal.taller || "Taller"}" con sello digital #${maskedCode} el día ${activeTecnicoModal.fecha ? activeTecnicoModal.fecha.split(" ")[0] : ""} con ${activeTecnicoModal.kilometraje != null ? Number(activeTecnicoModal.kilometraje).toLocaleString() : "0"} km ("${activeTecnicoModal.trabajo || ""}"). ¿Podrían corroborar la validez de este trabajo? Muchas gracias.`;
              
              return (
                <a
                  href={`https://wa.me/${finalModalPhone}?text=${encodeURIComponent(modalMsg)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-black py-3 rounded-xl text-xs transition-all shadow-lg cursor-pointer"
                >
                  <Phone className="w-4 h-4 shrink-0 fill-current" />
                  <span>{isFallback ? "Validar con Administrador" : "Corroborar con el Taller"}</span>
                </a>
              );
            })()}
          </div>
        </div>
      )}

    </div>
  );
}
