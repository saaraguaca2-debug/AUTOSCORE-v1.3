import React from "react";
import { 
  Gauge, ChevronLeft, ShieldCheck, AlertTriangle, CheckCircle2, 
  Clock, Wrench, Sparkles, TrendingUp, Calculator, ShieldAlert, FileText, Activity
} from "lucide-react";
import { VistaActual } from "../types";
import { getScoreConfig } from "../mockData";

interface SoporteViewProps {
  onNavigate: (vista: VistaActual) => void;
}

export default function SoporteView({ onNavigate }: SoporteViewProps) {
  const scoreConfig = getScoreConfig();
  return (
    <div className="w-full max-w-md mx-auto px-2.5 sm:px-3 py-3 animate-fade-in text-slate-300 overflow-x-hidden box-border">
      {/* Botón de regreso */}
      <button
        onClick={() => onNavigate("home")}
        className="mb-4 flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold uppercase tracking-wider transition-colors"
        id="btn-soporte-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Regresar al Inicio
      </button>

      {/* Título Principal */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-2.5">
          <Gauge className="w-3.5 h-3.5" />
          Algoritmo Oficial AutoScore
        </div>
        <h2 className="text-xl sm:text-2xl font-display font-extrabold text-white">
          Guía del Algoritmo de Score
        </h2>
        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
          Explicación detallada del funcionamiento, cálculo dinámico, penalizaciones por tiempo y bonificaciones de la calificación mecánica AutoScore (0 a 100 puntos).
        </p>
      </div>

      {/* Contenido de la Guía del Score */}
      <div className="space-y-4">

        {/* 1. Descripción General */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">¿Qué es el Score AutoScore?</h3>
              <p className="text-[10px] text-slate-400 truncate">Índice transparente de trazabilidad mecánica (0 - 100 pts)</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            El <strong>Score de Salud Mecánica</strong> es una puntuación objetiva en tiempo real que refleja el estado de conservación, uso y mantenimiento preventivo de un vehículo. Permite a compradores, vendedores y talleres verificar la confiabilidad de una unidad mediante datos certificados.
          </p>
        </div>

        {/* 2. Cálculo Inicial / Antigüedad */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 shrink-0">
              <Calculator className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">1. Score Base por Año del Vehículo</h3>
              <p className="text-[10px] text-slate-400 truncate">Punto de partida ajustado por depreciación natural</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">
            Para vehículos recién registrados sin inspección técnica completa previa, el sistema calcula un <strong>Score Base de Fábrica</strong> partiendo de 100 puntos y descontando <strong>1.5 puntos por cada año de antigüedad</strong>:
          </p>

          <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl font-mono text-[11px] text-amber-300 mb-2.5 text-center break-all">
            <code>Score Base = Max(50, 100 - (Antigüedad × 1.5))</code>
          </div>

          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-center">
            <div className="bg-white/5 p-2 rounded-lg border border-white/5 flex flex-col justify-center">
              <span className="text-slate-400 block text-[8px]">AÑO 2026</span>
              <strong className="text-emerald-400 text-xs mt-0.5">100 pts</strong>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5 flex flex-col justify-center">
              <span className="text-slate-400 block text-[8px]">2020 (6 a.)</span>
              <strong className="text-amber-400 text-xs mt-0.5">91 pts</strong>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5 flex flex-col justify-center">
              <span className="text-slate-400 block text-[8px]">2012 (14 a.)</span>
              <strong className="text-amber-400 text-xs mt-0.5">79 pts</strong>
            </div>
          </div>
        </div>

        {/* 3. Inspección Técnica Física (Módulos) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 shrink-0">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">2. Score por Inspección Física en Taller</h3>
              <p className="text-[10px] text-slate-400 truncate">Evaluación de 5 sistemas mecánicos principales</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">
            Cuando un taller o técnico autorizado efectúa una revisión diagnóstica presencial, el Score es reemplazado por la suma de la evaluación técnica de 5 áreas clave (<strong>máximo 20 puntos por área</strong>, total 100 pts):
          </p>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 gap-2">
              <span className="text-slate-300 text-xs truncate">⚙️ Motor & Transmisión</span>
              <span className="text-purple-400 font-bold shrink-0 text-xs">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 gap-2">
              <span className="text-slate-300 text-xs truncate">🚗 Chasis & Carrocería</span>
              <span className="text-purple-400 font-bold shrink-0 text-xs">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 gap-2">
              <span className="text-slate-300 text-xs truncate">🛞 Dirección & Suspensión</span>
              <span className="text-purple-400 font-bold shrink-0 text-xs">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 gap-2">
              <span className="text-slate-300 text-xs truncate">💻 Escaneo OBD / Electrónica</span>
              <span className="text-purple-400 font-bold shrink-0 text-xs">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 gap-2">
              <span className="text-slate-300 text-xs truncate">🛑 Neumáticos & Frenos</span>
              <span className="text-purple-400 font-bold shrink-0 text-xs">0 a 20 pts</span>
            </div>
          </div>
        </div>

        {/* 4. Penalizaciones Dinámicas por Tiempo */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Clock className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">3. Penalización por Inactividad</h3>
              <p className="text-[10px] text-slate-400 truncate">Ajuste automático por tiempo transcurrido</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-2.5 leading-relaxed">
            El sistema evalúa continuamente la fecha del último mantenimiento certificado. Si un vehículo no recibe servicios preventivos, su Score disminuye automáticamente:
          </p>

          <div className="space-y-2 text-xs">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-emerald-400 font-display text-xs">
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Al Día (&lt; 6 meses)</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5 truncate">Servicio registrado en los últimos 180 días.</p>
              </div>
              <span className="font-mono font-extrabold text-emerald-400 text-xs shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                0 pts
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-amber-400 font-display text-xs">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Retrasado (6 a 12 meses)</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5 truncate">Entre 180 y 365 días sin firma.</p>
              </div>
              <span className="font-mono font-extrabold text-amber-400 text-xs shrink-0 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                -{scoreConfig.penalizacionRetraso6m} pts
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-red-400 font-display text-xs">
                  <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Vencido (&gt; 12 meses)</span>
                </div>
                <p className="text-[10px] text-slate-300 mt-0.5 truncate">Más de 365 días sin registros.</p>
              </div>
              <span className="font-mono font-extrabold text-red-400 text-xs shrink-0 bg-red-500/10 px-2 py-1 rounded-lg border border-red-500/20">
                -{scoreConfig.penalizacionVencido12m} pts
              </span>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/60 border border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 font-bold text-slate-400 font-display text-xs">
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">Sin Historial Registrado</span>
                </div>
                <p className="text-[10px] text-slate-400 mt-0.5 truncate">Vehículo recién agregado sin firma.</p>
              </div>
              <span className="font-mono font-extrabold text-amber-400 text-xs shrink-0 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20">
                -{scoreConfig.penalizacionSinHistorial} pts
              </span>
            </div>
          </div>
        </div>

        {/* 5. Análisis Semántico de la Descripción del Trabajo */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <Sparkles className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">4. Interpretación de la Descripción</h3>
              <p className="text-[10px] text-slate-400 truncate">Puntos otorgados según el tipo de reparación</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
            El sistema AutoScore analiza el texto introducido en <strong>"Trabajo Realizado"</strong> mediante coincidencias semánticas. Cada tipo de reparación añade un bono específico:
          </p>

          <div className="space-y-1.5 text-xs font-mono">
            <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-amber-300 font-bold block text-xs truncate">🛢️ Aceite, Filtro, Lubricante</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Preventivo básico de motor</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                +{scoreConfig.puntosBaseFirma + scoreConfig.puntosAceite} pts
              </span>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-amber-300 font-bold block text-xs truncate">🛑 Frenos, Pastillas, Discos</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Sistema de frenado y seguridad</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                +{scoreConfig.puntosBaseFirma + scoreConfig.puntosFrenos} pts
              </span>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-amber-300 font-bold block text-xs truncate">⚙️ Correa, Distribución, Cadena</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Kit de distribución (crítico)</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                +{scoreConfig.puntosBaseFirma + scoreConfig.puntosCorrea} pts
              </span>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-amber-300 font-bold block text-xs truncate">🛞 Suspensión, Amortiguador</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Rodamiento y amortiguación</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                +{scoreConfig.puntosBaseFirma + scoreConfig.puntosSuspension} pts
              </span>
            </div>

            <div className="p-2 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between gap-2">
              <div className="min-w-0 flex-1">
                <span className="text-amber-300 font-bold block text-xs truncate">💻 General, Escáner, Revisión</span>
                <span className="text-[10px] text-slate-400 font-sans block truncate">Chequeo electrónico e inspección</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs shrink-0 bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/20">
                +{scoreConfig.puntosBaseFirma + scoreConfig.puntosGeneral} pts
              </span>
            </div>
          </div>
        </div>

        {/* 6. Recuperación del Score */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 shrink-0">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">5. Recuperación de Puntos al Firmar</h3>
              <p className="text-[10px] text-slate-400 truncate">Incentivo inmediato al registrar mantenimientos</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-2.5">
            Cada vez que un taller o mecánico registrado ingresa una nueva firma digital válida con trabajo realizado:
          </p>

          <ul className="space-y-1.5 text-xs text-slate-300 list-disc list-inside">
            <li>Se elimina cualquier penalización por inactividad.</li>
            <li>El temporizador de 180 días se reinicia a 0.</li>
            <li>El vehículo recupera su nivel óptimo de salud (hasta 100 pts).</li>
          </ul>
        </div>

        {/* 7. Rangos y Colores de Estado */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 backdrop-blur-md">
          <div className="flex items-center gap-2.5 mb-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shrink-0">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-xs font-bold text-white font-display">Clasificación en Certificados</h3>
              <p className="text-[10px] text-slate-400 truncate">Interpretación rápida para usuarios</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-1.5 font-mono text-[10px] text-center">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex flex-col items-center justify-center">
              <span className="text-sm font-black block">90 - 100</span>
              <span className="text-[9px] uppercase font-sans font-bold block mt-0.5">🟢 AL DÍA</span>
              <span className="text-[8px] text-slate-400 font-sans mt-0.5 block leading-tight">Excelente</span>
            </div>

            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex flex-col items-center justify-center">
              <span className="text-sm font-black block">70 - 89</span>
              <span className="text-[9px] uppercase font-sans font-bold block mt-0.5">🟡 RETRASO</span>
              <span className="text-[8px] text-slate-400 font-sans mt-0.5 block leading-tight">Revisión</span>
            </div>

            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 flex flex-col items-center justify-center">
              <span className="text-sm font-black block">&lt; 70</span>
              <span className="text-[9px] uppercase font-sans font-bold block mt-0.5">🔴 ALERTA</span>
              <span className="text-[8px] text-slate-400 font-sans mt-0.5 block leading-tight">Vencido</span>
            </div>
          </div>
        </div>

      </div>

      {/* Botón de navegación final */}
      <div className="mt-6 mb-2 text-center">
        <button
          onClick={() => onNavigate("home")}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-5 rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/10"
          id="btn-soporte-entendido"
        >
          Entendido, ¡Ir al Sistema AutoScore!
        </button>
      </div>
    </div>
  );
}

