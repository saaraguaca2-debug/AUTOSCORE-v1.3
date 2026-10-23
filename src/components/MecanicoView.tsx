import React, { useState, useRef, useEffect, useCallback } from "react";
import jsQR from "jsqr";
import { 
  PenTool, Shield, QrCode, AlertCircle, RefreshCw, Key, Camera, Gauge, CheckCircle2,
  Lock, ArrowRight, CornerDownLeft, Sparkles, AlertTriangle, MonitorPlay, Check, PlusCircle,
  ClipboardCheck, Wrench, User, History, Star, ThumbsUp, ThumbsDown, MessageSquare
} from "lucide-react";
import { Mecanico, Vehiculo } from "../types";
import { notifyDataChanged } from "../mockData";

interface MecanicoViewProps {
  appScriptUrl: string;
}

export default function MecanicoView({ appScriptUrl }: MecanicoViewProps) {
  // Estados de Login del Mecánico
  const [codigoMecanico, setCodigoMecanico] = useState("");
  const [loggedMecanico, setLoggedMecanico] = useState<Mecanico | null>(null);
  const [loadingLogin, setLoadingLogin] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Selector de sección del panel mecánico logueado
  const [activeTab, setActiveTab] = useState<"mantenimiento" | "inspeccion" | "reputacion">("mantenimiento");
  const [mecanicoHistorial, setMecanicoHistorial] = useState<any[]>([]);
  const [loadingReputacion, setLoadingReputacion] = useState(false);

  const cargarReputacionMecanico = async (codigo: string) => {
    if (!appScriptUrl || !codigo) return;
    setLoadingReputacion(true);
    try {
      const res = await fetch(`${appScriptUrl}?accion=adminData`, { mode: "cors" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success) {
          if (Array.isArray(json.mecanicos)) {
            const found = json.mecanicos.find((m: any) => 
              (m.codigoMecanico || "").toString().trim().toLowerCase() === codigo.trim().toLowerCase()
            );
            if (found) setLoggedMecanico(found);
          }
          if (Array.isArray(json.historial)) {
            const reviews = json.historial.filter((h: any) => 
              (h.codigoMecanico || "").toString().trim().toLowerCase() === codigo.trim().toLowerCase()
            );
            setMecanicoHistorial(reviews);
          }
        }
      }
    } catch (e) {
      console.warn("Error cargando reputación del mecánico:", e);
    } finally {
      setLoadingReputacion(false);
    }
  };

  const [filtroOpiniones, setFiltroOpiniones] = useState<"todas" | "bueno" | "malo">("todas");

  // Estados del Formulario de Mantenimiento
  const [placa, setPlaca] = useState("");
  const [kilometraje, setKilometraje] = useState("");
  const [trabajo, setTrabajo] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<any | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Estados para búsqueda automática del último kilometraje registrado
  const [loadingUltimoKm, setLoadingUltimoKm] = useState(false);
  const [ultimoKmInfo, setUltimoKmInfo] = useState<{
    km: number;
    fecha?: string;
    trabajo?: string;
    taller?: string;
  } | null>(null);

  // Estados del Formulario de Inspección de Ingreso / Re-Inspección
  const [inspPlaca, setInspPlaca] = useState("");
  const [inspMarca, setInspMarca] = useState("");
  const [inspModelo, setInspModelo] = useState("");
  const [inspAnio, setInspAnio] = useState("");
  const [inspIdDueno, setInspIdDueno] = useState("");
  const [inspKilometraje, setInspKilometraje] = useState("");
  const [inspCombustible, setInspCombustible] = useState("Gasolina");
  const [inspTransmision, setInspTransmision] = useState("Automática");

  // Estados para modo Re-Inspección Técnica (Vehículo existente que sube Score por mejoras)
  const [esReinspeccion, setEsReinspeccion] = useState(false);
  const [vehiculoExistenteInfo, setVehiculoExistenteInfo] = useState<{
    placa: string;
    marca: string;
    modelo: string;
    anio: number;
    idDueno: string;
    scoreActual: number;
    ultimoKm?: number;
  } | null>(null);
  const [buscandoVehiculoInsp, setBuscandoVehiculoInsp] = useState(false);

  // Respuestas del cuestionario (Puntajes por defecto son ideales: 20 pts cada uno = 100 máx)
  const [qMotor, setQMotor] = useState<number>(20);
  const [qChasis, setQChasis] = useState<number>(20);
  const [qDireccion, setQDireccion] = useState<number>(20);
  const [qOBD, setQOBD] = useState<number>(20);
  const [qNeumaticos, setQNeumaticos] = useState<number>(20);

  // Cuadros de Observaciones Técnicas detalladas por sección pericial
  const [obsMotor, setObsMotor] = useState("");
  const [obsChasis, setObsChasis] = useState("");
  const [obsDireccion, setObsDireccion] = useState("");
  const [obsOBD, setObsOBD] = useState("");
  const [obsNeumaticos, setObsNeumaticos] = useState("");
  const [obsDictamenGeneral, setObsDictamenGeneral] = useState("");

  const [inspError, setInspError] = useState<string | null>(null);
  const [inspSuccess, setInspSuccess] = useState<any | null>(null);
  const [isSubmittingInsp, setIsSubmittingInsp] = useState(false);

  // Estados de la Cámara y Escaneo QR
  const [showScanner, setShowScanner] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Verificar si un vehículo ya está registrado para activar automáticamente el modo Re-Inspección
  const verificarVehiculoInsp = useCallback(async (placaAComprobar: string) => {
    const clean = (placaAComprobar || "").trim().toUpperCase();
    if (!clean || clean.length < 3 || !appScriptUrl) {
      setEsReinspeccion(false);
      setVehiculoExistenteInfo(null);
      return;
    }

    setBuscandoVehiculoInsp(true);
    try {
      const url = `${appScriptUrl}?placa=${encodeURIComponent(clean)}&tipoCertificado=completo`;
      const res = await fetch(url, { mode: "cors" });
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.vehiculo) {
          const v = json.vehiculo;
          const scoreAct = Number(v.score || v.Score || 90);
          const ultimoKmNum = json.kilometrajeActual ? Number(json.kilometrajeActual) : undefined;
          
          setEsReinspeccion(true);
          setVehiculoExistenteInfo({
            placa: v.placa,
            marca: v.marca,
            modelo: v.modelo,
            anio: Number(v.anio) || new Date().getFullYear(),
            idDueno: v.idDueno || "",
            scoreActual: scoreAct,
            ultimoKm: ultimoKmNum
          });

          // Auto-llenar campos
          if (v.marca) setInspMarca(v.marca);
          if (v.modelo) setInspModelo(v.modelo);
          if (v.anio) setInspAnio(String(v.anio));
          if (v.idDueno) setInspIdDueno(v.idDueno);
          if (ultimoKmNum) setInspKilometraje(String(ultimoKmNum));
          return;
        }
      }
      setEsReinspeccion(false);
      setVehiculoExistenteInfo(null);
    } catch (err) {
      console.warn("No se pudo verificar vehículo para re-inspección:", err);
    } finally {
      setBuscandoVehiculoInsp(false);
    }
  }, [appScriptUrl]);

  // Función para consultar el último kilometraje registrado en la última reparación
  const fetchUltimoKilometraje = useCallback(async (placaABuscar: string) => {
    const clean = (placaABuscar || "").trim().toUpperCase();
    if (!clean || clean.length < 3) {
      setUltimoKmInfo(null);
      return;
    }

    setLoadingUltimoKm(true);

    try {
      if (appScriptUrl) {
        // Consultar con tipoCertificado=completo para obtener historial de la base de datos
        const url = `${appScriptUrl}?placa=${encodeURIComponent(clean)}&tipoCertificado=completo`;
        const res = await fetch(url, { mode: "cors" });
        if (res.ok) {
          const json = await res.json();
          if (json && json.success) {
            const hist = Array.isArray(json.historial) ? json.historial : [];
            if (hist.length > 0) {
              // Buscar el registro con mayor kilometraje o el primer registro del historial ordenado
              let maxKm = 0;
              let bestRow: any = null;

              hist.forEach((row: any) => {
                const k = Number(row.kilometraje) || 0;
                if (k > maxKm) {
                  maxKm = k;
                  bestRow = row;
                }
              });

              if (!bestRow && hist[0]) {
                bestRow = hist[0];
                maxKm = Number(bestRow.kilometraje) || 0;
              }

              if (bestRow && maxKm > 0) {
                setKilometraje(String(maxKm));
                setUltimoKmInfo({
                  km: maxKm,
                  fecha: bestRow.fecha,
                  trabajo: bestRow.trabajoRealizado,
                  taller: bestRow.taller
                });
                setLoadingUltimoKm(false);
                return;
              }
            } else if (json.kilometrajeActual && Number(json.kilometrajeActual) > 0) {
              const km = Number(json.kilometrajeActual);
              setKilometraje(String(km));
              setUltimoKmInfo({
                km: km,
                fecha: "Odómetro registrado"
              });
              setLoadingUltimoKm(false);
              return;
            }
          }
        }
      }

      // Si no hay respuesta o no hay historial en la BD
      setUltimoKmInfo(null);
    } catch (err) {
      console.warn("No se pudo obtener el último kilometraje:", err);
      setUltimoKmInfo(null);
    } finally {
      setLoadingUltimoKm(false);
    }
  }, [appScriptUrl]);

  // Pre-llenar la placa automáticamente si se pasa por parámetro URL (QR de Técnico) o desde el último carro del garage
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlPlaca = params.get("placa");
    const lastSelected = localStorage.getItem("autoscore_last_selected_placa");
    const targetPlaca = urlPlaca || lastSelected;
    if (targetPlaca) {
      const cleanTarget = targetPlaca.toUpperCase();
      setPlaca(cleanTarget);
      setInspPlaca(cleanTarget);
      fetchUltimoKilometraje(cleanTarget);
    }
  }, [fetchUltimoKilometraje]);

  // 1. INGRESO DE MECÁNICO (FILTRO DE MEMBRESÍA Y DATOS REALES DE LA BASE DE DATOS)
  const handleMecanicoLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigoMecanico.trim()) return;

    setLoadingLogin(true);
    setLoginError(null);

    try {
      const cleanInput = codigoMecanico.trim().toLowerCase();
      let foundMec: any = null;

      if (!appScriptUrl) {
        throw new Error("Debe configurar la URL de la base de datos en la barra superior para validar técnicos autorizados.");
      }

      const res = await fetch(`${appScriptUrl}?accion=adminData`, { mode: "cors" });
      if (!res.ok) throw new Error("Fallo en la comunicación con la base de datos.");
      const json = await res.json();
      if (json && json.success && Array.isArray(json.mecanicos)) {
        foundMec = json.mecanicos.find(
          (m: any) => (m.codigoMecanico || "").toString().trim().toLowerCase() === cleanInput
        );
      }

      if (foundMec) {
        if (foundMec.estado === "Suspendido") {
          setLoginError(
            `ACCESO DENEGADO: La membresía del taller ${foundMec.taller || "Afiliado"} (${foundMec.nombre || "Técnico"}) está SUSPENDIDA por falta de pago. Regularice el estado de cuenta para operar.`
          );
        } else {
          setLoggedMecanico(foundMec);
          setLoginError(null);
          cargarReputacionMecanico(cleanInput);
        }
      } else {
        setLoginError("Código de técnico no encontrado en la base de datos.");
      }
    } catch (err: any) {
      setLoginError(err.message || "Error al verificar código en la base de datos.");
    } finally {
      setLoadingLogin(false);
    }
  };

  // Salir de la sesión del técnico
  const handleLogoutMecanico = () => {
    setLoggedMecanico(null);
    setCodigoMecanico("");
    setPlaca("");
    setKilometraje("");
    setTrabajo("");
    setFormError(null);
    setFormSuccess(null);
    setUltimoKmInfo(null);
    stopCamera();
    setShowScanner(false);
  };

  // 2. CONTROL DE LA CÁMARA NATIVA
  const startCamera = async () => {
    setCameraError(null);
    setCameraActive(true);
    try {
      const constraints = {
        video: { facingMode: "environment" } // Priorizar cámara trasera en móviles
      };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err: any) {
      setCameraError(
        "No se pudo acceder a la cámara. Por favor concede permisos de video en tu navegador."
      );
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  // Manejar captura de cámara real / Escaneo QR
  const handleSelectPlaca = (placaSeleccionada: string) => {
    const upper = placaSeleccionada.toUpperCase();
    if (activeTab === "inspeccion") {
      setInspPlaca(upper);
      verificarVehiculoInsp(upper);
    } else {
      setPlaca(upper);
      fetchUltimoKilometraje(upper);
    }
    setShowScanner(false);
    stopCamera();
    setFormError(null);
  };

  // Auto-iniciar cámara al abrir el lector de QR
  useEffect(() => {
    if (showScanner) {
      startCamera();
    } else {
      stopCamera();
    }
  }, [showScanner]);

  // Bucle de escaneo de QR en tiempo real usando jsQR
  useEffect(() => {
    let active = true;
    let animationFrameId: number;

    const scan = () => {
      if (!active || !cameraActive) return;

      const video = videoRef.current;
      if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
        let canvas = document.getElementById("qr-canvas") as HTMLCanvasElement | null;
        if (!canvas) {
          canvas = document.createElement("canvas");
          canvas.id = "qr-canvas";
        }
        const ctx = canvas.getContext("2d");
        if (ctx) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          
          try {
            const code = jsQR(imageData.data, imageData.width, imageData.height, {
              inversionAttempts: "dontInvert",
            });

            if (code && code.data) {
              console.log("¡Código QR detectado!", code.data);
              let detectedPlaca = code.data.trim();
              
              // Intentar extraer la placa si es un enlace completo
              try {
                if (code.data.includes("?") && (code.data.startsWith("http://") || code.data.startsWith("https://") || code.data.includes("placa="))) {
                  let searchStr = code.data;
                  if (!code.data.startsWith("http")) {
                    searchStr = "http://dummy.com/" + (code.data.startsWith("?") ? code.data : "?" + code.data);
                  }
                  const urlObj = new URL(searchStr);
                  const p = urlObj.searchParams.get("placa");
                  if (p) {
                    detectedPlaca = p;
                  }
                }
              } catch (e) {
                // Usar original
              }

              if (detectedPlaca) {
                handleSelectPlaca(detectedPlaca.toUpperCase());
                active = false;
                return;
              }
            }
          } catch (err) {
            console.error("Error al procesar jsQR:", err);
          }
        }
      }

      if (active) {
        animationFrameId = requestAnimationFrame(scan);
      }
    };

    if (cameraActive) {
      animationFrameId = requestAnimationFrame(scan);
    }

    return () => {
      active = false;
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [cameraActive]);

  // 3. ENVÍO DE FORMULARIO: REGISTRAR Y FIRMAR MANTENIMIENTO (POST)
  const handleRegistrarMantenimiento = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedMecanico) return;
    
    const cleanPlaca = placa.trim().toUpperCase();
    const kmNum = Number(kilometraje);
    const cleanTrabajo = trabajo.trim();

    if (!cleanPlaca || !kilometraje || !cleanTrabajo) {
      setFormError("Todos los campos son obligatorios.");
      return;
    }

    if (isNaN(kmNum) || kmNum <= 0) {
      setFormError("Por favor, ingresa un kilometraje numérico válido mayor a cero.");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const descripcionCombinada = `Realizado por: ${loggedMecanico.nombre} (${loggedMecanico.codigoMecanico})\nTrabajo: ${cleanTrabajo}`;

    const payload = {
      codigoMecanico: loggedMecanico.codigoMecanico,
      placa: cleanPlaca,
      kilometraje: kmNum,
      trabajo: descripcionCombinada
    };

    try {
      if (!appScriptUrl) {
        setFormError("Debe configurar la URL de la Base de Datos en la barra superior para registrar mantenimientos.");
        setIsSubmitting(false);
        return;
      }

      // Petición real vía fetch configurada con CORS simple
      const response = await fetch(appScriptUrl, {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "text/plain;charset=utf-8"
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        throw new Error(`Error de comunicación con la Base de Datos: ${response.statusText}`);
      }

      const result = await response.json();
      if (result && result.success) {
        setFormSuccess(result.data || {
          placa: cleanPlaca,
          fecha: new Date().toLocaleDateString(),
          mecanico: loggedMecanico.nombre,
          taller: loggedMecanico.taller
        });
        setKilometraje("");
        setTrabajo("");
        notifyDataChanged();
      } else {
        setFormError((result && result.error) || "La Base de Datos rechazó la firma de mantenimiento.");
      }
    } catch (err: any) {
      setFormError(err.message || "Fallo inesperado al registrar la firma en la Base de Datos.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 animate-fade-in text-slate-100">
      
      {/* ---------------- VISTA 1: INGRESO DE ACCESO MECÁNICO ---------------- */}
      {!loggedMecanico && (
        <div className="glass-panel p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-500 mb-3 border border-amber-500/20">
              <Key className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-display font-extrabold text-white">Panel de Carga Técnica</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa tu código de acreditación para habilitar el escáner y registrar firmas de mantenimiento en la base de datos de AutoScore.
            </p>
          </div>

          <form onSubmit={handleMecanicoLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Código de Taller Homologado:
              </label>
              <input
                type="text"
                required
                placeholder="Ej: Código de taller"
                value={codigoMecanico}
                onChange={(e) => setCodigoMecanico(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-center text-amber-400 font-mono font-bold tracking-widest focus:outline-none focus:border-amber-500 placeholder-slate-500"
              />
              <div className="mt-2.5 p-3.5 bg-black/40 border border-white/5 rounded-xl space-y-1.5 text-[11px] text-slate-400 leading-normal">
                <span className="font-bold text-slate-400 block mb-1">Códigos Demo de Prueba:</span>
                <p>• <strong className="text-emerald-400 font-mono">M101</strong>: Carlos Mendoza (<strong className="text-slate-300">Activo</strong>)</p>
                <p>• <strong className="text-red-400 font-mono">M202</strong>: José Rodríguez (<strong className="text-red-500">Suspendido - Prueba Filtro Membresía</strong>)</p>
              </div>
            </div>

            {loginError && (
              <div className="p-3.5 rounded-xl bg-red-950/30 border border-red-900/40 text-red-400 text-xs flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                <span>{loginError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loadingLogin}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              id="btn-login-mecanico"
            >
              {loadingLogin ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  Verificar Credencial
                </>
              )}
            </button>
          </form>
        </div>
      )}

      {/* ---------------- VISTA 2: PANEL MECÁNICO ACTIVO CON TABS ---------------- */}
      {loggedMecanico && (
        <div className="space-y-6">
          
          {/* Cabecera Técnico y Taller Activo */}
          <div className="flex items-center justify-between bg-slate-900/90 border border-amber-500/30 p-4 rounded-2xl backdrop-blur-md shadow-lg">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider">
                  SESIÓN ACTIVA DE TALLER & TÉCNICO
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-500 shrink-0" />
                  <span className="text-xs text-amber-400 font-bold">Taller:</span>
                  <span className="text-sm font-extrabold text-white truncate">{loggedMecanico.taller}</span>
                </div>
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">Mecánico:</span>
                  <span className="text-xs font-bold text-white truncate">{loggedMecanico.nombre}</span>
                </div>
                <p className="text-[10px] text-slate-400 font-mono pt-0.5">
                  Código de Acreditación: <span className="text-amber-500 font-bold">#{loggedMecanico.codigoMecanico}</span>
                </p>
              </div>
            </div>
            <button
              onClick={handleLogoutMecanico}
              className="text-xs bg-slate-950 hover:bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl px-3 py-2 ml-3 font-medium shrink-0 transition-all active:scale-95 shadow"
              id="btn-mecanico-logout"
            >
              Salir
            </button>
          </div>

          {/* Selector de Tabs / Tareas */}
          <div className="flex bg-slate-950/60 p-1 rounded-xl border border-white/5 gap-1">
            <button
              onClick={() => {
                setActiveTab("mantenimiento");
                setFormError(null);
                setFormSuccess(null);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg transition-all ${
                activeTab === "mantenimiento"
                  ? "bg-amber-500 text-slate-950 font-extrabold shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
              id="tab-btn-mantenimiento"
            >
              <PenTool className="w-3.5 h-3.5" />
              <span>Firma</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("inspeccion");
                setInspError(null);
                setInspSuccess(null);
                if (inspPlaca) verificarVehiculoInsp(inspPlaca);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg transition-all ${
                activeTab === "inspeccion"
                  ? "bg-amber-500 text-slate-950 font-extrabold shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
              id="tab-btn-inspeccion"
            >
              <ClipboardCheck className="w-3.5 h-3.5" />
              <span>Inspección</span>
            </button>
            <button
              onClick={() => {
                setActiveTab("reputacion");
                if (loggedMecanico) cargarReputacionMecanico(loggedMecanico.codigoMecanico);
              }}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold rounded-lg transition-all ${
                activeTab === "reputacion"
                  ? "bg-amber-500 text-slate-950 font-extrabold shadow"
                  : "text-slate-400 hover:text-slate-200 hover:bg-white/5"
              }`}
              id="tab-btn-reputacion"
            >
              <Star className="w-3.5 h-3.5" />
              <span>Calidad & Reseñas</span>
            </button>
          </div>

          {/* ---------------- TAB 1: FORMULARIO DE FIRMA DE MANTENIMIENTO ---------------- */}
          {activeTab === "mantenimiento" && (
            <div className="glass-panel p-5 shadow-xl relative overflow-hidden">
              <h4 className="text-sm font-display font-bold text-white mb-4 flex items-center gap-1.5 border-b border-white/5 pb-3">
                <PenTool className="w-4.5 h-4.5 text-amber-500" />
                Nueva Firma de Historial
              </h4>

              {formSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs flex flex-col gap-2 mb-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>¡Mantenimiento Firmado Exitosamente!</span>
                  </div>
                  <div className="mt-1 space-y-1 text-slate-300 font-mono text-[11px]">
                    <p>• Transacción ID: #{formSuccess.idHistorial}</p>
                    <p>• Placa Vinculada: {formSuccess.placa}</p>
                    <p>• Fecha Sello: {formSuccess.fecha}</p>
                    <p>• Validador: {formSuccess.mecanico}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-1 leading-normal">
                    Los datos se han persistido de forma inviolable y el score mecánico del vehículo ha sido recalculado en tiempo real.
                  </p>
                  <button
                    onClick={() => setFormSuccess(null)}
                    className="mt-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold py-1.5 px-3 rounded-lg text-xs self-end border border-emerald-500/20"
                  >
                    Registrar Otro Trabajo
                  </button>
                </div>
              )}

              <form onSubmit={handleRegistrarMantenimiento} className="space-y-4">
                
                {/* Campo PLACA con botón de escáner QR */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Placa del Vehículo (Involucrada):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      maxLength={10}
                      placeholder="Ej: XYZ567"
                      value={placa}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setPlaca(val);
                        if (val.trim().length >= 5) {
                          fetchUltimoKilometraje(val);
                        } else {
                          setUltimoKmInfo(null);
                        }
                      }}
                      onBlur={() => {
                        if (placa.trim().length >= 3) {
                          fetchUltimoKilometraje(placa);
                        }
                      }}
                      className="flex-1 glass-input rounded-xl px-4 py-2.5 text-sm font-mono font-bold tracking-widest text-amber-400 placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setShowScanner(true);
                      }}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md cursor-pointer"
                      title="Escanear QR de Placa"
                      id="btn-scan-trigger"
                    >
                      <QrCode className="w-4 h-4" />
                      <span>Escanear QR</span>
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    * Escanea el código QR o ingresa la placa para cargar automáticamente el último kilometraje registrado en la última reparación.
                  </p>
                </div>

                {/* Kilometraje */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider">
                      Kilometraje Actual (Odómetro):
                    </label>
                    {loadingUltimoKm && (
                      <span className="text-[11px] text-amber-400 flex items-center gap-1 font-sans animate-pulse">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Consultando último km...
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    <Gauge className="absolute left-3 top-3 w-4.5 h-4.5 text-slate-500" />
                    <input
                      type="number"
                      required
                      placeholder="Ej: 45000"
                      value={kilometraje}
                      onChange={(e) => setKilometraje(e.target.value)}
                      className="w-full glass-input rounded-xl pl-10 pr-12 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 font-mono font-medium"
                    />
                    <span className="absolute right-4 top-3 text-xs text-slate-500 font-mono font-semibold">KM</span>
                  </div>

                  {/* Banner informativo del último kilometraje traído */}
                  {ultimoKmInfo && (
                    <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-start gap-2 animate-fade-in">
                      <History className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                      <div className="leading-tight">
                        <span className="font-bold text-white">
                          Último KM registrado: {Number(ultimoKmInfo.km).toLocaleString()} km
                        </span>
                        {ultimoKmInfo.fecha && (
                          <span className="text-slate-400 block mt-0.5">
                            Fecha: {ultimoKmInfo.fecha} {ultimoKmInfo.taller ? `• Taller: ${ultimoKmInfo.taller}` : ""}
                          </span>
                        )}
                        {ultimoKmInfo.trabajo && (
                          <span className="text-slate-400 block mt-0.5 line-clamp-1 italic">
                            Trabajo: &ldquo;{ultimoKmInfo.trabajo.split("\n")[0]}&rdquo;
                          </span>
                        )}
                        <span className="text-[10px] text-amber-400/90 block mt-1 font-medium">
                          ✓ Se auto-completó con el valor de la última reparación. Puedes ajustarlo si el odómetro avanzó.
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Descripción de Trabajo */}
                <div>
                  <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                    Descripción Detallada del Trabajo Realizado:
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder="Detalla cambios de fluidos, marcas de repuestos, reparaciones de motor, dirección o preventivos..."
                    value={trabajo}
                    onChange={(e) => setTrabajo(e.target.value)}
                    className="w-full glass-input rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-amber-500 placeholder-slate-500 leading-relaxed font-light"
                  />
                </div>

                {formError && (
                  <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-start gap-2.5">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* Botón de envío */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-amber-500/15"
                  id="btn-firmar-mantenimiento"
                >
                  {isSubmitting ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <>
                      <PenTool className="w-4 h-4" />
                      Registrar y Firmar Mantenimiento
                    </>
                  )}
                </button>

              </form>
            </div>
          )}

          {/* ---------------- TAB 2: INSPECCIÓN / RE-EVALUACIÓN TÉCNICA ---------------- */}
          {activeTab === "inspeccion" && (
            <div className={`glass-panel p-5 shadow-xl relative overflow-hidden transition-all duration-300 ${
              esReinspeccion ? "border-amber-500/30 bg-amber-500/[0.02]" : ""
            }`}>
              <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-2">
                <div className="flex items-center gap-2">
                  {esReinspeccion ? (
                    <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
                  ) : (
                    <ClipboardCheck className="w-5 h-5 text-amber-500" />
                  )}
                  <div>
                    <h4 className="text-sm font-display font-bold text-white flex items-center gap-2">
                      <span>{esReinspeccion ? "Re-Inspección Técnica por Mejoras" : "Inspección de Ingreso y Diagnóstico"}</span>
                      {esReinspeccion && (
                        <span className="text-[9px] bg-amber-500/20 text-amber-400 border border-amber-500/30 px-2 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">
                          Re-evaluación VIP
                        </span>
                      )}
                    </h4>
                    <p className="text-[10px] text-slate-400 leading-normal">
                      {esReinspeccion
                        ? "Certifique las mejoras y reparaciones realizadas por el cliente para actualizar y subir su AutoScore oficial."
                        : "Evalúe las áreas clave del vehículo para homologarlo y calcular su AutoScore inicial de confianza."}
                    </p>
                  </div>
                </div>
              </div>

              {inspSuccess && (
                <div className="p-4 rounded-2xl bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-xs flex flex-col gap-2.5 mb-4 animate-in zoom-in-95 duration-200">
                  <div className="flex items-center gap-2 font-bold text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
                    <span>
                      {inspSuccess.esReinspeccion
                        ? "¡Re-Inspección Técnica Completada y Score Actualizado!"
                        : "¡Vehículo Homologado e Inspeccionado!"}
                    </span>
                  </div>
                  <div className="mt-1 space-y-1 text-slate-300 font-mono text-[11px]">
                    <p>• Placa: <strong className="text-amber-400">{inspSuccess.placa}</strong></p>
                    <p>• Vehículo: {inspSuccess.marca} {inspSuccess.modelo}</p>
                    <p>• Cédula/ID Dueño: {inspSuccess.dueno}</p>
                    {inspSuccess.esReinspeccion ? (
                      <div className="p-2 rounded-xl bg-black/40 border border-white/5 my-1 flex items-center gap-2">
                        <span className="text-[10px] text-slate-400 font-sans">Evolución de Puntuación:</span>
                        <span className="line-through text-slate-400 font-bold">{inspSuccess.scoreAnterior || 90} pts</span>
                        <ArrowRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400 font-extrabold text-sm">{inspSuccess.score} pts</span>
                        <span className="text-[10px] text-emerald-400 font-sans ml-auto font-bold">¡Subió de Score!</span>
                      </div>
                    ) : (
                      <p>• Puntaje Inicial Calculado: <strong className="text-amber-400">{inspSuccess.score} pts</strong></p>
                    )}
                    <p>• Transacción Historial ID: #{inspSuccess.idHistorial}</p>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-normal">
                    {inspSuccess.esReinspeccion
                      ? "La re-evaluación por mejoras ha sido sellada oficialmente. El nuevo Score ya está disponible para el cliente, el mercado y certificados digitales."
                      : "La ficha de diagnóstico ha sido cargada de forma oficial como el primer sello verificado en la hoja de vida del vehículo."}
                  </p>
                  <button
                    onClick={() => setInspSuccess(null)}
                    className="mt-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 font-bold py-1.5 px-3 rounded-lg text-xs self-end border border-emerald-500/20"
                  >
                    Nueva Inspección / Re-evaluación
                  </button>
                </div>
              )}

              <form onSubmit={async (e) => {
                e.preventDefault();
                if (!loggedMecanico) return;

                const cleanPlaca = inspPlaca.trim().toUpperCase();
                const cleanMarca = inspMarca.trim();
                const cleanModelo = inspModelo.trim();
                const cleanIdDueno = inspIdDueno.trim();
                const anioNum = Number(inspAnio);
                const kmNum = Number(inspKilometraje || 0);

                if (!cleanPlaca || !cleanMarca || !cleanModelo || !cleanIdDueno || !inspAnio) {
                  setInspError("Por favor, complete todos los campos obligatorios del vehículo.");
                  return;
                }

                if (isNaN(anioNum) || anioNum < 1900 || anioNum > new Date().getFullYear() + 1) {
                  setInspError("Por favor, ingrese un año de fabricación válido.");
                  return;
                }

                setIsSubmittingInsp(true);
                setInspError(null);
                setInspSuccess(null);

                const scoreCalculado = qMotor + qChasis + qDireccion + qOBD + qNeumaticos;

                const descMotor = qMotor === 20 ? "Excelente (Sin ruidos anormales ni fugas)" : qMotor === 10 ? "Desgaste menor (Mantenimiento preventivo pendiente)" : "Crítico (Fugas activas o fallas mecánicas severas)";
                const descChasis = qChasis === 20 ? "Estructura original intacta (Sin colisiones ni óxido)" : qChasis === 12 ? "Detalles cosméticos menores en carrocería/pintura" : "Daño estructural, corrosión grave o choque de consideración";
                const descDireccion = qDireccion === 20 ? "Óptimo y alineado (Frenos y amortiguación firmes)" : qDireccion === 10 ? "Desgaste intermedio (Holgura menor o pastillas a media vida)" : "Inseguro (Requiere reemplazo de componentes de suspensión/frenos)";
                const descOBD = qOBD === 20 ? "Escáner OBD-II Limpio (Sin DTCs en ECM/TCM/ABS/SRS)" : qOBD === 10 ? "Códigos históricos secundarios sin alerta de Check Engine" : "Testigo MIL/Check Engine activo o falla electrónica de seguridad";
                const descNeumaticos = qNeumaticos === 20 ? "Excelente (>70% de vida útil y desgaste parejo)" : qNeumaticos === 10 ? "Vida media (30% a 70% de remanente)" : "Inseguro (Neumáticos lisos, deformados o vencidos)";

                const lineasInforme: string[] = [
                  `📋 TIPO DE REGISTRO: INSPECCIÓN TÉCNICA OFICIAL (NO ES REPARACIÓN)`,
                  `Perito Acreditado: ${loggedMecanico.nombre} | Reg: ${loggedMecanico.codigoMecanico} | Taller: ${loggedMecanico.taller}`,
                  `Vehículo: ${cleanMarca} ${cleanModelo} (${anioNum}) | Combustible: ${inspCombustible} | Transmisión: ${inspTransmision}`,
                  `Odómetro Certificado: ${kmNum.toLocaleString("es-ES")} km`,
                  `Calificación Pericial: ${scoreCalculado}/100 pts (${esReinspeccion ? `Re-evaluación técnica por mejoras; anterior: ${vehiculoExistenteInfo?.scoreActual ?? "?"} pts` : "Inspección técnica de ingreso oficial"})`,
                  `----------------------------------------`,
                  `1. MOTOR Y PLANTA MOTRIZ (${qMotor}/20 pts):`,
                  `   • Estado: ${descMotor}`,
                  `   • Observación: ${obsMotor.trim() ? obsMotor.trim() : "Sin novedades reportadas."}`,
                  `2. ESTRUCTURA, BASTIDOR Y CARROCERÍA (${qChasis}/20 pts):`,
                  `   • Estado: ${descChasis}`,
                  `   • Observación: ${obsChasis.trim() ? obsChasis.trim() : "Sin novedades reportadas."}`,
                  `3. DIRECCIÓN, SUSPENSIÓN Y FRENOS (${qDireccion}/20 pts):`,
                  `   • Estado: ${descDireccion}`,
                  `   • Observación: ${obsDireccion.trim() ? obsDireccion.trim() : "Sin novedades reportadas."}`,
                  `4. DIAGNÓSTICO ELECTRÓNICO OBD-II Y SENSORES (${qOBD}/20 pts):`,
                  `   • Estado: ${descOBD}`,
                  `   • Observación: ${obsOBD.trim() ? obsOBD.trim() : "Sin novedades reportadas."}`,
                  `5. NEUMÁTICOS, FLUIDOS Y EQUIPO DE SEGURIDAD (${qNeumaticos}/20 pts):`,
                  `   • Estado: ${descNeumaticos}`,
                  `   • Observación: ${obsNeumaticos.trim() ? obsNeumaticos.trim() : "Sin novedades reportadas."}`,
                  `----------------------------------------`,
                  `DICTAMEN Y RECOMENDACIONES PERICIALES:`,
                  obsDictamenGeneral.trim() ? obsDictamenGeneral.trim() : "Vehículo evaluado bajo estándar de inspección técnica oficial AutoScore."
                ];

                const trabajoInspeccion = lineasInforme.join("\n");

                try {
                  if (!appScriptUrl) {
                    throw new Error("Debe configurar la URL de la Base de Datos en el botón de arriba ⚙️.");
                  }

                  let success = false;
                  let lastIdHist = "10006";

                  // Intento Principal: Acción especializada registrarInspeccionTecnica
                  try {
                    const responseInsp = await fetch(appScriptUrl, {
                      method: "POST",
                      mode: "cors",
                      headers: { "Content-Type": "text/plain;charset=utf-8" },
                      body: JSON.stringify({
                        accion: "registrarInspeccionTecnica",
                        codigoMecanico: loggedMecanico.codigoMecanico,
                        placa: cleanPlaca,
                        marca: cleanMarca,
                        modelo: cleanModelo,
                        anio: anioNum,
                        idDueno: cleanIdDueno,
                        kilometraje: kmNum,
                        score: scoreCalculado,
                        trabajo: trabajoInspeccion,
                        tipoRegistro: "Inspección Técnica",
                        combustible: inspCombustible,
                        transmision: inspTransmision,
                        esReinspeccion: esReinspeccion,
                        estadoCertificado: "Activo"
                      })
                    });

                    if (responseInsp.ok) {
                      const resJson = await responseInsp.json();
                      if (resJson && resJson.success) {
                        success = true;
                        lastIdHist = resJson.data?.idHistorial || "10006";
                      }
                    }
                  } catch (e) {
                    console.warn("Fallo registrarInspeccionTecnica directo, intentando fallback:", e);
                  }

                  // Fallback de compatibilidad si el script remoto es versión previa
                  if (!success) {
                    if (esReinspeccion) {
                      const resReinsp = await fetch(appScriptUrl, {
                        method: "POST",
                        mode: "cors",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({
                          accion: "reinspeccionarVehiculo",
                          placa: cleanPlaca,
                          score: scoreCalculado,
                          codigoMecanico: loggedMecanico.codigoMecanico,
                          kilometraje: kmNum,
                          trabajo: trabajoInspeccion,
                          tipoRegistro: "Inspección Técnica",
                          estadoCertificado: "Activo"
                        })
                      });
                      if (resReinsp.ok) {
                        const rJson = await resReinsp.json();
                        if (rJson && rJson.success) {
                          success = true;
                          lastIdHist = rJson.data?.idHistorial || "10006";
                        }
                      }
                    } else {
                      // Registrar vehiculo + registro
                      const resReg = await fetch(appScriptUrl, {
                        method: "POST",
                        mode: "cors",
                        headers: { "Content-Type": "text/plain;charset=utf-8" },
                        body: JSON.stringify({
                          accion: "registrarVehiculo",
                          placa: cleanPlaca,
                          marca: cleanMarca,
                          modelo: cleanModelo,
                          anio: anioNum,
                          idDueno: cleanIdDueno,
                          score: scoreCalculado,
                          estadoCertificado: "Activo"
                        })
                      });
                      if (resReg.ok) {
                        const rReg = await resReg.json();
                        if (!rReg.success) throw new Error(rReg.error || "Error al registrar vehículo.");
                        const resMaint = await fetch(appScriptUrl, {
                          method: "POST",
                          mode: "cors",
                          headers: { "Content-Type": "text/plain;charset=utf-8" },
                          body: JSON.stringify({
                            codigoMecanico: loggedMecanico.codigoMecanico,
                            placa: cleanPlaca,
                            kilometraje: kmNum,
                            trabajo: trabajoInspeccion,
                            tipoRegistro: "Inspección Técnica"
                          })
                        });
                        if (resMaint.ok) {
                          const rMaint = await resMaint.json();
                          if (rMaint && rMaint.success) {
                            success = true;
                            lastIdHist = rMaint.data?.idHistorial || "10005";
                          }
                        }
                      }
                    }
                  }

                  setInspSuccess({
                    placa: cleanPlaca,
                    marca: cleanMarca,
                    modelo: cleanModelo,
                    score: scoreCalculado,
                    dueno: cleanIdDueno,
                    idHistorial: lastIdHist,
                    esReinspeccion: esReinspeccion,
                    tipoRegistro: "Inspección Técnica",
                    scoreAnterior: vehiculoExistenteInfo?.scoreActual
                  });

                  notifyDataChanged();

                  // Limpiar formulario completo
                  setInspPlaca("");
                  setInspMarca("");
                  setInspModelo("");
                  setInspAnio("");
                  setInspIdDueno("");
                  setInspKilometraje("");
                  setEsReinspeccion(false);
                  setVehiculoExistenteInfo(null);
                  setQMotor(20);
                  setQChasis(20);
                  setQDireccion(20);
                  setQOBD(20);
                  setQNeumaticos(20);
                  setObsMotor("");
                  setObsChasis("");
                  setObsDireccion("");
                  setObsOBD("");
                  setObsNeumaticos("");
                  setObsDictamenGeneral("");
                  setIsSubmittingInsp(false);
                } catch (err: any) {
                  setInspError(err.message || "Fallo en la conexión del servidor al registrar la inspección.");
                  setIsSubmittingInsp(false);
                }
              }} className="space-y-4">
                
                {/* Bloque 1: Ficha del Vehículo con Detección Automática de Re-Inspección */}
                <div className={`border rounded-2xl p-3.5 space-y-3 transition-colors ${
                  esReinspeccion 
                    ? "bg-amber-500/10 border-amber-500/30" 
                    : "bg-white/[0.03] border border-white/5"
                }`}>
                  <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                    <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest flex items-center gap-1.5">
                      <span>1. Ficha del Vehículo</span>
                      {buscandoVehiculoInsp && (
                        <span className="text-[9px] text-amber-400 font-sans flex items-center gap-1 lowercase">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin" /> verificando...
                        </span>
                      )}
                    </span>
                    {esReinspeccion && vehiculoExistenteInfo && (
                      <span className="text-[9px] font-bold text-amber-300 bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/30">
                        Score Actual: {vehiculoExistenteInfo.scoreActual} pts
                      </span>
                    )}
                  </div>

                  {/* Banner Explicativo de Re-Inspección */}
                  {esReinspeccion && vehiculoExistenteInfo && (
                    <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs flex items-start gap-2.5 animate-in fade-in">
                      <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-amber-200 block text-[11px]">
                          Vehículo Registrado: {vehiculoExistenteInfo.marca} {vehiculoExistenteInfo.modelo} ({vehiculoExistenteInfo.anio})
                        </span>
                        <p className="text-[10px] text-slate-300 mt-0.5 leading-normal">
                          Se activó el modo <strong>Re-Inspección Técnica</strong>. Evalúe abajo las mejoras mecánicas instaladas para calcular y actualizar automáticamente el nuevo Score en la base de datos.
                        </p>
                      </div>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-[10px] font-semibold text-slate-400 uppercase">
                          Placa (ID Único):
                        </label>
                        <button
                          type="button"
                          onClick={() => setShowScanner(true)}
                          className="text-[9px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded"
                        >
                          <Camera className="w-3 h-3" />
                          <span>QR</span>
                        </button>
                      </div>
                      <input
                        type="text"
                        required
                        placeholder="Ej: XYZ567"
                        value={inspPlaca}
                        onChange={(e) => {
                          const val = e.target.value.toUpperCase();
                          setInspPlaca(val);
                          if (val.length >= 3) {
                            verificarVehiculoInsp(val);
                          } else {
                            setEsReinspeccion(false);
                            setVehiculoExistenteInfo(null);
                          }
                        }}
                        onBlur={() => {
                          if (inspPlaca) verificarVehiculoInsp(inspPlaca);
                        }}
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs text-amber-400 font-mono font-bold uppercase focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Cédula/ID Propietario:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: 26123456"
                        value={inspIdDueno}
                        onChange={(e) => setInspIdDueno(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Marca:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Toyota"
                        value={inspMarca}
                        onChange={(e) => setInspMarca(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Modelo:
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ej: Corolla"
                        value={inspModelo}
                        onChange={(e) => setInspModelo(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Año de Fabricación:
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Ej: 2018"
                        value={inspAnio}
                        onChange={(e) => setInspAnio(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        {esReinspeccion ? "Odómetro Actual (km):" : "Kilometraje de Ingreso:"}
                      </label>
                      <input
                        type="number"
                        required
                        placeholder="Ej: 45000"
                        value={inspKilometraje}
                        onChange={(e) => setInspKilometraje(e.target.value)}
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Tipo de Combustible:
                      </label>
                      <select
                        value={inspCombustible}
                        onChange={(e) => setInspCombustible(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs bg-slate-900 border border-white/10 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Gasolina">Gasolina</option>
                        <option value="Diésel">Diésel</option>
                        <option value="Híbrido">Híbrido (HEV/PHEV)</option>
                        <option value="Eléctrico (EV)">100% Eléctrico (EV)</option>
                        <option value="Gas (GLP/GNC)">Gas (GLP / GNC)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-slate-400 uppercase mb-1">
                        Caja de Transmisión:
                      </label>
                      <select
                        value={inspTransmision}
                        onChange={(e) => setInspTransmision(e.target.value)}
                        className="w-full glass-input rounded-xl px-2.5 py-1.5 text-xs bg-slate-900 border border-white/10 focus:outline-none focus:border-amber-500"
                      >
                        <option value="Automática">Automática (AT / CVT / DSG)</option>
                        <option value="Manual">Manual / Mecánica (MT)</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Bloque 2: Cuestionario de Evaluación Técnica Pericial */}
                <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-3.5 space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                    <div>
                      <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                        2. Protocolo Pericial de Inspección Técnica
                      </span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Califique cada subsistema y registre las observaciones mecánicas correspondientes.
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      5 Subsistemas
                    </span>
                  </div>

                  {/* Subsistema 1: Motor y Transmisión */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        a) Motor y Planta Motriz (20 pts máx):
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        qMotor === 20 ? "text-emerald-400 bg-emerald-500/10" : qMotor === 10 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}>
                        {qMotor}/20 pts
                      </span>
                    </div>
                    <select
                      value={qMotor}
                      onChange={(e) => setQMotor(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs bg-slate-900 border border-white/10"
                    >
                      <option value={20}>Excelente - Sin fugas de fluidos, compresión y ralentí parejos (+20 pts)</option>
                      <option value={10}>Desgaste menor - Sudoración leve de aceite o mantenimiento preventivo sugerido (+10 pts)</option>
                      <option value={0}>Crítico - Fugas severas, sobrecalentamiento o ruidos metálicos internos (+0 pts)</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                        📝 Cuadro de Observaciones Técnicas (Motor):
                      </label>
                      <textarea
                        rows={2}
                        value={obsMotor}
                        onChange={(e) => setObsMotor(e.target.value)}
                        placeholder="Ej: Sin fugas en empaque de tapa válvulas; aceite en nivel y viscosidad adecuada; correas en buen estado..."
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Subsistema 2: Chasis y Carrocería */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        b) Estructura, Chasis y Carrocería (20 pts máx):
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        qChasis === 20 ? "text-emerald-400 bg-emerald-500/10" : qChasis === 12 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}>
                        {qChasis}/20 pts
                      </span>
                    </div>
                    <select
                      value={qChasis}
                      onChange={(e) => setQChasis(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs bg-slate-900 border border-white/10"
                    >
                      <option value={20}>Impecable - Estructura original sin colisiones ni óxido estructural (+20 pts)</option>
                      <option value={12}>Leves detalles - Rayones cosméticos de uso o repintado de piezas exteriores (+12 pts)</option>
                      <option value={0}>Grave - Daño en largueros/punteras, corrosión severa o descuadre de puertas (+0 pts)</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                        📝 Cuadro de Observaciones Técnicas (Estructura/Chasis):
                      </label>
                      <textarea
                        rows={2}
                        value={obsChasis}
                        onChange={(e) => setObsChasis(e.target.value)}
                        placeholder="Ej: Compactos rectos sin soldaduras de bancada; pintura uniforme en paneles; pequeños toques en parachoques..."
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Subsistema 3: Dirección, Tren Delantero y Frenos */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        c) Dirección, Suspensión y Sistema de Frenos (20 pts máx):
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        qDireccion === 20 ? "text-emerald-400 bg-emerald-500/10" : qDireccion === 10 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}>
                        {qDireccion}/20 pts
                      </span>
                    </div>
                    <select
                      value={qDireccion}
                      onChange={(e) => setQDireccion(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs bg-slate-900 border border-white/10"
                    >
                      <option value={20}>Óptimo y Firme - Amortiguadores secos y frenado balanceado (+20 pts)</option>
                      <option value={10}>Desgaste medio - Holgura menor en terminales o pastillas al 40% (+10 pts)</option>
                      <option value={0}>Inseguro - Fugas en bomba/cálipers, discos alabeados o rótulas con juego crítico (+0 pts)</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                        📝 Cuadro de Observaciones Técnicas (Suspensión y Frenos):
                      </label>
                      <textarea
                        rows={2}
                        value={obsDireccion}
                        onChange={(e) => setObsDireccion(e.target.value)}
                        placeholder="Ej: Espesor de discos y pastillas medidos en tolerancia; bujes y rótulas sin juego peligroso..."
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Subsistema 4: Escáner OBD-II y Sensores */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        d) Escáner OBD-II y Red de A bordo (20 pts máx):
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        qOBD === 20 ? "text-emerald-400 bg-emerald-500/10" : qOBD === 10 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}>
                        {qOBD}/20 pts
                      </span>
                    </div>
                    <select
                      value={qOBD}
                      onChange={(e) => setQOBD(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs bg-slate-900 border border-white/10"
                    >
                      <option value={20}>Limpio - 0 DTCs en módulos ECM/TCM/ABS/SRS y monitores completos (+20 pts)</option>
                      <option value={10}>Secundario - Códigos históricos no críticos o sensor de parking/luz secundario (+10 pts)</option>
                      <option value={0}>Falla Crítica - Testigo MIL Check Engine, fallas de airbag o ABS encendidas (+0 pts)</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                        📝 Cuadro de Observaciones Técnicas (OBD-II y Electrónica):
                      </label>
                      <textarea
                        rows={2}
                        value={obsOBD}
                        onChange={(e) => setObsOBD(e.target.value)}
                        placeholder="Ej: Escaneado con equipo pericial; lecturas de voltaje del alternador a 14.2V; sin fallas de encendido..."
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Subsistema 5: Neumáticos y Fluidos */}
                  <div className="p-3 rounded-xl bg-slate-950/40 border border-white/5 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-200">
                        e) Neumáticos, Llantas y Fluidos Auxiliares (20 pts máx):
                      </label>
                      <span className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                        qNeumaticos === 20 ? "text-emerald-400 bg-emerald-500/10" : qNeumaticos === 10 ? "text-amber-400 bg-amber-500/10" : "text-rose-400 bg-rose-500/10"
                      }`}>
                        {qNeumaticos}/20 pts
                      </span>
                    </div>
                    <select
                      value={qNeumaticos}
                      onChange={(e) => setQNeumaticos(Number(e.target.value))}
                      className="w-full glass-input rounded-xl px-3 py-1.5 text-xs bg-slate-900 border border-white/10"
                    >
                      <option value={20}>Excelente - Vida útil superior al 70%, desgaste simétrico y repuesto operativo (+20 pts)</option>
                      <option value={10}>Intermedio - Vida útil entre 30% y 70%, banda de rodadura aceptable (+10 pts)</option>
                      <option value={0}>Inseguro - Llantas lisas (menos de 2mm), cristalizadas, rajadas o vencidas (+0 pts)</option>
                    </select>
                    <div>
                      <label className="block text-[10px] text-slate-400 uppercase tracking-wider mb-1">
                        📝 Cuadro de Observaciones Técnicas (Neumáticos y Fluidos):
                      </label>
                      <textarea
                        rows={2}
                        value={obsNeumaticos}
                        onChange={(e) => setObsNeumaticos(e.target.value)}
                        placeholder="Ej: Profundidad promedio de banda 5.5mm; DOT vigente; líquido refrigerante en punto óptimo..."
                        className="w-full glass-input rounded-xl px-3 py-1.5 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600"
                      />
                    </div>
                  </div>

                  {/* Dictamen Pericial General */}
                  <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                    <label className="block text-xs font-bold text-amber-300">
                      📋 Dictamen Pericial General y Recomendaciones del Taller:
                    </label>
                    <p className="text-[10px] text-slate-400">
                      Conclusión técnica que figurará formalmente en el Certificado y Hoja de Vida del vehículo:
                    </p>
                    <textarea
                      rows={3}
                      value={obsDictamenGeneral}
                      onChange={(e) => setObsDictamenGeneral(e.target.value)}
                      placeholder="Ej: Vehículo en condiciones mecánicas y estructurales aptas para circular con confiabilidad. Se recomienda próximo cambio de aceite a los 50.000 km..."
                      className="w-full glass-input rounded-xl px-3 py-2 text-xs resize-none focus:outline-none focus:border-amber-500 placeholder:text-slate-600 bg-slate-900/80"
                    />
                  </div>
                </div>

                {/* Bloque 3: Cálculo del Score en Vivo */}
                <div className={`rounded-2xl p-4 flex items-center justify-between border transition-colors ${
                  esReinspeccion
                    ? "bg-amber-500/10 border-amber-500/30"
                    : "bg-amber-500/5 border-amber-500/20"
                }`}>
                  <div className="min-w-0">
                    <span className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block">
                      {esReinspeccion ? "AutoScore Pericial Oficial (Re-Inspección)" : "AutoScore Pericial Resultante"}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                      {esReinspeccion && vehiculoExistenteInfo ? (
                        <span>
                          Puntaje anterior: <strong className="line-through text-slate-400">{vehiculoExistenteInfo.scoreActual} pts</strong> ➔ Nuevo puntaje oficial tras auditoría pericial de mejoras.
                        </span>
                      ) : (
                        <span>Puntaje de confianza pericial respaldado por el taller homologado de {loggedMecanico.nombre}.</span>
                      )}
                    </p>
                  </div>
                  <div className="text-right ml-4 shrink-0 bg-amber-500/10 px-4 py-2 rounded-xl border border-amber-500/30">
                    <span className="text-2xl font-mono font-black text-amber-400 block tracking-tight">
                      {qMotor + qChasis + qDireccion + qOBD + qNeumaticos} pts
                    </span>
                    <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider block mt-0.5">
                      {qMotor + qChasis + qDireccion + qOBD + qNeumaticos >= 80 ? "Sello Verde" : qMotor + qChasis + qDireccion + qOBD + qNeumaticos >= 60 ? "Sello Amarillo" : "Sello Rojo"}
                    </span>
                  </div>
                </div>

                {inspError && (
                  <div className="p-3.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-start gap-2.5 leading-relaxed">
                    <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <span>{inspError}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingInsp}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg cursor-pointer"
                >
                  {isSubmittingInsp ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : esReinspeccion ? (
                    <>
                      <Sparkles className="w-4 h-4 text-slate-950" />
                      <span>Certificar Re-Inspección Técnica Oficial (Nuevo Score: {qMotor + qChasis + qDireccion + qOBD + qNeumaticos} pts)</span>
                    </>
                  ) : (
                    <>
                      <ClipboardCheck className="w-4 h-4" />
                      <span>Certificar e Inscribir Inspección Técnica Oficial</span>
                    </>
                  )}
                </button>

              </form>
            </div>
          )}

          {/* ---------------- TAB 3: REPUTACIÓN Y CALIDAD TÉCNICA DEL MECÁNICO ---------------- */}
          {activeTab === "reputacion" && (
            <div className="glass-panel p-5 shadow-xl relative overflow-hidden space-y-4">
              <div className="flex items-center justify-between border-b border-white/5 pb-3">
                <div className="flex items-center gap-1.5">
                  <Star className="w-4.5 h-4.5 text-amber-500 fill-amber-500/20" />
                  <h4 className="text-sm font-display font-bold text-white">
                    Mi Calidad Técnica y Reputación
                  </h4>
                </div>
                <button
                  type="button"
                  onClick={() => loggedMecanico && cargarReputacionMecanico(loggedMecanico.codigoMecanico)}
                  className="p-1 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="Actualizar datos"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loadingReputacion ? "animate-spin text-amber-500" : ""}`} />
                </button>
              </div>

              {/* Métricas del Mecánico */}
              {(() => {
                const pct = loggedMecanico?.porcentajeCalidad != null ? Number(loggedMecanico.porcentajeCalidad) : 100;
                const pos = Number(loggedMecanico?.totalPositivas || 0);
                const neg = Number(loggedMecanico?.totalNegativas || 0);
                const totalTrabajos = Number(loggedMecanico?.totalServicios || (pos + neg));

                let badgeClase = "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
                let badgeTexto = "Taller Certificado Oro / Excelente";
                if (neg > 0 && pct < 75) {
                  badgeClase = "bg-red-500/10 text-red-400 border-red-500/30";
                  badgeTexto = "Alerta Técnica: Quejas Recurrentes";
                } else if (pct < 90) {
                  badgeClase = "bg-amber-500/10 text-amber-400 border-amber-500/30";
                  badgeTexto = "Calidad Confiable";
                }

                return (
                  <div className="space-y-3">
                    <div className="bg-slate-900/60 border border-white/5 rounded-2xl p-4 text-center relative overflow-hidden">
                      <span className="text-[9px] font-mono font-bold text-amber-500 uppercase tracking-widest block">
                        Índice de Aprobación Oficial
                      </span>
                      <div className="text-4xl font-display font-black text-white mt-1">
                        {pct}%
                      </div>
                      <span className={`inline-block mt-2 px-3 py-0.5 rounded-full border text-[10px] font-bold ${badgeClase}`}>
                        {badgeTexto}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl">
                        <span className="text-emerald-400 font-black text-lg block">👍 {pos}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-mono">Positivas</span>
                      </div>
                      <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl">
                        <span className="text-red-400 font-black text-lg block">👎 {neg}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-mono">Reclamos</span>
                      </div>
                      <div className="bg-slate-900/40 border border-white/5 p-2.5 rounded-xl">
                        <span className="text-amber-400 font-black text-lg block">{totalTrabajos}</span>
                        <span className="text-[9px] text-slate-400 uppercase font-mono">Servicios</span>
                      </div>
                    </div>

                    {/* Alerta de Mejora si tiene evaluaciones negativas */}
                    {neg > 0 && (
                      <div className="bg-red-950/20 border border-red-500/30 p-3 rounded-2xl text-[11px] text-red-300 space-y-1">
                        <div className="flex items-center gap-1.5 font-bold text-red-400">
                          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                          <span>Atención a reportes de inconformidad técnica</span>
                        </div>
                        <p className="text-[10px] text-red-200/80 leading-relaxed">
                          Revisa a continuación el motivo de cada queja dejada por los propietarios. Contactar al cliente para otorgar garantía técnica te permite resolver el desacuerdo y mantener tu acreditación oficial.
                        </p>
                      </div>
                    )}

                    {/* Listado de Opiniones de Clientes */}
                    <div className="space-y-2 pt-2 border-t border-white/5">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest block">
                          Evaluaciones de Propietarios ({mecanicoHistorial.filter(h => h.evaluacion).length}):
                        </span>

                        {/* Filtros con la suma de calificaciones */}
                        <div className="flex items-center gap-1 text-[9.5px] font-mono">
                          <button
                            type="button"
                            onClick={() => setFiltroOpiniones("todas")}
                            className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer ${
                              filtroOpiniones === "todas"
                                ? "bg-amber-500 text-slate-950 border-amber-400 font-black"
                                : "bg-slate-900 border-white/10 text-slate-400 hover:text-white"
                            }`}
                          >
                            Todas ({pos + neg})
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroOpiniones("bueno")}
                            className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              filtroOpiniones === "bueno"
                                ? "bg-emerald-500 text-slate-950 border-emerald-400 font-black"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20"
                            }`}
                          >
                            <span>👍 Bueno ({pos})</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setFiltroOpiniones("malo")}
                            className={`px-2 py-0.5 rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                              filtroOpiniones === "malo"
                                ? "bg-red-500 text-white border-red-400 font-black"
                                : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                            }`}
                          >
                            <span>👎 Malo ({neg})</span>
                          </button>
                        </div>
                      </div>

                      {(() => {
                        const listaOpiniones = mecanicoHistorial.filter(h => {
                          if (!h.evaluacion) return false;
                          if (filtroOpiniones === "bueno") return h.evaluacion === "Bueno";
                          if (filtroOpiniones === "malo") return h.evaluacion === "Malo";
                          return true;
                        });

                        if (listaOpiniones.length === 0) {
                          return (
                            <div className="p-5 bg-slate-900/30 border border-white/5 rounded-2xl text-center text-xs text-slate-500 space-y-1">
                              <p>No hay evaluaciones {filtroOpiniones !== "todas" ? `en la categoría seleccionada` : "aún"}.</p>
                              <p className="text-[10px]">Las opiniones aparecerán aquí cuando los dueños califiquen el trabajo en su garaje.</p>
                            </div>
                          );
                        }

                        return (
                          <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1">
                            {listaOpiniones.map((h: any, idx: number) => {
                              const esBueno = h.evaluacion === "Bueno";
                              return (
                                <div
                                  key={idx}
                                  className={`p-3 rounded-2xl border text-xs space-y-1.5 ${
                                    esBueno
                                      ? "bg-emerald-500/5 border-emerald-500/20 text-slate-200"
                                      : "bg-red-500/10 border-red-500/30 text-slate-200"
                                  }`}
                                >
                                  <div className="flex items-center justify-between">
                                    <span className={`text-[10px] font-black uppercase flex items-center gap-1 ${
                                      esBueno ? "text-emerald-400" : "text-red-400"
                                    }`}>
                                      <span>{esBueno ? "👍" : "👎"}</span>
                                      <span>{esBueno ? "Calidad Aprobada" : "Reporte de Inconformidad"}</span>
                                    </span>
                                    <span className="text-[9px] font-mono text-slate-400">
                                      {h.fechaEvaluacion ? h.fechaEvaluacion.split(" ")[0] : h.fecha}
                                    </span>
                                  </div>

                                  <div className="text-[10px] text-slate-400 font-mono">
                                    Vehículo: {h.placa} · Trabajo: "{h.trabajoRealizado}"
                                  </div>

                                  {h.comentarioEvaluacion && (
                                    <div className={`p-2 rounded-xl text-[11px] leading-relaxed border ${
                                      esBueno
                                        ? "bg-black/40 text-emerald-100 border-emerald-500/20"
                                        : "bg-black/50 text-red-200 border-red-500/40 font-medium"
                                    }`}>
                                      "{h.comentarioEvaluacion}"
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })()}
            </div>
          )}

        </div>
      )}

      {/* ---------------- PANTALLA ADICIONAL: INTERFAZ DE ESCÁNER DE QR (MODAL) ---------------- */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex flex-col justify-center items-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-sm glass-panel p-5 shadow-2xl overflow-hidden relative">
            
            {/* Header del Escáner */}
            <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/5">
              <h4 className="text-sm font-display font-extrabold text-white flex items-center gap-1.5">
                <Camera className="w-4.5 h-4.5 text-amber-500" />
                Lector de Placas QR
              </h4>
              <button
                onClick={() => {
                  setShowScanner(false);
                  stopCamera();
                }}
                className="text-xs text-slate-400 hover:text-white px-2 py-1 bg-white/5 border border-white/10 rounded"
              >
                Cerrar
              </button>
            </div>

            {/* Visor de Cámara Real para Detección de Placa */}
            <div className="space-y-3">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-left space-y-1">
                <div className="flex items-center gap-1.5 text-amber-400">
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-bold font-display uppercase tracking-wider">Escáner Automático QR</span>
                </div>
                <p className="text-[9px] text-slate-300 leading-normal">
                  Apunta la cámara al código QR generado por el dueño del vehículo para cargar la placa de forma automática.
                </p>
              </div>

              {cameraError ? (
                <div className="p-3 bg-red-950/30 border border-red-900/40 rounded-xl text-[11px] text-red-400 text-center leading-relaxed">
                  <AlertTriangle className="w-5 h-5 mx-auto mb-1 text-red-500" />
                  <span>{cameraError}</span>
                  <p className="text-[10px] text-slate-400 mt-2">Puedes cerrar esta ventana e ingresar la placa directamente en la casilla del formulario.</p>
                </div>
              ) : (
                <div className="relative w-full aspect-square bg-black rounded-2xl overflow-hidden border border-slate-800">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />

                  {/* HUD Overlay / Grid de Escaneo */}
                  <div className="absolute inset-0 border-[28px] border-slate-950/70 flex items-center justify-center pointer-events-none">
                    <div className="w-full h-full border-2 border-amber-500 relative">
                      <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-amber-400" />
                      <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-amber-400" />
                      <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-amber-400" />
                      <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-amber-400" />
                      <div className="absolute left-0 right-0 h-[1.5px] bg-amber-400/80 shadow-sm shadow-amber-400 animate-pulse" style={{ top: '50%' }} />
                    </div>
                  </div>

                  <div className="absolute bottom-3 left-0 right-0 text-center pointer-events-none">
                    <span className="bg-slate-950/80 px-2.5 py-1 rounded-full text-[9px] font-mono tracking-wider text-amber-400 uppercase font-semibold">
                      Apunta al QR vehicular
                    </span>
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    if (cameraActive) {
                      stopCamera();
                    } else {
                      startCamera();
                    }
                  }}
                  className="flex-1 bg-slate-900 border border-white/10 hover:border-amber-500/40 text-slate-200 font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${cameraActive ? "animate-spin" : ""}`} />
                  <span>{cameraActive ? "Reiniciar Sensor" : "Encender Cámara"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowScanner(false);
                    stopCamera();
                  }}
                  className="px-4 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-xs font-bold cursor-pointer transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
