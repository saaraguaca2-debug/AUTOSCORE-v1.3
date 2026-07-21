import React from "react";
import { 
  Gauge, ChevronLeft, ShieldCheck, AlertTriangle, CheckCircle2, 
  Clock, Wrench, Sparkles, TrendingUp, Calculator, ShieldAlert, FileText, Activity
} from "lucide-react";
import { VistaActual } from "../types";

interface SoporteViewProps {
  onNavigate: (vista: VistaActual) => void;
}

export default function SoporteView({ onNavigate }: SoporteViewProps) {
  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 animate-fade-in text-slate-300">
      {/* Botón de regreso */}
      <button
        onClick={() => onNavigate("home")}
        className="mb-6 flex items-center gap-1.5 text-xs text-amber-500 hover:text-amber-400 font-semibold uppercase tracking-wider transition-colors"
        id="btn-soporte-back"
      >
        <ChevronLeft className="w-4 h-4" />
        Regresar al Inicio
      </button>

      {/* Título Principal */}
      <div className="mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-mono font-bold uppercase tracking-wider mb-3">
          <Gauge className="w-3.5 h-3.5" />
          Algoritmo Oficial AutoScore
        </div>
        <h2 className="text-2xl font-display font-extrabold text-white">
          Guía del Algoritmo de Score de Salud
        </h2>
        <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
          Explicación detallada del funcionamiento, cálculo dinámico, penalizaciones por tiempo y bonificaciones de la calificación mecánica AutoScore (0 a 100 puntos).
        </p>
      </div>

      {/* Contenido de la Guía del Score */}
      <div className="space-y-6">

        {/* 1. Descripción General */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">¿Qué es el Score AutoScore?</h3>
              <p className="text-[11px] text-slate-400">Índice transparente de trazabilidad mecánica (0 - 100 pts)</p>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            El <strong>Score de Salud Mecánica</strong> es una puntuación objetiva en tiempo real que refleja el estado de conservación, uso y mantenimiento preventivo de un vehículo. Permite a compradores, vendedores y talleres verificar la confiabilidad de una unidad mediante datos certificados.
          </p>
        </div>

        {/* 2. Cálculo Inicial / Antigüedad */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">1. Score Base por Año del Vehículo</h3>
              <p className="text-[11px] text-slate-400">Punto de partida ajustado por depreciación natural</p>
            </div>
          </div>
          
          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Para vehículos recién registrados sin inspección técnica completa previa, el sistema calcula un <strong>Score Base de Fábrica</strong> partiendo de 100 puntos y descontando <strong>1.5 puntos por cada año de antigüedad</strong>:
          </p>

          <div className="bg-black/40 border border-white/5 p-3.5 rounded-xl font-mono text-xs text-amber-300 mb-3 text-center">
            <code>Score Base = Max(50, 100 - (Antigüedad × 1.5))</code>
          </div>

          <div className="grid grid-cols-3 gap-2 font-mono text-[11px] text-center">
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[9px]">AÑO 2026</span>
              <strong className="text-emerald-400 text-xs">100 pts</strong>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[9px]">AÑO 2020 (6 años)</span>
              <strong className="text-amber-400 text-xs">91 pts</strong>
            </div>
            <div className="bg-white/5 p-2 rounded-lg border border-white/5">
              <span className="text-slate-400 block text-[9px]">AÑO 2012 (14 años)</span>
              <strong className="text-amber-400 text-xs">79 pts</strong>
            </div>
          </div>
        </div>

        {/* 3. Inspección Técnica Física (Módulos) */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
              <Wrench className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">2. Score por Inspección Física en Taller</h3>
              <p className="text-[11px] text-slate-400">Evaluación directa de 5 sistemas mecánicos principales</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            Cuando un taller o técnico autorizado efectúa una revisión diagnóstica presencial, el Score es reemplazado por la suma de la evaluación técnica de 5 áreas clave (<strong>máximo 20 puntos por área</strong>, total 100 pts):
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-slate-300 flex items-center gap-2">⚙️ Motor & Transmisión</span>
              <span className="text-purple-400 font-bold">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-slate-300 flex items-center gap-2">🚗 Chasis & Carrocería</span>
              <span className="text-purple-400 font-bold">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-slate-300 flex items-center gap-2">🛞 Dirección & Suspensión</span>
              <span className="text-purple-400 font-bold">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-slate-300 flex items-center gap-2">💻 Escaneo OBD / Electrónica</span>
              <span className="text-purple-400 font-bold">0 a 20 pts</span>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5">
              <span className="text-slate-300 flex items-center gap-2">🛑 Neumáticos & Frenos</span>
              <span className="text-purple-400 font-bold">0 a 20 pts</span>
            </div>
          </div>
        </div>

        {/* 4. Penalizaciones Dinámicas por Tiempo */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">3. Penalización Dinámica por Inactividad</h3>
              <p className="text-[11px] text-slate-400">Ajuste automático según el tiempo desde la última firma digital</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 mb-3 leading-relaxed">
            El sistema evalúa continuamente la fecha del último mantenimiento certificado. Si un vehículo no recibe servicios preventivos, su Score disminuye automáticamente para advertir a posibles compradores:
          </p>

          <div className="space-y-2.5 text-xs">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-emerald-400 font-display">
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  Mantenimiento al Día (&lt; 6 meses)
                </div>
                <p className="text-[11px] text-slate-300 mt-1">Servicio registrado en los últimos 180 días.</p>
              </div>
              <span className="font-mono font-extrabold text-emerald-400 text-sm whitespace-nowrap">0 pts penalización</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-amber-400 font-display">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  Mantenimiento Retrasado (6 a 12 meses)
                </div>
                <p className="text-[11px] text-slate-300 mt-1">Entre 180 y 365 días sin registrar firma de taller.</p>
              </div>
              <span className="font-mono font-extrabold text-amber-400 text-sm whitespace-nowrap">-10 pts</span>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-red-400 font-display">
                  <ShieldAlert className="w-4 h-4 shrink-0" />
                  Mantenimiento Vencido (&gt; 12 meses)
                </div>
                <p className="text-[11px] text-slate-300 mt-1">Más de 365 días sin registros certificados en AutoScore.</p>
              </div>
              <span className="font-mono font-extrabold text-red-400 text-sm whitespace-nowrap">-25 pts</span>
            </div>

            <div className="p-3 rounded-xl bg-slate-800/60 border border-white/5 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 font-bold text-slate-400 font-display">
                  <FileText className="w-4 h-4 shrink-0" />
                  Sin Historial Registrado
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Vehículo recién agregado sin ninguna firma aún.</p>
              </div>
              <span className="font-mono font-extrabold text-amber-400 text-sm whitespace-nowrap">-20 pts</span>
            </div>
          </div>
        </div>

        {/* 5. Análisis Semántico de la Descripción del Trabajo */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">4. Interpretación Automática de la Descripción</h3>
              <p className="text-[11px] text-slate-400">¿Cómo otorga puntos el algoritmo según la reparación realizada?</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            El sistema AutoScore analiza el texto introducido por el mecánico en el campo <strong>"Trabajo Realizado"</strong> mediante coincidencia de palabras clave semánticas. Cada tipo de reparación añade un bono específico de puntos al Score de Salud:
          </p>

          <div className="space-y-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-bold block">🛢️ "Aceite", "Filtro", "Lubricante", "Bujía"</span>
                <span className="text-[10px] text-slate-400 font-sans">Mantenimiento preventivo básico de motor</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs whitespace-nowrap">+25 pts</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-bold block">🛑 "Frenos", "Freno", "Pastillas", "Discos"</span>
                <span className="text-[10px] text-slate-400 font-sans">Servicio del sistema de frenado y seguridad</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs whitespace-nowrap">+25 pts</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-bold block">⚙️ "Correa", "Distribución", "Tiempo", "Cadena"</span>
                <span className="text-[10px] text-slate-400 font-sans">Kit de distribución (reparación crítica)</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs whitespace-nowrap">+35 pts</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-bold block">🛞 "Suspensión", "Amortiguador", "Caucho", "Tren"</span>
                <span className="text-[10px] text-slate-400 font-sans">Mantenimiento de rodamiento y amortiguación</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs whitespace-nowrap">+20 pts</span>
            </div>

            <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
              <div>
                <span className="text-amber-300 font-bold block">💻 "General", "Escáner", "Revisión", "Diagnóstico"</span>
                <span className="text-[10px] text-slate-400 font-sans">Chequeo electrónico e inspección de rutina</span>
              </div>
              <span className="text-emerald-400 font-extrabold text-xs whitespace-nowrap">+20 pts</span>
            </div>
          </div>
        </div>

        {/* 6. Recuperación del Score */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">5. Recuperación de Puntos al Firmar</h3>
              <p className="text-[11px] text-slate-400">Aumento e incentivo inmediato al registrar mantenimientos</p>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed mb-3">
            Cada vez que un taller o mecánico registrado ingresa una nueva firma digital válida con trabajo realizado y kilometraje:
          </p>

          <ul className="space-y-2 text-xs text-slate-300 list-disc list-inside">
            <li>Se elimina cualquier penalización por tiempo de inactividad de forma instantánea.</li>
            <li>El temporizador de 180 días se reinicia a 0.</li>
            <li>El vehículo recupera su nivel óptimo de salud (hasta 95 - 100 pts) reflejado en el Certificado Digital y QR.</li>
          </ul>
        </div>

        {/* 6. Rangos y Colores de Estado */}
        <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-5 backdrop-blur-md">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white font-display">Clasificación en Certificados</h3>
              <p className="text-[11px] text-slate-400">Interpretación rápida para compradores y usuarios</p>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-2.5 font-mono text-[11px] text-center">
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="text-lg font-black block">90 - 100</span>
              <span className="text-[10px] uppercase font-sans font-bold block mt-1">🟢 AL DÍA</span>
              <span className="text-[9px] text-slate-400 font-sans mt-0.5 block">Excelente conservación</span>
            </div>

            <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
              <span className="text-lg font-black block">70 - 89</span>
              <span className="text-[10px] uppercase font-sans font-bold block mt-1">🟡 RETRASADO</span>
              <span className="text-[9px] text-slate-400 font-sans mt-0.5 block">Requiere revisión</span>
            </div>

            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400">
              <span className="text-lg font-black block">&lt; 70</span>
              <span className="text-[10px] uppercase font-sans font-bold block mt-1">🔴 ALERTA</span>
              <span className="text-[9px] text-slate-400 font-sans mt-0.5 block">Mantenimiento vencido</span>
            </div>
          </div>
        </div>

      </div>

      {/* Botón de navegación final */}
      <div className="mt-8 mb-4 text-center">
        <button
          onClick={() => onNavigate("home")}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold py-2.5 px-6 rounded-xl text-xs transition-colors shadow-lg shadow-amber-500/10"
          id="btn-soporte-entendido"
        >
          Entendido, ¡Ir al Sistema AutoScore!
        </button>
      </div>
    </div>
  );
}

