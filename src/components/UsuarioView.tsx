import React, { useState } from "react";
import { 
  User, Car, Shield, QrCode, ClipboardList, Lock, Sparkles, ChevronLeft, 
  Search, Calendar, Gauge, Award, Wrench, RefreshCw, AlertCircle, HelpCircle, CheckCircle,
  Download
} from "lucide-react";
import { Vehiculo, HistorialRow } from "../types";
import { simularGetPorDueno, simularGetCertificado, simularRegistrarVehiculo } from "../mockData";

interface UsuarioViewProps {
  useSimulado: boolean;
  appScriptUrl: string;
}

export default function UsuarioView({ useSimulado, appScriptUrl }: UsuarioViewProps) {
  // Estados de Sesión del Usuario
  const [idDueno, setIdDueno] = useState("");
  const [loggedDueno, setLoggedDueno] = useState<string | null>(null);
  const [vehiculos, setVehiculos] = useState<Vehiculo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Estados de Interacción con Carro seleccionado
  const [selectedCar, setSelectedCar] = useState<Vehiculo | null>(null);
  const [mostrarOpciones, setMostrarOpciones] = useState(false);
  const [activeCertType, setActiveCertType] = useState<"simple" | "completo" | null>(null);
  const [mostrarQR, setMostrarQR] = useState(false);

  // Historial cargado del carro (solo para certificado completo)
  const [historial, setHistorial] = useState<HistorialRow[]>([]);
  const [loadingCert, setLoadingCert] = useState(false);

  // Estados para Registro de un nuevo Vehículo por el propietario
  const [mostrarFormRegistro, setMostrarFormRegistro] = useState(false);
  const [nuevaPlaca, setNuevaPlaca] = useState("");
  const [nuevaMarca, setNuevaMarca] = useState("");
  const [nuevoModelo, setNuevoModelo] = useState("");
  const [nuevoAnio, setNuevoAnio] = useState("");
  const [errorRegistro, setErrorRegistro] = useState<string | null>(null);
  const [registrandoVehiculo, setRegistrandoVehiculo] = useState(false);

  const calcularScoreAutomatico = (anioStr: string): number => {
    const anio = Number(anioStr);
    if (!anioStr || isNaN(anio) || anio < 1900) return 90; // puntuación base por defecto
    const anioActual = new Date().getFullYear();
    const antiguedad = Math.max(0, anioActual - anio);
    const scoreCalculado = 100 - (antiguedad * 1.5);
    return Math.round(Math.min(100, Math.max(50, scoreCalculado)));
  };

  const handleRegistrarVehiculo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggedDueno) return;
    if (!nuevaPlaca.trim() || !nuevaMarca.trim() || !nuevoModelo.trim() || !nuevoAnio.trim()) {
      setErrorRegistro("Por favor rellene todos los campos obligatorios.");
      return;
    }

    setRegistrandoVehiculo(true);
    setErrorRegistro(null);

    const numAnio = Number(nuevoAnio);
    if (isNaN(numAnio) || numAnio < 1900 || numAnio > new Date().getFullYear() + 1) {
      setErrorRegistro("Por favor ingrese un año válido.");
      setRegistrandoVehiculo(false);
      return;
    }

    const numScore = calcularScoreAutomatico(nuevoAnio);

    const nuevoCarro: Vehiculo = {
      placa: nuevaPlaca.trim().toUpperCase(),
      marca: nuevaMarca.trim(),
      modelo: nuevoModelo.trim(),
      anio: numAnio,
      idDueno: loggedDueno,
      score: numScore,
      estadoCertificado: "Activo"
    };

    try {
      if (useSimulado) {
        // Registrar en mockData local
        setTimeout(() => {
          const res = simularRegistrarVehiculo(nuevoCarro);
          if (res.success) {
            setVehiculos((prev) => [...prev, res.vehiculo as Vehiculo]);
            setMostrarFormRegistro(false);
            setNuevaPlaca("");
            setNuevaMarca("");
            setNuevoModelo("");
            setNuevoAnio("");
          } else {
            setErrorRegistro(res.error || "Error al registrar el vehículo.");
          }
          setRegistrandoVehiculo(false);
        }, 800);
      } else {
        // Registrar en Google Sheets Live
        if (!appScriptUrl) {
          throw new Error("Debe configurar la URL del Google Apps Script en el botón de arriba ⚙️.");
        }

        const payload = {
          accion: "registrarVehiculo",
          placa: nuevoCarro.placa,
          marca: nuevoCarro.marca,
          modelo: nuevoCarro.modelo,
          anio: nuevoCarro.anio,
          idDueno: nuevoCarro.idDueno,
          score: nuevoCarro.score,
          estadoCertificado: nuevoCarro.estadoCertificado
        };

        const response = await fetch(appScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          },
          body: JSON.stringify(payload)
        });

        if (!response.ok) {
          throw new Error(`Error en la conexión del servidor: ${response.statusText}`);
        }

        const result = await response.json();
        if (result && result.success) {
          setVehiculos((prev) => [...prev, nuevoCarro]);
          setMostrarFormRegistro(false);
          setNuevaPlaca("");
          setNuevaMarca("");
          setNuevoModelo("");
          setNuevoAnio("");
        } else {
          setErrorRegistro((result && result.error) || "Error al registrar el vehículo en Sheets.");
        }
        setRegistrandoVehiculo(false);
      }
    } catch (err: any) {
      setErrorRegistro(err.message || "Error al conectar con la base de datos.");
      setRegistrandoVehiculo(false);
    }
  };

  const isVencido = selectedCar ? (selectedCar.estadoCertificado || "Activo").toLowerCase() !== "activo" : false;

  // 1. LOGIN / INGRESO AL GARAJE VIRTUAL
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idDueno.trim()) return;

    setLoading(true);
    setError(null);

    try {
      if (useSimulado) {
        // Ejecutar simulación local instantánea
        setTimeout(() => {
          const res = simularGetPorDueno(idDueno) as any;
          if (res.success) {
            setVehiculos(res.data);
            setLoggedDueno(idDueno.trim());
          } else {
            setError(res.error || "Error al buscar vehículos.");
          }
          setLoading(false);
        }, 600); // Pequeño retraso para dar sensación de procesamiento real
      } else {
        // Consulta real por API a Google Sheets
        if (!appScriptUrl) {
          throw new Error("Debe configurar la URL del Google Apps Script en el botón de arriba ⚙️.");
        }

        const fetchUrl = `${appScriptUrl}?idDueno=${encodeURIComponent(idDueno.trim())}`;
        const response = await fetch(fetchUrl, {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          }
        });
        if (!response.ok) {
          throw new Error(`Error de conexión al servidor: ${response.statusText}`);
        }

        const result = await response.json();
        if (result && result.success) {
          const validVehiculos = Array.isArray(result.data) ? result.data : [];
          setVehiculos(validVehiculos);
          setLoggedDueno(idDueno.trim());
        } else {
          setVehiculos([]);
          setError((result && result.error) || "No se encontraron vehículos.");
        }
        setLoading(false);
      }
    } catch (err: any) {
      const errorMsg = err.message || "";
      if (
        errorMsg.includes("Failed to fetch") || 
        errorMsg.includes("fetch") || 
        errorMsg.includes("Unexpected token") || 
        err instanceof TypeError
      ) {
        setError(
          "⚠️ ERROR DE CONEXIÓN CON GOOGLE SHEETS: Tu Google Apps Script no está permitiendo la conexión externa del navegador (CORS). Sigue estos 3 pasos obligatorios:\n\n" +
          "1. En el editor de Apps Script, dale clic arriba a 'Implementar' > 'Nueva implementación'.\n" +
          "2. En 'Tipo', elige 'Aplicación web'. Configura 'Ejecutar como: Yo' y 'Quién tiene acceso: Cualquier persona' (Anyone).\n" +
          "3. Haz clic en 'Implementar', autoriza los permisos y COPIA la URL que termina en '/exec'.\n\n" +
          "Nota: Si usas la URL de prueba '/dev' o no pusiste 'Cualquier persona', el navegador siempre dará este error."
        );
      } else {
        setError(err.message || "Error al conectar con la base de datos de Google Sheets.");
      }
      setLoading(false);
    }
  };

  // 2. CONSULTAR CERTIFICADO (SIMPLE O COMPLETO)
  const handleVerCertificado = async (car: Vehiculo, tipo: "simple" | "completo") => {
    setActiveCertType(tipo);
    setMostrarQR(false);
    setMostrarOpciones(false);
    setLoadingCert(true);
    setError(null);

    try {
      if (useSimulado) {
        setTimeout(() => {
          const res = simularGetCertificado(car.placa, tipo);
          if (res.success) {
            setSelectedCar(res.vehiculo);
            setHistorial(res.historial || []);
          } else {
            setError(res.error || "No se pudo recuperar el certificado.");
          }
          setLoadingCert(false);
        }, 500);
      } else {
        if (!appScriptUrl) {
          throw new Error("La URL de Apps Script no está configurada.");
        }

        const fetchUrl = `${appScriptUrl}?placa=${encodeURIComponent(car.placa)}&tipoCertificado=${tipo}`;
        const response = await fetch(fetchUrl, {
          method: "GET",
          mode: "cors",
          headers: {
            "Content-Type": "text/plain;charset=utf-8"
          }
        });
        if (!response.ok) {
          throw new Error("Error en la conexión de red.");
        }

        const result = await response.json();
        if (result && result.success) {
          setSelectedCar(result.vehiculo || null);
          setHistorial(Array.isArray(result.historial) ? result.historial : []);
        } else {
          setError((result && result.error) || "No se encontró el certificado solicitado.");
        }
        setLoadingCert(false);
      }
    } catch (err: any) {
      const errorMsg = err.message || "";
      if (
        errorMsg.includes("Failed to fetch") || 
        errorMsg.includes("fetch") || 
        errorMsg.includes("Unexpected token") || 
        err instanceof TypeError
      ) {
        setError(
          "⚠️ ERROR DE CONEXIÓN CON GOOGLE SHEETS: Tu Google Apps Script no está permitiendo la conexión externa del navegador (CORS). Sigue estos 3 pasos obligatorios:\n\n" +
          "1. En el editor de Apps Script, dale clic arriba a 'Implementar' > 'Nueva implementación'.\n" +
          "2. En 'Tipo', elige 'Aplicación web'. Configura 'Ejecutar como: Yo' y 'Quién tiene acceso: Cualquier persona' (Anyone).\n" +
          "3. Haz clic en 'Implementar', autoriza los permisos y COPIA la URL que termina en '/exec'.\n\n" +
          "Nota: Si usas la URL de prueba '/dev' o no pusiste 'Cualquier persona', el navegador siempre dará este error."
        );
      } else {
        setError(err.message || "Fallo la comunicación con Google Sheets.");
      }
      setLoadingCert(false);
    }
  };

  // Desconectar o cerrar sesión de garaje
  const handleLogout = () => {
    setLoggedDueno(null);
    setVehiculos([]);
    setSelectedCar(null);
    setMostrarOpciones(false);
    setActiveCertType(null);
    setMostrarQR(false);
    setIdDueno("");
  };

  // Volver del Certificado o QR al Garaje Virtual
  const handleBackToGarage = () => {
    setSelectedCar(null);
    setActiveCertType(null);
    setMostrarQR(false);
    setMostrarOpciones(false);
    setError(null);
  };

  // Obtener color del Score
  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-emerald-400 border-emerald-500/30 bg-emerald-500/10";
    if (score >= 70) return "text-amber-400 border-amber-500/30 bg-amber-500/10";
    return "text-red-400 border-red-500/30 bg-red-500/10";
  };

  // Obtener etiqueta de Salud Mecánica basada en el Score (para carros activos)
  const getSaludMecanicaTag = (score: number) => {
    if (score >= 90) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
          🟢 MANTENIMIENTO AL DÍA
        </span>
      );
    }
    if (score >= 70) {
      return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/25">
          🟡 MANTENIMIENTO RETRASADO
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/25 animate-pulse">
        🔴 ALERTA MECÁNICA: REQUIERE REVISIÓN
      </span>
    );
  };

  const renderTimeline = () => {
    if (isVencido) {
      return (
        <div className="p-5 bg-red-500/5 border border-red-500/20 rounded-2xl text-center">
          <div className="inline-flex p-2.5 rounded-xl bg-red-500/10 text-red-400 mb-3 border border-red-500/20">
            <Lock className="w-5 h-5" />
          </div>
          <p className="text-xs text-red-400 font-bold uppercase tracking-wider">Historial Bloqueado</p>
          <p className="text-[11px] text-slate-400 mt-2 leading-relaxed max-w-sm mx-auto">
            La línea de tiempo detallada de reparaciones y mantenimiento está bloqueada porque el certificado de este vehículo ha expirado.
          </p>
          <a
            href={`https://wa.me/584120000000?text=${encodeURIComponent(
              `Hola AutoScore, deseo renovar el certificado digital de mi vehículo placa ${selectedCar?.placa} para actualizar mi Score Mecánico y habilitar el historial de reparaciones.`
            )}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-flex items-center gap-2 bg-red-500 hover:bg-red-400 text-white font-extrabold text-[11px] py-2 px-4 rounded-xl shadow-lg transition-all"
          >
            Renovar Certificado Ahora
          </a>
        </div>
      );
    }

    if (loadingCert) {
      return (
        <div className="text-center py-6 text-slate-500 text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Recuperando registros...</span>
        </div>
      );
    }

    if (historial.length === 0) {
      return (
        <div className="text-center py-6 bg-slate-950/40 rounded-xl border border-slate-900 text-xs text-slate-500 leading-normal">
          No se registran mantenimientos técnicos firmados para esta unidad.
        </div>
      );
    }

    return (
      <div className="space-y-4 relative before:absolute before:left-3.5 before:top-2 before:bottom-2 before:w-[1.5px] before:bg-slate-800">
        {historial.map((row, index) => (
          <div key={row.idHistorial || index} className="relative pl-8">
            {/* Nodo de línea de tiempo */}
            <div className="absolute left-1.5 top-1.5 w-4 h-4 rounded-full bg-amber-500/20 border border-amber-500 flex items-center justify-center">
              <Wrench className="w-2.5 h-2.5 text-amber-400" />
            </div>

            {/* Contenido del registro */}
            <div className="bg-black/40 border border-white/5 rounded-xl p-4 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {row.fecha ? row.fecha.split(" ")[0] : "Fecha N/A"}
                </span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 flex items-center gap-1 w-fit">
                  <Gauge className="w-3 h-3" />
                  {(row.kilometraje ?? 0).toLocaleString()} km
                </span>
              </div>

              <p className="text-xs text-slate-300 font-light leading-relaxed mb-3">
                {row.trabajoRealizado}
              </p>

              <div className="pt-2.5 border-t border-white/5 text-[10px] text-slate-500 flex flex-wrap justify-between items-center gap-1.5">
                <span className="font-medium text-slate-400">
                  Taller: <strong className="text-slate-300 font-semibold">{row.taller}</strong>
                </span>
                <span className="font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                  Firma: #{row.codigoMecanico}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderContent = () => {
    // ---------------- PANTALLA: LOGIN PROPIETARIO ----------------
    if (!loggedDueno) {
      return (
        <div className="glass-panel p-6 shadow-xl">
          <div className="text-center mb-6">
            <div className="inline-flex p-3 rounded-2xl bg-amber-500/10 text-amber-400 mb-3 border border-amber-500/20">
              <User className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-display font-extrabold text-white">Mi Garaje AutoScore</h2>
            <p className="text-xs text-slate-400 mt-1">
              Ingresa tus credenciales registradas para ver tus carros homologados y consultar tus certificados VIP.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Cédula de Identidad o Correo del Dueño:
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Ej: 26123456 o correo@ejemplo.com"
                  value={idDueno}
                  onChange={(e) => setIdDueno(e.target.value)}
                  className="w-full glass-input rounded-xl pl-11 pr-4 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 placeholder-slate-500 font-medium"
                />
              </div>
              <p className="text-[10px] text-slate-500 mt-1">
                * Tip: Si usas el simulador, ingresa el ID pre-cargado: <strong className="text-amber-500/80 font-mono">26123456</strong>
              </p>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/30 border border-red-900/40 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-3 px-4 rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
              id="btn-login-dueno"
            >
              {loading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  Buscar en el Garaje
                </>
              )}
            </button>
          </form>

          {/* Información de ayuda Venezuela */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 text-[11px] text-slate-500 leading-relaxed">
            <span className="font-semibold text-slate-400 block mb-1">¿Cómo funciona AutoScore?</span>
            El registro vincula múltiples carros bajo un solo dueño mediante el ID proporcionado. Cada carro tiene un registro inviolable alimentado exclusivamente por talleres mecánicos certificados.
          </div>
        </div>
      );
    }

    // ---------------- PANTALLA: RENDER DE CERTIFICADO DIGITAL VIP ----------------
    if (selectedCar && activeCertType) {
      if (isVencido) {
        return (
          <div className="space-y-6">
            {/* Botón volver */}
            <button
              onClick={handleBackToGarage}
              className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider no-print"
              id="btn-cert-back"
            >
              <ChevronLeft className="w-4.5 h-4.5" />
              Volver al Garaje
            </button>

            <div className="glass-panel p-6 shadow-2xl border border-red-500/30 text-center space-y-6 relative overflow-hidden">
              <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-red-600 via-red-500 to-red-600"></div>
              
              <div className="inline-flex p-4 rounded-full bg-red-500/10 text-red-500 border border-red-500/25 animate-pulse mt-4">
                <Lock className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black uppercase tracking-wider text-red-400 block font-bold">
                  🔴 Certificación Vencida
                </span>
                <h3 className="text-lg font-display font-extrabold text-white">
                  Acceso Bloqueado
                </h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  La visualización del certificado digital, el Score de confianza y la descarga en PDF están suspendidos por falta de pago. Renueva hoy mismo para reactivar el estatus de tu vehículo.
                </p>
              </div>

              <div className="bg-black/40 border border-white/5 rounded-xl p-4 text-xs text-slate-400 font-mono space-y-1">
                <div>Vehículo: <strong className="text-slate-200">{selectedCar.marca} {selectedCar.modelo}</strong></div>
                <div>Placa: <strong className="text-slate-200">{selectedCar.placa}</strong></div>
              </div>

              <a
                href={`https://wa.me/584120000000?text=${encodeURIComponent(
                  `Hola AutoScore, deseo renovar el certificado digital de mi vehículo placa ${selectedCar?.placa} para activar mi Score Mecánico`
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-extrabold text-xs py-3.5 px-4 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/45 active:scale-[0.98] transition-all duration-200 border border-red-500/30 font-bold"
                id="btn-renew-blocked-view"
              >
                Chatear para Renovar y Activar
              </a>
            </div>
          </div>
        );
      }

      return (
        <div className="space-y-6">
          {/* Botón volver */}
          <button
            onClick={handleBackToGarage}
            className="flex items-center gap-1 text-xs text-amber-500 hover:text-amber-400 font-bold uppercase tracking-wider no-print"
            id="btn-cert-back"
          >
            <ChevronLeft className="w-4.5 h-4.5" />
            Volver al Garaje
          </button>

          {/* Tarjeta del Certificado VIP */}
          <div className={`relative rounded-3xl p-6 ${
            activeCertType === "completo" 
              ? "glass-panel-vip glow-gold" 
              : "glass-panel backdrop-blur-md border-slate-500/30 glow-silver"
          }`}>
            
            {/* Cabecera del Certificado */}
            <div className="flex justify-between items-start mb-6">
              <div>
                <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
                  activeCertType === "completo"
                    ? "bg-amber-400/10 text-amber-400 border-amber-500/20"
                    : "bg-slate-400/10 text-slate-400 border-slate-400/25"
                }`}>
                  <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                  Certificado {activeCertType.toUpperCase()}
                </span>
                <span className="block text-[9px] font-mono text-slate-500 uppercase tracking-widest mt-1.5">
                  Sello de Seguridad Electrónico
                </span>
              </div>
              <Lock className={`w-5 h-5 ${activeCertType === "completo" ? "text-amber-500" : "text-slate-400"}`} />
            </div>

            {/* Datos Técnicos y Puntuación Mecánica (Score) */}
            <div className="flex flex-col sm:flex-row justify-between items-center gap-6 bg-black/40 p-5 rounded-2xl border border-white/5 mb-6">
              <div className="text-center sm:text-left">
                <span className="text-[10px] text-slate-500 font-mono font-medium block">VEHÍCULO HOMOLOGADO</span>
                <h3 className="text-xl font-display font-extrabold text-white mt-0.5 leading-tight">
                  {selectedCar?.marca || "N/A"} {selectedCar?.modelo || ""}
                </h3>
                <span className="text-xs text-slate-400 font-light block">Año fabricación: {selectedCar?.anio || "N/A"}</span>
                <div className="inline-block mt-2 bg-white/5 border border-white/10 text-xs font-mono font-bold px-3 py-0.5 rounded text-slate-300 tracking-wider">
                  PLACA: {selectedCar?.placa || "N/A"}
                </div>
              </div>

              {/* Score Circular / Caja */}
              <div className="flex flex-col items-center gap-3">
                <div className={`w-32 h-32 rounded-full border-4 border-amber-600/20 flex flex-col items-center justify-center p-1 font-display relative ${getScoreColor(selectedCar?.score || 0)}`}>
                  <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin-slow opacity-30"></div>
                  <span className="text-4xl font-black text-white leading-none">{selectedCar?.score ?? 0}</span>
                  <span className="text-[10px] uppercase tracking-widest font-bold opacity-75 mt-1">SCORE</span>
                </div>
                <span className="text-[9px] text-slate-400 font-mono uppercase tracking-widest font-semibold text-center">CALIFICACIÓN MECÁNICA</span>
                {getSaludMecanicaTag(selectedCar?.score ?? 0)}
              </div>
            </div>

            {/* Parámetros Básicos */}
            <div className="grid grid-cols-2 gap-4 mb-6 text-xs bg-black/30 p-4 rounded-xl border border-white/5">
              <div>
                <span className="text-slate-500 font-mono block">Estatus Certificado</span>
                <span className="font-semibold inline-flex items-center gap-1 mt-0.5 text-emerald-400">
                  <Award className="w-3.5 h-3.5" />
                  {selectedCar?.estadoCertificado || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-slate-500 font-mono block">ID Dueño Vinculado</span>
                <span className="font-semibold text-slate-200 mt-0.5 block truncate">
                  {selectedCar?.idDueno || "N/A"}
                </span>
              </div>
            </div>

            {/* ---------------- LÍNEA DE TIEMPO (SOLO CERTIFICADO COMPLETO) ---------------- */}
            {activeCertType === "completo" && (
              <div className="mt-8">
                <h4 className="text-xs font-mono font-bold uppercase tracking-widest text-amber-500/90 mb-4 flex items-center gap-1.5">
                  <ClipboardList className="w-4 h-4" />
                  Línea de Tiempo Verificada ({historial.length})
                </h4>
                {renderTimeline()}
              </div>
            )}

            {/* Mensaje de Oclusión de Historial (SOLO CERTIFICADO SIMPLE) */}
            {activeCertType === "simple" && (
              <div className="mt-4 p-4 bg-slate-950/80 border border-slate-900 rounded-2xl text-center">
                <p className="text-xs text-slate-400 font-medium">
                  Historial de reparaciones ocultado por privacidad.
                </p>
                <p className="text-[10px] text-slate-600 mt-1 leading-normal max-w-xs mx-auto">
                  La versión simple certifica únicamente la autenticidad técnica y el score total. Solicita el Certificado Completo VIP si necesitas inspeccionar la línea de tiempo.
                </p>
                <button
                  onClick={() => handleVerCertificado(selectedCar, "completo")}
                  className="mt-3 inline-flex items-center gap-1 text-[11px] text-amber-400 hover:text-amber-300 font-semibold underline"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Emitir Certificado Completo VIP
                </button>
              </div>
            )}
          </div>

          {/* Botón Descargar PDF */}
          <button
            onClick={() => window.print()}
            className="w-full bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold py-4 px-6 rounded-2xl shadow-xl hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-center gap-2 no-print"
            id="btn-download-pdf"
          >
            <Download className="w-5 h-5 shrink-0 text-slate-950" />
            Descargar Certificado Oficial (PDF)
          </button>
        </div>
      );
    }

    // ---------------- PANTALLA: GENERADOR DE QR DIGITAL ----------------
    if (selectedCar && mostrarQR) {
      return (
        <div className="glass-panel p-6 text-center shadow-xl animate-fade-in">
          <h3 className="text-lg font-display font-extrabold text-white">QR de AutoScore</h3>
          <p className="text-xs text-slate-400 mt-1 leading-normal max-w-xs mx-auto">
            Muestra este código al técnico certificado en el taller para escanear y cargar nuevos mantenimientos al historial.
          </p>

          {/* Generador de QR real usando qrserver */}
          <div className="bg-white p-4 rounded-2xl inline-block my-6 border border-amber-500/30 shadow-md">
            <img
              src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&color=080c14&data=${encodeURIComponent(selectedCar.placa)}`}
              alt={`QR Placa ${selectedCar.placa}`}
              className="w-48 h-48 block mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>

          <div className="mb-6">
            <span className="text-[10px] font-mono text-slate-500 block uppercase tracking-wider">PLACA VEHICULAR</span>
            <div className="inline-block bg-slate-950 border-2 border-slate-700 rounded-lg px-4 py-1.5 text-xl font-mono font-black text-white tracking-widest mt-1">
              {selectedCar.placa}
            </div>
          </div>

          <div className="bg-slate-950/60 p-3.5 border border-slate-800 rounded-xl text-xs text-left text-slate-400 leading-normal mb-6">
            <div className="flex gap-2">
              <Shield className="w-4 h-4 text-amber-500 shrink-0" />
              <span>
                <strong>Privacidad garantizada:</strong> El código QR solo contiene la placa en texto plano para indexación rápida del escáner del técnico. Ningún dato personal es expuesto en la lectura.
              </span>
            </div>
          </div>

          <button
            onClick={handleBackToGarage}
            className="w-full bg-slate-950 hover:bg-slate-850 text-slate-200 hover:text-white border border-slate-800 rounded-xl py-3 font-semibold text-xs transition-all active:scale-[0.98]"
            id="btn-qr-back"
          >
            Volver a Mi Garaje
          </button>
        </div>
      );
    }

    // ---------------- COMPONENTE MODAL / ACCIONES DEL CARRO ----------------
    if (selectedCar && mostrarOpciones) {
      return (
        <div className="glass-panel p-6 shadow-2xl relative">
          <button
            onClick={handleBackToGarage}
            className="absolute top-4 right-4 text-slate-400 hover:text-white"
          >
            ✕
          </button>

          <div className="text-center mb-6">
            <span className="text-xs text-amber-500 font-mono tracking-wider block">{(selectedCar?.marca || "Vehículo").toUpperCase()} {selectedCar?.modelo || ""}</span>
            <h3 className="text-lg font-display font-bold text-white mt-0.5">Opciones de Certificado</h3>
            <p className="text-xs text-slate-400 mt-1">Selecciona la versión del certificado que deseas emitir en pantalla.</p>
          </div>

          <div className="space-y-3">
            <button
              onClick={() => handleVerCertificado(selectedCar, "simple")}
              className="w-full text-left bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition-all"
            >
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                  <span className="font-semibold text-slate-200 text-sm">Ver Certificado Simple</span>
                </div>
                <span className="text-[10px] uppercase font-mono text-slate-400">Gratis / Rápido</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                Muestra la calificación de Score de confianza, vigencia y datos homologados. Oculta la línea de tiempo de reparaciones para mayor confidencialidad.
              </p>
            </button>

            {isVencido ? (
              <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-center space-y-3.5 no-print">
                <p className="text-xs text-red-400 font-extrabold leading-normal">
                  🔴 Certificación Vencida - Renovar Aquí para activar su Score
                </p>
                <a
                  href={`https://wa.me/584120000000?text=${encodeURIComponent(
                    `Hola AutoScore, deseo renovar el certificado digital de mi vehículo placa ${selectedCar?.placa} para activar mi Score Mecánico`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full inline-flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-lg shadow-red-500/10 active:scale-[0.98] transition-all border border-red-500/30"
                >
                  Contactar por WhatsApp
                </a>
              </div>
            ) : (
              <button
                onClick={() => handleVerCertificado(selectedCar, "completo")}
                className="w-full text-left bg-white/5 hover:bg-white/10 border border-amber-500/30 hover:border-amber-500/50 rounded-xl p-4 transition-all"
              >
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                    <span className="font-semibold text-amber-400 text-sm">Ver Certificado Completo VIP</span>
                  </div>
                  <span className="text-[10px] uppercase font-mono text-amber-500 font-bold">Premium</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                  Desglosa el Score, datos de homologación y la <strong>línea de tiempo cronológica completa</strong> de mantenimientos realizados por técnicos calificados con firma y taller verificado.
                </p>
              </button>
            )}
          </div>

          <button
            onClick={handleBackToGarage}
            className="w-full mt-4 py-2.5 text-xs text-slate-400 hover:text-white font-medium transition-colors text-center border border-white/10 rounded-xl hover:bg-white/5"
          >
            Volver al Garaje
          </button>
        </div>
      );
    }

    // ---------------- PANTALLA: GARAJE VIRTUAL (VEHÍCULOS ENCONTRADOS) ----------------
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-mono font-bold text-amber-500 uppercase tracking-widest bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              PROPIETARIO ACTIVO
            </span>
            <h2 className="text-xl font-display font-extrabold text-white mt-1.5 truncate max-w-[240px]">
              ID: {loggedDueno}
            </h2>
          </div>
          <button
            onClick={handleLogout}
            className="text-xs bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-lg px-2.5 py-1.5 font-medium transition-colors"
            id="btn-logout-usuario"
          >
            Cerrar Sesión
          </button>
        </div>

        <div className="bg-white/5 p-3.5 border border-white/5 rounded-xl flex items-center justify-between text-xs backdrop-blur-sm">
          <div className="flex flex-col gap-1">
            <span className="text-slate-400">Total carros en garaje:</span>
            <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 w-fit">
              {vehiculos.length} {vehiculos.length === 1 ? "vehículo" : "vehículos"}
            </span>
          </div>
          <button
            onClick={() => setMostrarFormRegistro(!mostrarFormRegistro)}
            className="text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold px-3 py-2 rounded-xl transition-colors flex items-center gap-1 shadow-md"
            id="btn-show-register-car"
          >
            {mostrarFormRegistro ? "Cerrar Registro" : "+ Registrar Vehículo"}
          </button>
        </div>

        {/* Formulario de registro de vehículo */}
        {mostrarFormRegistro && (
          <form onSubmit={handleRegistrarVehiculo} className="glass-panel p-5 border border-amber-500/30 space-y-4 animate-fade-in">
            <div className="flex justify-between items-center border-b border-white/10 pb-2.5">
              <h3 className="text-xs font-mono font-bold text-amber-400 flex items-center gap-1.5 uppercase tracking-wider">
                <Car className="w-4 h-4 text-amber-500" />
                Registrar Nuevo Vehículo
              </h3>
              <button
                type="button"
                onClick={() => setMostrarFormRegistro(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Placa (ID Único):
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: AB123CD"
                  value={nuevaPlaca}
                  onChange={(e) => setNuevaPlaca(e.target.value.toUpperCase())}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs text-amber-400 font-mono font-bold tracking-widest uppercase focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Año de Fabricación:
                </label>
                <input
                  type="number"
                  required
                  placeholder="Ej: 2018"
                  value={nuevoAnio}
                  onChange={(e) => setNuevoAnio(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Marca:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Toyota"
                  value={nuevaMarca}
                  onChange={(e) => setNuevaMarca(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  Modelo:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Corolla"
                  value={nuevoModelo}
                  onChange={(e) => setNuevoModelo(e.target.value)}
                  className="w-full glass-input rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Calificación Inicial (AutoScore):
                </span>
                <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                  Cálculo Automatizado ✨
                </span>
              </div>
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-400 max-w-[70%]">
                  {nuevoAnio ? (
                    `Calculado según el año de fabricación (${nuevoAnio}). Se calcula restando antigüedad del puntaje base (100).`
                  ) : (
                    "Ingrese un año de fabricación para calcular el AutoScore inicial de confianza."
                  )}
                </p>
                <div className="text-right">
                  <span className="text-lg font-mono font-black text-amber-400 block">
                    {calcularScoreAutomatico(nuevoAnio)} pts
                  </span>
                </div>
              </div>
            </div>

            {errorRegistro && (
              <div className="p-2.5 rounded-xl bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorRegistro}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={registrandoVehiculo}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs transition-all active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {registrandoVehiculo ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Car className="w-4 h-4" />
                  Homologar y Registrar Vehículo
                </>
              )}
            </button>
          </form>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-red-950/20 border border-red-900/30 text-red-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Lista de vehículos */}
        <div className="space-y-4">
          {vehiculos.length === 0 ? (
            <div className="text-center py-10 bg-slate-900/40 border border-slate-800 rounded-2xl p-4">
              <Car className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-xs text-slate-400">No tienes ningún carro registrado en este ID.</p>
              
              <button
                onClick={() => setMostrarFormRegistro(true)}
                className="mt-3 text-[11px] text-amber-400 underline font-semibold hover:text-amber-300 block mx-auto"
              >
                ¿Quieres registrar un vehículo ahora? Haz clic aquí
              </button>

              {useSimulado && (
                <div className="mt-4 pt-4 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 mb-2">O usa la opción demo rápida del simulador:</p>
                  <button
                    onClick={() => {
                      const demoCar = {
                        placa: "AB123CD",
                        marca: "Toyota",
                        modelo: "Corolla",
                        anio: 2018,
                        idDueno: loggedDueno || "",
                        score: 94,
                        estadoCertificado: "Activo" as const
                      };
                      import("../mockData").then((m) => {
                        m.simularRegistrarVehiculo(demoCar);
                        setVehiculos([demoCar]);
                      });
                    }}
                    className="mt-1 text-[11px] text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10 transition-all inline-flex items-center gap-1"
                  >
                    Auto-registrar carro demo (Toyota Corolla)
                  </button>
                </div>
              )}
            </div>
          ) : (
            (vehiculos || [])
              .filter((car) => car && typeof car === "object" && car.placa)
              .map((car) => (
                <div
                  key={car.placa}
                  className="bg-white/5 border border-white/10 rounded-2xl p-5 shadow-lg relative overflow-hidden group hover:border-white/20 hover:bg-white/10 transition-all backdrop-blur-sm"
                >
                  {/* Etiqueta de Certificado */}
                  <div className="absolute top-4 right-4 flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                      (car.estadoCertificado || "Activo") === "Activo"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                    }`}>
                      Cert: {car.estadoCertificado || "Activo"}
                    </span>
                  </div>

                  <div className="mb-4">
                    <span className="text-[10px] font-mono font-bold text-slate-500 block">
                      {(car.marca || "Marca Desconocida").toUpperCase()}
                    </span>
                    <h3 className="text-lg font-display font-extrabold text-white">
                      {car.modelo || "Modelo Desconocido"} <span className="text-slate-400 font-light text-sm">({car.anio || "N/A"})</span>
                    </h3>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <div className="bg-black/40 border border-white/10 font-mono text-xs font-bold tracking-widest px-3 py-1 rounded text-slate-300">
                        {car.placa || "S/P"}
                      </div>
                      {(car.estadoCertificado || "Activo") === "Activo" && (
                        <div className="text-[10px] font-bold uppercase tracking-wider">
                          {car.score >= 90 ? (
                            <span className="text-emerald-400">🟢 AL DÍA ({car.score})</span>
                          ) : car.score >= 70 ? (
                            <span className="text-amber-400">🟡 RETRASADO ({car.score})</span>
                          ) : (
                            <span className="text-red-400 animate-pulse">🔴 ALERTA MECÁNICA ({car.score})</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-3.5 border-t border-white/10">
                    {car.estadoCertificado?.toUpperCase() === "VENCIDO" ? (
                      <a
                        href={`https://wa.me/584120000000?text=${encodeURIComponent(
                          `Hola AutoScore, deseo renovar el certificado digital de mi vehículo placa ${car.placa} para activar mi Score Mecánico`
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white font-extrabold text-xs py-3 px-4 rounded-xl shadow-lg shadow-red-500/20 hover:shadow-red-500/40 active:scale-[0.98] transition-all duration-200 animate-pulse text-center border border-red-500/30 font-bold"
                        id={`btn-renew-${car.placa}`}
                      >
                        🔴 Certificación Vencida - Renovar Aquí para activar su Score
                      </a>
                    ) : (
                      <div className="grid grid-cols-2 gap-3">
                        {/* Botón ver Opciones */}
                        <button
                          onClick={() => {
                            setSelectedCar(car);
                            setMostrarOpciones(true);
                          }}
                          className="w-full bg-white/5 hover:bg-white/10 text-slate-200 hover:text-white border border-white/10 rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <ClipboardList className="w-3.5 h-3.5" />
                          Certificados
                        </button>

                        {/* Botón QR */}
                        <button
                          onClick={() => {
                            setSelectedCar(car);
                            setMostrarQR(true);
                          }}
                          className="w-full bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 rounded-xl py-2 px-3 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          Código QR
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 animate-fade-in text-slate-100">
      {renderContent()}
    </div>
  );
}
