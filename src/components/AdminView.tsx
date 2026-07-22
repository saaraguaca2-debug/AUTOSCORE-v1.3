import React, { useState, useEffect } from "react";
import { 
  Lock, Shield, Users, Car, PenTool, BarChart3, CheckCircle2, XCircle, AlertCircle, 
  RefreshCw, UserCheck, Key, Plus, Phone, Hammer, HelpCircle, ArrowRight,
  Sliders, Settings, Gauge, Save, RotateCcw, Sparkles, Wrench, User
} from "lucide-react";
import { 
  getSimulatedData, simularAdminUpdate, 
  getScoreConfig, saveScoreConfig, DEFAULT_SCORE_CONFIG, ScoreConfig 
} from "../mockData";

interface AdminViewProps {
  useSimulado: boolean;
  appScriptUrl: string;
}

export default function AdminView({ useSimulado, appScriptUrl }: AdminViewProps) {
  // Configuración de contraseña
  const adminPasswordEnv = (import.meta as any).env?.VITE_ADMIN_PASSWORD || "admin123";
  
  const [password, setPassword] = useState("");
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Datos administrados
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [vehiculos, setVehiculos] = useState<any[]>([]);
  const [mecanicos, setMecanicos] = useState<any[]>([]);
  const [historial, setHistorial] = useState<any[]>([]);

  // Configuración del Algoritmo de Score
  const [scoreConfigState, setScoreConfigState] = useState<ScoreConfig>(getScoreConfig());
  const [configSuccessMsg, setConfigSuccessMsg] = useState<string | null>(null);

  // Estados de formularios internos
  const [newMecCodigo, setNewMecCodigo] = useState("");
  const [newMecNombre, setNewMecNombre] = useState("");
  const [newMecTaller, setNewMecTaller] = useState("");
  const [newMecTelefono, setNewMecTelefono] = useState("");
  const [formMecError, setFormMecError] = useState<string | null>(null);
  const [formMecSuccess, setFormMecSuccess] = useState<string | null>(null);
  const [isSubmittingMec, setIsSubmittingMec] = useState(false);

  // Tab seleccionada
  const [activeAdminTab, setActiveAdminTab] = useState<"dashboard" | "usuarios" | "vehiculos" | "mecanicos" | "ajustes">("dashboard");

  // Manejar Login del Admin
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === adminPasswordEnv) {
      setIsAuthorized(true);
      setAuthError(null);
      cargarDatos();
    } else {
      setAuthError("Contraseña incorrecta de Administrador. Acceso denegado.");
    }
  };

  // Cargar datos (Simulados o desde Google Sheets)
  const cargarDatos = async () => {
    setLoading(true);
    try {
      if (useSimulado) {
        const simData = getSimulatedData();
        setUsuarios(simData.usuarios || []);
        setVehiculos(simData.vehiculos || []);
        setMecanicos(simData.mecanicos || []);
        setHistorial(simData.historial || []);
      } else {
        if (!appScriptUrl) {
          throw new Error("La URL de Google Sheets Apps Script no está configurada.");
        }
        // Llamar a doGet de Apps Script para obtener todo
        const url = `${appScriptUrl}?accion=adminData&password=${encodeURIComponent(password)}`;
        const res = await fetch(url, { mode: "cors" });
        if (!res.ok) throw new Error("Fallo en la comunicación con Google Sheets.");
        const json = await res.json();
        if (json && json.success) {
          setUsuarios(json.usuarios || []);
          setVehiculos(json.vehiculos || []);
          setMecanicos(json.mecanicos || []);
          setHistorial(json.historial || []);
        } else {
          throw new Error(json.error || "Fallo en la respuesta del Apps Script.");
        }
      }
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Enviar comando de actualización (Admin Update)
  const ejecutarUpdate = async (subAccion: string, targetId: string, nuevoEstado: string, extraData?: any) => {
    setLoading(true);
    try {
      if (useSimulado) {
        const res = simularAdminUpdate({
          subAccion,
          targetId,
          nuevoEstado,
          ...extraData
        });
        if (res.success) {
          await cargarDatos();
        } else {
          alert(res.error || "Error al actualizar localmente");
        }
      } else {
        if (!appScriptUrl) {
          alert("Configure la URL de Google Sheets en la esquina superior derecha.");
          return;
        }

        const body = {
          accion: "adminUpdate",
          subAccion,
          targetId,
          nuevoEstado,
          ...extraData
        };

        const res = await fetch(appScriptUrl, {
          method: "POST",
          mode: "cors",
          headers: { "Content-Type": "text/plain;charset=utf-8" },
          body: JSON.stringify(body)
        });

        if (!res.ok) throw new Error("Fallo al conectar con el servidor.");
        const json = await res.json();
        if (json && json.success) {
          await cargarDatos();
        } else {
          alert(json.error || "Fallo al procesar en Google Sheets.");
        }
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Registrar un mecánico nuevo
  const handleAddMecanico = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormMecError(null);
    setFormMecSuccess(null);

    const code = newMecCodigo.trim().toUpperCase();
    const name = newMecNombre.trim();
    const workshop = newMecTaller.trim();
    const phone = newMecTelefono.trim();

    if (!code || !name || !workshop || !phone) {
      setFormMecError("Rellene todos los campos obligatorios.");
      return;
    }

    setIsSubmittingMec(true);
    try {
      await ejecutarUpdate("agregarMecanico", code, "Activo", {
        nombre: name,
        taller: workshop,
        telefono: phone
      });
      setFormMecSuccess(`Técnico ${name} registrado con código ${code}.`);
      setNewMecCodigo("");
      setNewMecNombre("");
      setNewMecTaller("");
      setNewMecTelefono("");
    } catch (err: any) {
      setFormMecError(err.message || "Error al registrar.");
    } finally {
      setIsSubmittingMec(false);
    }
  };

  if (!isAuthorized) {
    return (
      <div className="w-full max-w-md mx-auto px-4 py-12 flex flex-col items-center animate-fade-in">
        <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-5 shadow-lg">
          <Shield className="w-7 h-7" />
        </div>
        
        <h2 className="text-xl font-display font-extrabold text-white text-center">
          Panel de Control AutoScore
        </h2>
        <p className="text-xs text-slate-400 text-center mt-1.5 max-w-[80%] leading-normal mb-8">
          Sistema administrativo protegido para activar cuentas, renovar certificados y registrar talleres oficiales.
        </p>

        <form onSubmit={handleAdminLogin} className="w-full space-y-4">
          <div className="bg-slate-900/60 border border-white/5 p-5 rounded-2xl space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Contraseña de Administrador:
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-3 w-4.5 h-4.5 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Ingrese clave de seguridad"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-2.5 text-sm text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {authError && (
              <div className="p-3 bg-red-950/20 border border-red-900/30 rounded-xl text-red-400 text-[11px] flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black py-3 px-4 rounded-xl text-xs transition-all flex items-center justify-center gap-2"
            >
              <Lock className="w-4 h-4" />
              <span>Desbloquear Consola</span>
            </button>
          </div>
        </form>
      </div>
    );
  }

  // Cálculos de Métricas para el Dashboard
  const usuariosPendientes = usuarios.filter(u => u.estadoUsuario === "Pendiente").length;
  const vehiculosActivos = vehiculos.filter(v => v.estadoCertificado === "Activo").length;
  const vehiculosVencidos = vehiculos.filter(v => v.estadoCertificado === "Vencido").length;
  const talleresSuspendidos = mecanicos.filter(m => m.estado === "Suspendido").length;

  return (
    <div className="w-full max-w-md mx-auto px-4 py-6 flex flex-col space-y-5 animate-fade-in">
      
      {/* Cabecera Consola */}
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-black text-sm">
            A
          </div>
          <div>
            <h3 className="text-sm font-display font-extrabold text-white leading-none">CONSOLA ADMIN</h3>
            <span className="text-[10px] text-amber-500 font-semibold uppercase tracking-wider block mt-0.5">
              {useSimulado ? "Modo Simulador" : "Modo Live Sheets"}
            </span>
          </div>
        </div>
        
        <button
          onClick={cargarDatos}
          disabled={loading}
          className="p-1.5 hover:bg-white/5 rounded-lg border border-white/5 text-slate-400 hover:text-white transition-all disabled:opacity-50"
          title="Recargar Datos"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {/* Navegación Interna Consola */}
      <div className="grid grid-cols-5 bg-slate-950 border border-white/5 p-1 rounded-xl gap-1">
        <button
          onClick={() => setActiveAdminTab("dashboard")}
          className={`py-2 text-[10px] font-bold rounded-lg transition-colors ${
            activeAdminTab === "dashboard" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Panel
        </button>
        <button
          onClick={() => setActiveAdminTab("usuarios")}
          className={`py-2 text-[10px] font-bold rounded-lg transition-colors relative ${
            activeAdminTab === "usuarios" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Dueños
          {usuariosPendientes > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white font-mono text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center">
              {usuariosPendientes}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveAdminTab("vehiculos")}
          className={`py-2 text-[10px] font-bold rounded-lg transition-colors ${
            activeAdminTab === "vehiculos" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Carros
        </button>
        <button
          onClick={() => setActiveAdminTab("mecanicos")}
          className={`py-2 text-[10px] font-bold rounded-lg transition-colors ${
            activeAdminTab === "mecanicos" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Talleres
        </button>
        <button
          onClick={() => setActiveAdminTab("ajustes")}
          className={`py-2 text-[10px] font-bold rounded-lg transition-colors flex items-center justify-center gap-1 ${
            activeAdminTab === "ajustes" ? "bg-amber-500 text-slate-950" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <span>Ajustes</span>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-8 gap-2 text-xs text-slate-400">
          <RefreshCw className="w-4 h-4 animate-spin text-amber-500" />
          <span>Sincronizando datos con la nube...</span>
        </div>
      )}

      {/* 1. SECCIÓN DASHBOARD */}
      {!loading && activeAdminTab === "dashboard" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Usuarios</span>
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-2xl font-mono font-extrabold text-white">{usuarios.length}</span>
                {usuariosPendientes > 0 && (
                  <span className="text-[10px] font-bold text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded">
                    {usuariosPendientes} Pend.
                  </span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Vehículos</span>
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-2xl font-mono font-extrabold text-white">{vehiculos.length}</span>
                <span className="text-[10px] text-emerald-400 font-semibold">{vehiculosActivos} Act.</span>
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Técnicos</span>
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-2xl font-mono font-extrabold text-white">{mecanicos.length}</span>
                {talleresSuspendidos > 0 && (
                  <span className="text-[9px] text-red-400 font-medium">{talleresSuspendidos} Susp.</span>
                )}
              </div>
            </div>

            <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl flex flex-col justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Firmas Historial</span>
              <div className="flex justify-between items-baseline mt-2">
                <span className="text-2xl font-mono font-extrabold text-amber-500">{historial.length}</span>
                <span className="text-[9px] text-slate-500 font-mono">Sello Digital</span>
              </div>
            </div>
          </div>

          <div className="bg-slate-900/40 border border-white/5 p-4 rounded-2xl">
            <h4 className="text-[11px] font-display font-bold text-slate-400 uppercase tracking-widest mb-3 border-b border-white/5 pb-2">
              Auditoría Rápida de Operaciones
            </h4>
            <div className="space-y-3 max-h-48 overflow-y-auto">
              {historial.slice(0, 10).map((h, idx) => (
                <div key={idx} className="border-l-2 border-amber-500 pl-3 py-1 text-[11px]">
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span className="font-mono font-semibold text-amber-400">{h.placa}</span>
                    <span className="font-mono">{h.fecha.split(" ")[0]}</span>
                  </div>
                  <p className="text-slate-300 font-light truncate mt-0.5">{h.trabajoRealizado}</p>
                </div>
              ))}
              {historial.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">No se han registrado operaciones aún.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 2. SECCIÓN USUARIOS (DUEÑOS) */}
      {!loading && activeAdminTab === "usuarios" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Aprobación de Propietarios Registrados
          </h4>
          
          <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
            {usuarios.map((usr, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-bold text-white block">{usr.nombre}</span>
                    <span className="text-[10px] text-slate-400 font-mono block mt-0.5">Cédula: {usr.idDueno}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded ${
                    usr.estadoUsuario === "Aprobado"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                  }`}>
                    {usr.estadoUsuario}
                  </span>
                </div>

                <div className="flex gap-2 pt-1 border-t border-white/5 justify-end">
                  {usr.estadoUsuario !== "Aprobado" ? (
                    <button
                      onClick={() => ejecutarUpdate("actualizarUsuario", usr.idDueno, "Aprobado")}
                      className="text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-lg flex items-center gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Aprobar</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => ejecutarUpdate("actualizarUsuario", usr.idDueno, "Pendiente")}
                      className="text-[10px] font-bold bg-slate-950 hover:bg-slate-900 text-slate-400 border border-white/5 px-2.5 py-1 rounded-lg flex items-center gap-1"
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Inhabilitar</span>
                    </button>
                  )}
                </div>
              </div>
            ))}
            {usuarios.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">No hay usuarios dueños registrados.</p>
            )}
          </div>
        </div>
      )}

      {/* 3. SECCIÓN VEHÍCULOS (CERTIFICADOS) */}
      {!loading && activeAdminTab === "vehiculos" && (
        <div className="space-y-3 animate-in fade-in duration-200">
          <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
            Suscripción y Estado de Certificados
          </h4>

          <div className="space-y-2.5 max-h-[460px] overflow-y-auto">
            {vehiculos.map((veh, idx) => (
              <div key={idx} className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-xs font-mono font-black text-amber-400 block">{veh.placa}</span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">{veh.marca} {veh.modelo} ({veh.anio})</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Dueño C.I: {veh.idDueno}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-mono font-extrabold text-white block">{veh.score} pts</span>
                    <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mt-1 ${
                      veh.estadoCertificado === "Activo"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {veh.estadoCertificado}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1 border-t border-white/5 justify-end">
                  {veh.estadoCertificado !== "Activo" ? (
                    <button
                      onClick={() => ejecutarUpdate("actualizarVehiculo", veh.placa, "Activo")}
                      className="text-[10px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2.5 py-1 rounded-lg"
                    >
                      Renovar / Activar Certificado
                    </button>
                  ) : (
                    <button
                      onClick={() => ejecutarUpdate("actualizarVehiculo", veh.placa, "Vencido")}
                      className="text-[10px] font-bold bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 px-2.5 py-1 rounded-lg"
                    >
                      Marcar Expirado ❌
                    </button>
                  )}
                </div>
              </div>
            ))}
            {vehiculos.length === 0 && (
              <p className="text-xs text-slate-500 text-center py-8">No hay vehículos registrados en el sistema.</p>
            )}
          </div>
        </div>
      )}

      {/* 4. SECCIÓN MECÁNICOS (TALLERES) */}
      {!loading && activeAdminTab === "mecanicos" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          
          {/* Formulario Registro de Técnicos */}
          <div className="bg-slate-900/60 border border-white/5 p-4 rounded-2xl space-y-3.5">
            <h5 className="text-[10px] font-bold text-amber-500 uppercase tracking-widest block border-b border-white/5 pb-1.5">
              Registrar Nuevo Taller / Técnico Oficial
            </h5>

            <form onSubmit={handleAddMecanico} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Código (Ej: M404):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: M404"
                    value={newMecCodigo}
                    onChange={(e) => setNewMecCodigo(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Teléfono (Cruce WhatsApp):
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: 584121234567"
                    value={newMecTelefono}
                    onChange={(e) => setNewMecTelefono(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre Técnico:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Luis Díaz"
                    value={newMecNombre}
                    onChange={(e) => setNewMecNombre(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Nombre de Taller:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Díaz Motors (La Florida)"
                    value={newMecTaller}
                    onChange={(e) => setNewMecTaller(e.target.value)}
                    className="w-full glass-input rounded-lg px-2.5 py-1.5 text-xs focus:outline-none"
                  />
                </div>
              </div>

              {formMecError && (
                <div className="p-2 bg-red-950/20 border border-red-900/30 text-red-400 text-[10px] rounded-lg">
                  {formMecError}
                </div>
              )}

              {formMecSuccess && (
                <div className="p-2 bg-emerald-950/20 border border-emerald-900/30 text-emerald-400 text-[10px] rounded-lg">
                  {formMecSuccess}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmittingMec}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-black py-2 rounded-lg text-[10px] flex items-center justify-center gap-1.5 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Técnico Autorizado</span>
              </button>
            </form>
          </div>

          {/* Listado de Talleres */}
          <div className="space-y-2">
            <h5 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block mb-2">
              Técnicos Autorizados
            </h5>

            <div className="space-y-2.5 max-h-[220px] overflow-y-auto">
              {mecanicos.map((mec, idx) => (
                <div key={idx} className="bg-slate-900/40 border border-white/5 p-3 rounded-2xl space-y-2">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <Wrench className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span className="text-xs font-extrabold text-white">{mec.taller || "Taller Autorizado"}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span className="text-[11px] text-slate-400 font-medium">Mecánico:</span>
                        <span className="text-[11px] font-bold text-slate-200">{mec.nombre}</span>
                      </div>
                      <span className="text-[10px] text-amber-500 font-mono block">Código: {mec.codigoMecanico}</span>
                      {mec.telefono && (
                        <span className="text-[10px] text-slate-400 font-mono block flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          <span>+{mec.telefono}</span>
                        </span>
                      )}
                    </div>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                      mec.estado === "Activo"
                        ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                        : "bg-red-500/10 text-red-400 border border-red-500/20"
                    }`}>
                      {mec.estado}
                    </span>
                  </div>

                  <div className="flex gap-2 pt-1 border-t border-white/5 justify-end">
                    {mec.estado !== "Activo" ? (
                      <button
                        onClick={() => ejecutarUpdate("actualizarMecanico", mec.codigoMecanico, "Activo")}
                        className="text-[9px] font-bold bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-2 py-0.5 rounded"
                      >
                        Habilitar
                      </button>
                    ) : (
                      <button
                        onClick={() => ejecutarUpdate("actualizarMecanico", mec.codigoMecanico, "Suspendido")}
                        className="text-[9px] font-bold bg-red-950/20 hover:bg-red-950/40 text-red-400 border border-red-900/30 px-2 py-0.5 rounded"
                      >
                        Suspender Cuenta ❌
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. SECCIÓN AJUSTES DEL ALGORITMO DE PUNTOS */}
      {!loading && activeAdminTab === "ajustes" && (
        <div className="space-y-4 animate-in fade-in duration-200">
          <div className="bg-slate-900/60 border border-white/10 p-4 rounded-2xl space-y-3">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-500" />
                <h4 className="text-xs font-bold text-white uppercase font-display tracking-wider">
                  Configuración del Algoritmo de Score
                </h4>
              </div>
              <span className="text-[9px] bg-amber-500/10 text-amber-400 font-mono font-bold px-2 py-0.5 rounded border border-amber-500/20">
                Sin Apps Script
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-normal">
              Ajusta los puntos que suma cada tipo de mantenimiento o reparación, así como las deducciones automáticas por tiempo. Se aplican de forma inmediata en toda la plataforma.
            </p>

            <form onSubmit={(e) => {
              e.preventDefault();
              saveScoreConfig(scoreConfigState);
              setConfigSuccessMsg("¡Parámetros del algoritmo actualizados con éxito!");
              setTimeout(() => setConfigSuccessMsg(null), 3000);
            }} className="space-y-3.5 pt-1">

              {/* Bonos de Puntos por Mantenimiento */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest block">
                  1. Puntos Otorgados por Firma Técnica
                </span>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Firma Base Taller:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.puntosBaseFirma}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, puntosBaseFirma: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Aceite y Filtros:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.puntosAceite}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, puntosAceite: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Frenos y Discos:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.puntosFrenos}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, puntosFrenos: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Correa Distribución:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.puntosCorrea}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, puntosCorrea: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Suspensión / Cauchos:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.puntosSuspension}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, puntosSuspension: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                      Escáner / Revisión:
                    </label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.puntosGeneral}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, puntosGeneral: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[10px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Deducciones / Penalizaciones */}
              <div className="space-y-2 pt-2 border-t border-white/5">
                <span className="text-[10px] font-bold text-red-400 uppercase tracking-widest block">
                  2. Deducciones por Inactividad (Penalizaciones)
                </span>

                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[9px] font-semibold text-slate-300 mb-1">
                      6 a 12 meses:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.penalizacionRetraso6m}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, penalizacionRetraso6m: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-red-400 font-bold focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[9px] font-semibold text-slate-300 mb-1">
                      &gt; 12 meses:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.penalizacionVencido12m}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, penalizacionVencido12m: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-red-400 font-bold focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>

                  <div className="bg-black/30 p-2.5 rounded-xl border border-white/5">
                    <label className="block text-[9px] font-semibold text-slate-300 mb-1">
                      Sin Historial:
                    </label>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={scoreConfigState.penalizacionSinHistorial}
                        onChange={(e) => setScoreConfigState({ ...scoreConfigState, penalizacionSinHistorial: Number(e.target.value) })}
                        className="w-full glass-input rounded-lg px-2 py-1 text-xs font-mono text-amber-400 font-bold focus:outline-none"
                      />
                      <span className="text-[9px] text-slate-500 font-mono">pts</span>
                    </div>
                  </div>
                </div>
              </div>

              {configSuccessMsg && (
                <div className="p-2.5 bg-emerald-950/30 border border-emerald-500/30 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>{configSuccessMsg}</span>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="submit"
                  className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/10"
                >
                  <Save className="w-4 h-4" />
                  <span>Guardar Parámetros</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    if (confirm("¿Restablecer configuración a valores por defecto?")) {
                      setScoreConfigState(DEFAULT_SCORE_CONFIG);
                      saveScoreConfig(DEFAULT_SCORE_CONFIG);
                      setConfigSuccessMsg("Valores restablecidos por defecto.");
                      setTimeout(() => setConfigSuccessMsg(null), 3000);
                    }
                  }}
                  className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors border border-white/5"
                  title="Restablecer Por Defecto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* Pie de Consola */}
      <div className="pt-3 border-t border-white/5 text-center">
        <p className="text-[9px] text-slate-600 font-mono">
          Consola Operativa Segura AutoScore
        </p>
      </div>
    </div>
  );
}
