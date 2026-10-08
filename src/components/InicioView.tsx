import React from "react";
import { Shield, Car, PenTool, BookOpen, Clock, Zap, ArrowRight, CheckCircle, UserPlus, Lock } from "lucide-react";
import { VistaActual } from "../types";

interface InicioViewProps {
  onNavigate: (vista: VistaActual, modoUsuario?: "login" | "registro") => void;
  solicitudesCount?: number;
}

export default function InicioView({ onNavigate, solicitudesCount = 0 }: InicioViewProps) {
  return (
    <div className="w-full max-w-md mx-auto px-4 py-8 flex flex-col items-center">
      {/* Cabecera Principal - Logo Premium */}
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-lg shadow-amber-500/20 mb-4 border border-amber-300/30">
          <Shield className="w-9 h-9 text-slate-950 stroke-[1.8]" />
        </div>
        <h1 className="text-4xl font-display font-extrabold tracking-tight text-white flex items-center justify-center gap-2">
          <span>AUTOSCORE</span>
        </h1>
        <p className="text-xs font-mono text-amber-500 mt-1.5 uppercase tracking-widest bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
          Historial Verificado de Vehículos
        </p>
      </div>

      {/* Tarjeta de estado de conectividad venezolana */}
      <div className="w-full bg-white/5 border border-white/10 backdrop-blur-md rounded-2xl p-3.5 mb-6 text-center shadow-md">
        <div className="flex items-center justify-center gap-2 text-xs text-amber-400 font-medium">
          <Zap className="w-4 h-4 fill-amber-400/20" />
          <span>Optimizado para conexiones móviles lentas (2G/3G)</span>
        </div>
        <p className="text-[11px] text-slate-400 mt-1.5 leading-normal">
          Peso mínimo de datos, compresión inteligente y conexión directa en tiempo real a Google Sheets.
        </p>
      </div>

      {/* Banner de alerta de solicitudes pendientes de usuarios para Administrador */}
      {solicitudesCount > 0 && (
        <button
          onClick={() => onNavigate("admin")}
          className="w-full bg-gradient-to-r from-red-950/70 via-red-900/50 to-slate-900/90 hover:from-red-950/90 hover:via-red-900/70 hover:to-slate-900 border border-red-500/50 hover:border-red-400 text-left p-3.5 rounded-2xl mb-5 shadow-xl shadow-red-950/40 transition-all active:scale-[0.98] flex items-center justify-between group cursor-pointer"
          id="btn-alerta-solicitudes-inicio"
        >
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 text-red-400 flex items-center justify-center border border-red-500/30">
                <Lock className="w-5 h-5 stroke-[2]" />
              </div>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-ping" />
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-600 rounded-full border-2 border-slate-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white">Solicitud de Usuario Pendiente</span>
                <span className="bg-red-500 text-white font-mono text-[9px] font-black px-1.5 py-0.5 rounded-full shadow">
                  {solicitudesCount}
                </span>
              </div>
              <p className="text-[10px] text-red-200/90 mt-0.5">
                {solicitudesCount === 1 
                  ? "Hay 1 nuevo propietario esperando activación en el Panel Admin" 
                  : `Hay ${solicitudesCount} nuevos propietarios esperando activación en el Panel Admin`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[11px] font-bold text-red-400 group-hover:text-red-300 group-hover:translate-x-1 transition-all shrink-0">
            <span>Aprobar</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </div>
        </button>
      )}

      {/* Botones de acción principales (Estilo VIP) */}
      <div className="w-full flex flex-col gap-3.5 mb-8">
        <button
          onClick={() => onNavigate("usuario", "login")}
          className="w-full group bg-gradient-to-br from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 text-slate-950 font-extrabold py-4 px-6 rounded-2xl shadow-xl hover:shadow-amber-500/20 active:scale-[0.98] transition-all duration-200 flex items-center justify-between"
          id="btn-portal-usuario"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="p-2 rounded-xl bg-slate-950/20">
              <Car className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="block text-base font-extrabold leading-tight">Soy Propietario</span>
              <span className="block text-[11px] font-normal opacity-90">Mi Garaje Virtual, QR y Certificados</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
        </button>

        {/* Tarjeta / Enlace de Registro Prominente */}
        <button
          onClick={() => onNavigate("usuario", "registro")}
          className="w-full group bg-slate-900/80 hover:bg-slate-800/90 text-amber-400 border border-amber-500/30 hover:border-amber-500/50 font-extrabold py-3.5 px-5 rounded-2xl shadow-lg active:scale-[0.98] transition-all duration-200 flex items-center justify-between backdrop-blur-md"
          id="btn-registrarse-inicio"
        >
          <div className="flex items-center gap-3 text-left">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/20">
              <UserPlus className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="block text-sm font-extrabold leading-tight text-white">¿No tienes cuenta? Registrarse gratis</span>
              <span className="block text-[10px] font-normal text-amber-300/80">Crear perfil de propietario de vehículo</span>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-amber-400 group-hover:translate-x-1 transition-transform" />
        </button>

        <button
          onClick={() => onNavigate("mecanico")}
          className="w-full group bg-white/5 hover:bg-white/10 text-white font-bold py-4 px-6 rounded-2xl border border-white/10 active:scale-[0.98] transition-all duration-200 flex items-center justify-between shadow-lg backdrop-blur-sm"
          id="btn-portal-mecanico"
        >
          <div className="flex items-center gap-3.5 text-left">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500">
              <PenTool className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="block text-base font-extrabold leading-tight">Soy Técnico / Taller</span>
              <span className="block text-[11px] font-normal text-slate-400">Registrar mantenimientos con firma</span>
            </div>
          </div>
          <ArrowRight className="w-5 h-5 text-slate-500 group-hover:translate-x-1 transition-transform" />
        </button>
      </div>

      {/* Sección Informativa: Las dos modalidades de Certificado */}
      <div className="w-full bg-slate-900/40 border border-white/5 rounded-2xl p-5 shadow-inner backdrop-blur-md ring-1 ring-white/5">
        <h3 className="text-xs font-mono font-bold uppercase tracking-widest text-slate-400 mb-4 text-center">
          Tecnología AutoScore VIP
        </h3>
        
        <div className="space-y-4">
          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center shrink-0 text-slate-300 font-mono text-[10px] font-bold border border-slate-700">
              S
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-200 font-display">Certificado Simple (Plateado)</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Muestra la puntuación de confianza (Score de 0-100) y datos básicos homologados. Mantiene la privacidad del historial ante consultas rápidas.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <div className="w-6 h-6 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-amber-500 font-mono text-[10px] font-bold border border-amber-500/30">
              C
            </div>
            <div>
              <h4 className="text-sm font-semibold text-amber-400 font-display">Certificado Completo (Dorado VIP)</h4>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                Desglosa detalladamente la línea de tiempo de reparaciones, kilometraje estricto e historial certificado con talleres y mecánicos auditados.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Botones secundarios (Admin y Documentación) */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => onNavigate("admin")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 relative cursor-pointer"
          id="btn-admin-inicio"
        >
          <Lock className="w-3.5 h-3.5" />
          <span>Panel Admin</span>
          {solicitudesCount > 0 && (
            <span className="bg-red-600 text-white text-[8px] font-mono font-black px-1.5 py-0.5 rounded-full animate-bounce">
              {solicitudesCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onNavigate("documentacion")}
          className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-amber-400 transition-colors font-medium py-2 px-3 rounded-lg hover:bg-white/5 border border-transparent hover:border-white/10 cursor-pointer"
          id="btn-ver-estructura"
        >
          <BookOpen className="w-3.5 h-3.5" />
          <span>Ver estructura y guías</span>
        </button>
      </div>

      {/* Pie de página humilde */}
      <div className="mt-12 text-center">
        <p className="text-[10px] text-slate-600 font-mono">
          AutoScore Venezuela © {new Date().getFullYear()}
        </p>
        <p className="text-[9px] text-slate-700 font-mono mt-0.5">
          Infraestructura serverless con costo de operación de $0 USD
        </p>
      </div>
    </div>
  );
}
