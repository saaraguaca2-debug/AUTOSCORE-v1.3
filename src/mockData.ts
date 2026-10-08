import { Mecanico, Vehiculo, HistorialRow } from "./types";

// Configuración dinámica de Puntos y Reglas de Score
export interface ScoreConfig {
  puntosBaseFirma: number;        // Puntos base por firma registrada
  puntosAceite: number;           // Puntos por cambio de aceite/filtro
  puntosFrenos: number;           // Puntos por frenos/pastillas/discos
  puntosCorrea: number;           // Puntos por correa de distribución/tiempo
  puntosSuspension: number;       // Puntos por suspensión/amortiguador/cauchos
  puntosGeneral: number;          // Puntos por escáner/revisión general
  penalizacionRetraso6m: number;   // Penalización por 6-12 meses sin firmar
  penalizacionVencido12m: number;  // Penalización por >12 meses sin firmar
  penalizacionSinHistorial: number; // Penalización por sin historial
}

export const DEFAULT_SCORE_CONFIG: ScoreConfig = {
  puntosBaseFirma: 10,
  puntosAceite: 15,
  puntosFrenos: 15,
  puntosCorrea: 25,
  puntosSuspension: 10,
  puntosGeneral: 10,
  penalizacionRetraso6m: 10,
  penalizacionVencido12m: 25,
  penalizacionSinHistorial: 20
};

export function getScoreConfig(): ScoreConfig {
  if (typeof window === "undefined") return DEFAULT_SCORE_CONFIG;
  const saved = localStorage.getItem("autoscore_score_config");
  if (!saved) return DEFAULT_SCORE_CONFIG;
  try {
    return { ...DEFAULT_SCORE_CONFIG, ...JSON.parse(saved) };
  } catch {
    return DEFAULT_SCORE_CONFIG;
  }
}

export function saveScoreConfig(config: ScoreConfig) {
  if (typeof window !== "undefined") {
    localStorage.setItem("autoscore_score_config", JSON.stringify(config));
  }
}

// Disparar evento para que toda la interfaz se actualice de inmediato en tiempo real
export function notifyDataChanged() {
  if (typeof window !== "undefined") {
    try {
      window.dispatchEvent(new CustomEvent("autoscore_data_updated"));
    } catch (e) {
      // Ignorar en entornos sin DOM
    }
  }
}
