export interface Mecanico {
  codigoMecanico: string;
  nombre: string;
  taller: string;
  estado: "Activo" | "Suspendido";
  telefono?: string;
  especialidad?: string; // Breve descripción de servicios o especialización técnica
  totalPositivas?: number;
  totalNegativas?: number;
  totalServicios?: number;
  porcentajeCalidad?: number;
}

export interface Vehiculo {
  placa: string;
  marca: string;
  modelo: string;
  anio: number;
  idDueno: string; // Cédula o Correo del dueño
  score: number; // 0-100 calificación mecánica
  estadoCertificado: "Activo" | "Vencido";
}

export interface HistorialRow {
  idHistorial: number;
  placa: string;
  fecha: string;
  kilometraje: number;
  codigoMecanico: string;
  taller: string;
  trabajoRealizado: string;
  tipoRegistro?: "Reparación" | "Inspección Técnica";
  telefonoMecanico?: string;
  nombreMecanico?: string;
  evaluacion?: "Bueno" | "Malo"; // Calificación dada por el dueño
  comentarioEvaluacion?: string; // Motivo / experiencia si evaluó negativo o feedback positivo
  fechaEvaluacion?: string;
}

export type VistaActual = "home" | "usuario" | "mecanico" | "documentacion" | "admin";
