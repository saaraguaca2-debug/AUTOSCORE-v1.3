/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Shield, Car, PenTool, BookOpen, ChevronRight, Home, Info, HelpCircle, AlertCircle, Sparkles, Check, Lock
} from "lucide-react";
import { VistaActual } from "./types";
import BaseDatosToggle from "./components/BaseDatosToggle";
import InicioView from "./components/InicioView";
import UsuarioView from "./components/UsuarioView";
import MecanicoView from "./components/MecanicoView";
import SoporteView from "./components/SoporteView";
import AdminView from "./components/AdminView";

// Decodificador seguro para prevenir fallas fatales (URI Malformed) en navegadores móviles
function safeDecodeURIComponent(str: string): string {
  try {
    return decodeURIComponent(str);
  } catch (e) {
    return str;
  }
}

export default function App() {
  // Limpiar residuos de simulación antigua en almacenamiento local
  useEffect(() => {
    try {
      localStorage.removeItem("autoscore_use_simulado");
      localStorage.removeItem("autoscore_usuarios");
      localStorage.removeItem("autoscore_mecanicos");
      localStorage.removeItem("autoscore_vehiculos");
      localStorage.removeItem("autoscore_historial");
      localStorage.removeItem("autoscore_inicializado");
    } catch (e) {
      // Ignorar en entornos restrictivos
    }
  }, []);

  // Detectar URL predeterminada del Apps Script desde variables de entorno
  const defaultUrl = (
    (import.meta as any).env?.VITE_APPSCRIPT_URL || 
    (import.meta as any).env?.NEXT_PUBLIC_APPSCRIPT_URL || 
    ""
  );

  const [appScriptUrl, setAppScriptUrl] = useState<string>(() => {
    const saved = localStorage.getItem("autoscore_appscript_url");
    return saved || defaultUrl;
  });

  useEffect(() => {
    localStorage.setItem("autoscore_appscript_url", appScriptUrl);
  }, [appScriptUrl]);

  // Enrutamiento mediante Estado de React (Instantáneo y óptimo para móviles)
  const [currentView, setCurrentView] = useState<VistaActual>("home");
  const [usuarioInitialMode, setUsuarioInitialMode] = useState<"login" | "registro">("login");

  // Contador en tiempo real de solicitudes de usuario pendientes de aprobación para notificar al Admin
  const [solicitudesCount, setSolicitudesCount] = useState<number>(0);

  useEffect(() => {
    const sincronizarSolicitudes = () => {
      if (appScriptUrl) {
        fetch(`${appScriptUrl}?accion=adminData`, { mode: "cors" })
          .then(res => res.json())
          .then(data => {
            if (data && data.success && Array.isArray(data.usuarios)) {
              const liveCount = data.usuarios.filter((u: any) => u.estadoUsuario === "Pendiente").length;
              setSolicitudesCount(liveCount);
            } else {
              setSolicitudesCount(0);
            }
          })
          .catch(() => {
            setSolicitudesCount(0);
          });
      } else {
        setSolicitudesCount(0);
      }
    };

    sincronizarSolicitudes();
    window.addEventListener("autoscore_data_updated", sincronizarSolicitudes);
    const interval = setInterval(sincronizarSolicitudes, 5000);

    return () => {
      window.removeEventListener("autoscore_data_updated", sincronizarSolicitudes);
      clearInterval(interval);
    };
  }, [appScriptUrl]);

  // Detectar parámetros de la URL para enrutamiento automático en el arranque (QR / Links Públicos)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlApi = params.get("api");
    if (urlApi) {
      setAppScriptUrl(safeDecodeURIComponent(urlApi));
    }

    if (params.get("placa")) {
      const vistaParam = params.get("vista");
      if (vistaParam === "mecanico") {
        setCurrentView("mecanico");
      } else {
        setCurrentView("usuario");
      }
    } else if (params.get("vista") === "mecanico") {
      setCurrentView("mecanico");
    }
  }, []);

  // Función para transicionar vistas suavemente
  const navegarA = (vista: VistaActual, modoUsuario?: "login" | "registro") => {
    if (modoUsuario) {
      setUsuarioInitialMode(modoUsuario);
    } else if (vista === "usuario" && !modoUsuario) {
      setUsuarioInitialMode("login");
    }
    setCurrentView(vista);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-slate-100 flex flex-col selection:bg-amber-500/30 selection:text-amber-200">
      
      {/* 1. Barra de Conexión a Google Sheets */}
      <div className="no-print">
        <BaseDatosToggle
          appScriptUrl={appScriptUrl}
          setAppScriptUrl={setAppScriptUrl}
        />
      </div>

      {/* 2. Banner de Estado Activo de la API */}
      {!appScriptUrl && (
        <div className="bg-amber-500/10 border-b border-amber-500/20 py-2 px-4 text-center no-print">
          <div className="max-w-md mx-auto flex items-center justify-center gap-2 text-xs text-amber-400 font-medium">
            <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
            <span>Configura tu URL de Google Sheets en la barra superior ⚙️ para conectar tu base de datos.</span>
          </div>
        </div>
      )}

      {/* 3. Contenedor Principal con chasis estilo iPhone/Smartphone en Desktop */}
      <main className="flex-1 flex flex-col justify-start items-center w-full max-w-7xl mx-auto py-4 px-2 sm:px-4 mb-20">
        
        {/* Chasis de Dispositivo Móvil en Pantallas Grandes para emulación real */}
        <div className="w-full max-w-md bg-slate-950/20 backdrop-blur-md sm:border sm:border-white/10 sm:rounded-[36px] sm:shadow-2xl overflow-hidden min-h-[720px] flex flex-col relative sm:ring-1 sm:ring-white/5 sm:glow-silver/10 print:max-w-full print:border-none print:shadow-none print:bg-transparent">
          
          {/* Cámara Notch para estética smartphone premium */}
          <div className="hidden sm:flex justify-center w-full pt-3 pb-1 bg-black/40 border-b border-white/5 no-print">
            <div className="w-28 h-4 rounded-full bg-slate-950 border border-slate-800/80 flex items-center justify-between px-3">
              <div className="w-1.5 h-1.5 rounded-full bg-slate-900" />
              <div className="w-8 h-1 rounded-full bg-slate-900" />
              <div className="w-1.5 h-1.5 rounded-full bg-blue-500/30" />
            </div>
          </div>

          {/* Vistas dinámicas */}
          <div className="flex-1 flex flex-col py-2 w-full max-w-full overflow-x-hidden">
            {(() => {
              switch (currentView) {
                case "home":
                  return <InicioView onNavigate={navegarA} solicitudesCount={solicitudesCount} />;
                case "usuario":
                  return <UsuarioView appScriptUrl={appScriptUrl} initialMode={usuarioInitialMode} />;
                case "mecanico":
                  return <MecanicoView appScriptUrl={appScriptUrl} />;
                case "admin":
                  return <AdminView appScriptUrl={appScriptUrl} />;
                case "documentacion":
                  return <SoporteView onNavigate={navegarA} />;
                default:
                  return null;
              }
            })()}
          </div>

        </div>
      </main>

      {/* 4. Barra de Navegación de Control de Tacto Inferior (Dock Flotante) */}
      <div className="fixed bottom-3 left-1/2 -translate-x-1/2 bg-slate-900/90 backdrop-blur-xl border border-white/10 py-2 px-3 sm:px-4 rounded-2xl shadow-2xl flex items-center justify-between gap-1.5 sm:gap-3 z-40 animate-fade-in w-[calc(100%-1.5rem)] max-w-sm ring-1 ring-white/5 no-print">
        
        <button
          onClick={() => navegarA("home")}
          className={`flex flex-col items-center gap-0.5 transition-all min-w-0 flex-1 ${
            currentView === "home" ? "text-amber-500 scale-105 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="dock-btn-home"
        >
          <Home className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
          <span className="text-[9px] sm:text-[10px] truncate">Inicio</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

        <button
          onClick={() => navegarA("usuario")}
          className={`flex flex-col items-center gap-0.5 transition-all min-w-0 flex-1 ${
            currentView === "usuario" ? "text-amber-500 scale-105 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="dock-btn-usuario"
        >
          <Car className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
          <span className="text-[9px] sm:text-[10px] truncate">Garage</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

        <button
          onClick={() => navegarA("mecanico")}
          className={`flex flex-col items-center gap-0.5 transition-all min-w-0 flex-1 ${
            currentView === "mecanico" ? "text-amber-500 scale-105 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="dock-btn-mecanico"
        >
          <PenTool className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
          <span className="text-[9px] sm:text-[10px] truncate">Técnico</span>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

        <button
          onClick={() => navegarA("admin")}
          className={`flex flex-col items-center gap-0.5 transition-all min-w-0 flex-1 relative ${
            currentView === "admin" ? "text-amber-500 scale-105 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="dock-btn-admin"
          title={solicitudesCount > 0 ? `${solicitudesCount} solicitud${solicitudesCount > 1 ? "es" : ""} de usuario pendiente${solicitudesCount > 1 ? "s" : ""} de aprobación` : "Panel de Administrador"}
        >
          <div className="relative flex items-center justify-center">
            <Lock className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
            {solicitudesCount > 0 && (
              <>
                <span className="absolute -top-1.5 -right-2.5 bg-gradient-to-r from-red-600 to-rose-600 text-white font-mono text-[9px] font-black min-w-[17px] h-[17px] px-1 rounded-full flex items-center justify-center shadow-lg shadow-red-500/60 border-2 border-slate-900 leading-none z-10 animate-bounce">
                  {solicitudesCount > 99 ? "99+" : solicitudesCount}
                </span>
                <span className="absolute -top-1.5 -right-2.5 w-[17px] h-[17px] rounded-full bg-red-500 animate-ping opacity-75" />
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[9px] sm:text-[10px] truncate">Admin</span>
            {solicitudesCount > 0 && (
              <span className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
            )}
          </div>
        </button>

        <div className="w-[1px] h-5 bg-slate-800 shrink-0" />

        <button
          onClick={() => navegarA("documentacion")}
          className={`flex flex-col items-center gap-0.5 transition-all min-w-0 flex-1 ${
            currentView === "documentacion" ? "text-amber-500 scale-105 font-bold" : "text-slate-400 hover:text-slate-200"
          }`}
          id="dock-btn-soporte"
        >
          <BookOpen className="w-4 h-4 sm:w-5 sm:h-5 stroke-[2]" />
          <span className="text-[9px] sm:text-[10px] truncate">Guías</span>
        </button>

      </div>

    </div>
  );
}
