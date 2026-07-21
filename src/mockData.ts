import { Mecanico, Vehiculo, HistorialRow } from "./types";

// Tipos adicionales para el flujo de login y base de datos local completa
export interface UsuarioPropietario {
  idDueno: string;
  nombre: string;
  contrasena: string;
  estadoUsuario: "Aprobado" | "Pendiente" | "Rechazado";
}

const MOCK_USUARIOS_INICIAL: UsuarioPropietario[] = [
  {
    idDueno: "26123456",
    nombre: "Pedro Pérez",
    contrasena: "123456",
    estadoUsuario: "Aprobado"
  },
  {
    idDueno: "12987654",
    nombre: "María Rodríguez",
    contrasena: "contrasena",
    estadoUsuario: "Pendiente"
  }
];

// Datos iniciales de mecánicos con teléfono para contacto de seguridad
const MOCK_MECANICOS: Mecanico[] = [
  {
    codigoMecanico: "M101",
    nombre: "Carlos Mendoza",
    taller: "Mendoza Motors (Altamira)",
    estado: "Activo",
    telefono: "584121111111"
  },
  {
    codigoMecanico: "M202",
    nombre: "José Rodríguez",
    taller: "Rodríguez Performance (Boleíta)",
    estado: "Suspendido", // Prueba bloqueo de membresía por falta de pago
    telefono: "584142222222"
  },
  {
    codigoMecanico: "M303",
    nombre: "Valentina Gómez",
    taller: "Caracas Tuning Lab (Chacao)",
    estado: "Activo",
    telefono: "584243333333"
  }
];

// Datos iniciales de vehículos
const MOCK_VEHICULOS: Vehiculo[] = [
  {
    placa: "AB123CD",
    marca: "Toyota",
    modelo: "Corolla",
    anio: 2018,
    idDueno: "26123456",
    score: 98, // Score inicial de inspección técnica
    estadoCertificado: "Activo"
  },
  {
    placa: "EF456GH",
    marca: "Jeep",
    modelo: "Grand Cherokee",
    anio: 2015,
    idDueno: "26123456",
    score: 85,
    estadoCertificado: "Activo"
  },
  {
    placa: "JK789LM",
    marca: "Chevrolet",
    modelo: "Aveo LT",
    anio: 2011,
    idDueno: "26123456",
    score: 90,
    estadoCertificado: "Vencido" // Provoca bloqueo comercial por falta de pago
  },
  {
    placa: "XY987ZT",
    marca: "Ford",
    modelo: "Fiesta Titanium",
    anio: 2013,
    idDueno: "12987654",
    score: 82,
    estadoCertificado: "Activo"
  }
];

// Datos iniciales del historial de mantenimientos verificado
const MOCK_HISTORIAL: HistorialRow[] = [
  {
    idHistorial: 10001,
    placa: "AB123CD",
    fecha: "2026-05-10 14:30:22",
    kilometraje: 45000,
    codigoMecanico: "M101",
    taller: "Mendoza Motors (Altamira)",
    trabajoRealizado: "Cambio de correa de tiempo, bujías denso de iridio, limpieza profunda de inyectores por ultrasonido y reemplazo de filtro de gasolina."
  },
  {
    idHistorial: 10002,
    placa: "AB123CD",
    fecha: "2026-06-15 09:15:00",
    kilometraje: 42000,
    codigoMecanico: "M303",
    taller: "Caracas Tuning Lab (Chacao)",
    trabajoRealizado: "Servicio de lubricación completo. Cambio de aceite semisintético 15W40, filtro de aire de motor, filtro de cabina y revisión general de frenos delanteros."
  },
  {
    idHistorial: 10003,
    placa: "EF456GH",
    fecha: "2026-04-02 11:20:10",
    kilometraje: 112000,
    codigoMecanico: "M101",
    taller: "Mendoza Motors (Altamira)",
    trabajoRealizado: "Sustitución de amortiguadores delanteros marca Gabriel, reparación menor del sistema de dirección (terminales) con alineación computarizada y balanceo."
  },
  {
    idHistorial: 10004,
    placa: "JK789LM",
    fecha: "2025-11-20 16:45:00",
    kilometraje: 185000,
    codigoMecanico: "M202",
    taller: "Rodríguez Performance (Boleíta)",
    trabajoRealizado: "Reparación de fuga de refrigerante en manguera superior del radiador, reemplazo de tapa de envase de expansión y purga de sistema con refrigerante premium."
  }
];

// Función para inicializar el LocalStorage si no tiene datos cargados
export function inicializarBaseDatosSimulada() {
  const isBrowser = typeof window !== "undefined";
  if (isBrowser && !localStorage.getItem("autoscore_inicializado")) {
    localStorage.setItem("autoscore_usuarios", JSON.stringify(MOCK_USUARIOS_INICIAL));
    localStorage.setItem("autoscore_mecanicos", JSON.stringify(MOCK_MECANICOS));
    localStorage.setItem("autoscore_vehiculos", JSON.stringify(MOCK_VEHICULOS));
    localStorage.setItem("autoscore_historial", JSON.stringify(MOCK_HISTORIAL));
    localStorage.setItem("autoscore_inicializado", "true");
    console.log("AutoScore DB local inicializada con éxito.");
  }

  // Sincronizar placa de la URL sobre la marcha para facilitar pruebas multidispositivo
  if (isBrowser) {
    const params = new URLSearchParams(window.location.search);
    const urlPlaca = params.get("placa");
    if (urlPlaca) {
      const cleanPlaca = urlPlaca.trim().toUpperCase();
      const vehiculosStr = localStorage.getItem("autoscore_vehiculos") || "[]";
      try {
        const vehiculos = JSON.parse(vehiculosStr) as Vehiculo[];
        const existe = vehiculos.some(v => v.placa.toUpperCase() === cleanPlaca);
        if (!existe) {
          // Auto-registrar este carro en la simulación para que el escáner del celular o la vista no fallen
          const nuevoVehiculo: Vehiculo = {
            placa: cleanPlaca,
            marca: "Toyota",
            modelo: "Corolla",
            anio: 2022,
            idDueno: "26123456", // Vinculado al usuario Pedro Pérez por defecto
            score: 95,
            estadoCertificado: "Activo"
          };
          vehiculos.push(nuevoVehiculo);
          localStorage.setItem("autoscore_vehiculos", JSON.stringify(vehiculos));
          
          // También pre-llenar un par de registros de historial simulados para que no aparezca vacío
          const historialStr = localStorage.getItem("autoscore_historial") || "[]";
          const historial = JSON.parse(historialStr) as HistorialRow[];
          const existeHist = historial.some(h => h.placa.toUpperCase() === cleanPlaca);
          if (!existeHist) {
            historial.push({
              idHistorial: Date.now(),
              placa: cleanPlaca,
              fecha: new Date().toISOString().replace("T", " ").substring(0, 19),
              kilometraje: 15000,
              codigoMecanico: "M101",
              taller: "Mendoza Motors (Altamira)",
              trabajoRealizado: "Inspección técnica inicial de homologación AutoScore. Cambio de aceite sintético 5W30 y filtros originales."
            });
            localStorage.setItem("autoscore_historial", JSON.stringify(historial));
          }
          console.log(`Vehículo de URL ${cleanPlaca} auto-registrado en la DB local.`);
        }
      } catch (e) {
        console.error("Error al sincronizar placa de URL en la DB simulada", e);
      }
    }
  }
}

// Obtener datos actuales del localStorage
export function getSimulatedData() {
  inicializarBaseDatosSimulada();
  return {
    usuarios: JSON.parse(localStorage.getItem("autoscore_usuarios") || "[]") as UsuarioPropietario[],
    mecanicos: JSON.parse(localStorage.getItem("autoscore_mecanicos") || "[]") as Mecanico[],
    vehiculos: JSON.parse(localStorage.getItem("autoscore_vehiculos") || "[]") as Vehiculo[],
    historial: JSON.parse(localStorage.getItem("autoscore_historial") || "[]") as HistorialRow[]
  };
}

// Guardar datos actualizados
export function saveSimulatedData(data: {
  usuarios: UsuarioPropietario[];
  mecanicos: Mecanico[];
  vehiculos: Vehiculo[];
  historial: HistorialRow[];
}) {
  localStorage.setItem("autoscore_usuarios", JSON.stringify(data.usuarios));
  localStorage.setItem("autoscore_mecanicos", JSON.stringify(data.mecanicos));
  localStorage.setItem("autoscore_vehiculos", JSON.stringify(data.vehiculos));
  localStorage.setItem("autoscore_historial", JSON.stringify(data.historial));
}

/**
 * SIMULACIÓN DE ENDPOINTS DEL BACKEND GOOGLE APPS SCRIPT
 */

// Simular Login
export function simularLogin(idDueno: string, contrasena: string) {
  const data = getSimulatedData();
  const cleanId = idDueno.trim().toLowerCase();
  
  const usuario = data.usuarios.find(u => u.idDueno.toLowerCase() === cleanId);
  if (!usuario) {
    return { success: false, error: "Cédula/ID no registrado en el sistema." };
  }
  
  if (usuario.contrasena !== contrasena) {
    return { success: false, error: "Contraseña incorrecta." };
  }
  
  if (usuario.estadoUsuario !== "Aprobado") {
    return {
      success: false,
      error: `REGISTRO PENDIENTE: Tu cuenta (${usuario.nombre}) está en espera de aprobación por el Administrador. Comunícate para agilizar la activación.`,
      estadoUsuario: usuario.estadoUsuario
    };
  }
  
  return { success: true, usuario };
}

// Simular Registro de Usuario
export function simularRegistroUsuario(idDueno: string, nombre: string, contrasena: string) {
  const data = getSimulatedData();
  const cleanId = idDueno.trim();
  
  if (data.usuarios.some(u => u.idDueno.toLowerCase() === cleanId.toLowerCase())) {
    return { success: false, error: "Este ID / Cédula ya está registrado en AutoScore." };
  }
  
  const nuevo: UsuarioPropietario = {
    idDueno: cleanId,
    nombre: nombre.trim(),
    contrasena: contrasena,
    estadoUsuario: "Pendiente"
  };
  
  data.usuarios.push(nuevo);
  saveSimulatedData(data);
  return { success: true, message: "¡Registro guardado! Tu cuenta se encuentra en proceso de aprobación." };
}

// Buscar por idDueno (Retorna carros solo si el usuario está aprobado)
export function simularGetPorDueno(idDueno: string) {
  const data = getSimulatedData();
  const searchId = idDueno.trim().toLowerCase();
  
  const usuario = data.usuarios.find(u => u.idDueno.toLowerCase() === searchId);
  if (usuario && usuario.estadoUsuario !== "Aprobado") {
    return {
      success: false,
      error: "REGISTRO PENDIENTE: Tu cuenta está registrada pero aún está pendiente por la aprobación del Administrador.",
      estadoUsuario: "Pendiente"
    };
  }
  
  const filtrados = data.vehiculos.filter(
    v => v.idDueno.trim().toLowerCase() === searchId
  );
  
  return {
    success: true,
    count: filtrados.length,
    data: filtrados
  };
}

// Buscar por placa y tipo de certificado con Penalidades dinámicas
export function simularGetCertificado(placa: string, tipoCertificado: string) {
  const data = getSimulatedData();
  const searchPlaca = placa.trim().toUpperCase();
  const tipo = tipoCertificado.trim().toLowerCase();
  
  let vehiculo = data.vehiculos.find(v => v.placa.trim().toUpperCase() === searchPlaca);
  if (!vehiculo) {
    // Auto-registrar sobre la marcha para facilitar la simulación multiplataforma
    vehiculo = {
      placa: searchPlaca,
      marca: "Toyota",
      modelo: "Corolla",
      anio: 2022,
      idDueno: "26123456", // Vinculado a Pedro Pérez
      score: 95,
      estadoCertificado: "Activo"
    };
    data.vehiculos.push(vehiculo);
    saveSimulatedData(data);
  }
  
  if (vehiculo.estadoCertificado === "Vencido") {
    return {
      success: false,
      error: "CERTIFICADO EXPIRADO: El acceso a la hoja de vida de este vehículo está suspendido por vencimiento del certificado. Comunícate con el Administrador para renovarlo.",
      estadoCertificado: "Vencido"
    };
  }
  
  const mantenimientos = data.historial
    .filter(h => h.placa.trim().toUpperCase() === searchPlaca)
    .sort((a, b) => b.kilometraje - a.kilometraje);
  
  let currentKm = 0;
  mantenimientos.forEach(h => {
    if (h.kilometraje > currentKm) currentKm = h.kilometraje;
  });
  
  let penaltyAceite = 0;
  let penaltyCorrea = 0;
  let penaltyFrenos = 0;
  
  const now = new Date();
  
  let lastAceite: any = null;
  let lastCorrea: any = null;
  let lastFrenos: any = null;
  
  mantenimientos.forEach(h => {
    const work = h.trabajoRealizado.toLowerCase();
    const kmWork = h.kilometraje;
    // Adaptar parsing de fecha
    const parts = h.fecha.split(" ")[0].split("-");
    const dateWork = parts.length === 3 
      ? new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]))
      : new Date(h.fecha);
      
    if (!lastAceite && work.includes("aceite")) {
      lastAceite = { km: kmWork, date: dateWork };
    }
    if (!lastCorrea && (work.includes("correa") || work.includes("tiempo"))) {
      lastCorrea = { km: kmWork, date: dateWork };
    }
    if (!lastFrenos && (work.includes("frenos") || work.includes("pastilla") || work.includes("freno"))) {
      lastFrenos = { km: kmWork, date: dateWork };
    }
  });
  
  // Penalidad Aceite: > 7,500 km o 180 días
  if (lastAceite) {
    const diffKm = currentKm - lastAceite.km;
    const diffDays = Math.floor((now.getTime() - lastAceite.date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffKm > 7500 || diffDays > 180) penaltyAceite = 20;
  } else if (currentKm > 7500) {
    penaltyAceite = 20;
  }
  
  // Penalidad Correa: > 60,000 km o 1095 días (3 años)
  if (lastCorrea) {
    const diffKm = currentKm - lastCorrea.km;
    const diffDays = Math.floor((now.getTime() - lastCorrea.date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffKm > 60000 || diffDays > 1095) penaltyCorrea = 30;
  } else if (currentKm > 60000) {
    penaltyCorrea = 30;
  }
  
  // Penalidad Frenos: > 25,000 km o 365 días (1 año)
  if (lastFrenos) {
    const diffKm = currentKm - lastFrenos.km;
    const diffDays = Math.floor((now.getTime() - lastFrenos.date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffKm > 25000 || diffDays > 365) penaltyFrenos = 10;
  } else if (currentKm > 25000) {
    penaltyFrenos = 10;
  }
  
  const baseScore = vehiculo.score;
  const finalScore = Math.max(30, Math.min(100, baseScore - penaltyAceite - penaltyCorrea - penaltyFrenos));
  
  const vehiculoCopiado = { ...vehiculo, score: finalScore };
  
  const respuesta: any = {
    success: true,
    tipoCertificado: tipo,
    vehiculo: vehiculoCopiado,
    kilometrajeActual: currentKm,
    penalidades: {
      aceite: penaltyAceite,
      correa: penaltyCorrea,
      frenos: penaltyFrenos
    },
    diagnostico: {
      aceiteVencido: penaltyAceite > 0,
      correaVencido: penaltyCorrea > 0,
      frenosVencido: penaltyFrenos > 0
    }
  };
  
  if (tipo === "completo") {
    // Cruzar teléfonos de mecánicos para corroboración Wa.me
    const timeline = mantenimientos.map(h => {
      const mec = data.mecanicos.find(m => m.codigoMecanico === h.codigoMecanico);
      return {
        ...h,
        telefonoMecanico: mec ? mec.telefono : undefined
      };
    });
    respuesta.historial = timeline;
  }
  
  return respuesta;
}

// Registrar nuevo mantenimiento (POST)
export function simularPostMantenimiento(payload: {
  codigoMecanico: string;
  placa: string;
  kilometraje: number;
  trabajo: string;
}) {
  const data = getSimulatedData();
  const codMec = payload.codigoMecanico.trim();
  const placa = payload.placa.trim().toUpperCase();
  const km = Number(payload.kilometraje || 0);
  const trabajo = payload.trabajo.trim();
  
  if (!codMec || !placa || !km || !trabajo) {
    return { success: false, error: "Faltan datos requeridos para el registro" };
  }
  
  // 1. Validar mecánico
  const mecanico = data.mecanicos.find(m => m.codigoMecanico === codMec);
  if (!mecanico) {
    return { success: false, error: "Código de mecánico no registrado o inválido en AutoScore" };
  }
  
  // Bloquear por membresía suspendida
  if (mecanico.estado === "Suspendido") {
    return {
      success: false,
      error: `ACCESO DENEGADO: Tu cuenta de mecánico (${mecanico.nombre}) está SUSPENDIDA por falta de pago de membresía de AutoScore. Regulariza tu estado.`
    };
  }
  
  // 2. Validar que el carro existe en la DB
  let vehiculoIndex = data.vehiculos.findIndex(v => v.placa.toUpperCase() === placa);
  if (vehiculoIndex === -1) {
    // Auto-registrar sobre la marcha para facilitar la simulación multiplataforma
    const nuevoV: Vehiculo = {
      placa: placa,
      marca: "Toyota",
      modelo: "Corolla",
      anio: 2022,
      idDueno: "26123456", // Pedro Pérez
      score: 95,
      estadoCertificado: "Activo"
    };
    data.vehiculos.push(nuevoV);
    saveSimulatedData(data);
    vehiculoIndex = data.vehiculos.length - 1;
  }
  
  // 3. Crear registro de mantenimiento
  const newId = data.historial.length > 0 
    ? Math.max(...data.historial.map(h => h.idHistorial)) + 1 
    : 10001;
    
  const now = new Date();
  const fechaString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  
  const nuevoHistorial: HistorialRow = {
    idHistorial: newId,
    placa: placa,
    fecha: fechaString,
    kilometraje: km,
    codigoMecanico: codMec,
    taller: mecanico.taller || "Taller Independiente",
    trabajoRealizado: trabajo
  };
  
  data.historial.push(nuevoHistorial);
  saveSimulatedData(data);
  
  return {
    success: true,
    message: "¡Mantenimiento verificado registrado exitosamente!",
    data: {
      idHistorial: newId,
      placa: placa,
      fecha: fechaString,
      mecanico: mecanico.nombre,
      taller: mecanico.taller
    }
  };
}

// Registrar un carro nuevo
export function simularRegistrarVehiculo(vehiculo: Vehiculo) {
  const data = getSimulatedData();
  const placaUpper = vehiculo.placa.trim().toUpperCase();
  
  if (data.vehiculos.some(v => v.placa === placaUpper)) {
    return { success: false, error: "El vehículo con esta placa ya existe." };
  }
  
  const nuevo: Vehiculo = {
    ...vehiculo,
    placa: placaUpper,
    score: Number(vehiculo.score || 90),
    estadoCertificado: vehiculo.estadoCertificado || "Activo"
  };
  
  data.vehiculos.push(nuevo);
  saveSimulatedData(data);
  return { success: true, vehiculo: nuevo };
}

// Actualizaciones de Administrador
export function simularAdminUpdate(payload: {
  subAccion: string;
  targetId: string;
  nuevoEstado: string;
  nombre?: string;
  taller?: string;
  telefono?: string;
}) {
  const data = getSimulatedData();
  const { subAccion, targetId, nuevoEstado } = payload;
  
  if (subAccion === "actualizarUsuario") {
    const idx = data.usuarios.findIndex(u => u.idDueno.toLowerCase() === targetId.toLowerCase());
    if (idx !== -1) {
      data.usuarios[idx].estadoUsuario = nuevoEstado as any;
      saveSimulatedData(data);
      return { success: true, message: `Usuario actualizado correctamente a: ${nuevoEstado}` };
    }
    return { success: false, error: "Usuario no encontrado." };
  }
  
  if (subAccion === "actualizarMecanico") {
    const idx = data.mecanicos.findIndex(m => m.codigoMecanico.toUpperCase() === targetId.toUpperCase());
    if (idx !== -1) {
      data.mecanicos[idx].estado = nuevoEstado as any;
      saveSimulatedData(data);
      return { success: true, message: `Mecánico actualizado correctamente a: ${nuevoEstado}` };
    }
    return { success: false, error: "Mecánico no encontrado." };
  }
  
  if (subAccion === "actualizarVehiculo") {
    const idx = data.vehiculos.findIndex(v => v.placa.toUpperCase() === targetId.toUpperCase());
    if (idx !== -1) {
      data.vehiculos[idx].estadoCertificado = nuevoEstado as any;
      saveSimulatedData(data);
      return { success: true, message: `Certificado de vehículo actualizado a: ${nuevoEstado}` };
    }
    return { success: false, error: "Vehículo no encontrado." };
  }
  
  if (subAccion === "agregarMecanico") {
    if (data.mecanicos.some(m => m.codigoMecanico.toUpperCase() === targetId.toUpperCase())) {
      return { success: false, error: "Este código de mecánico ya existe." };
    }
    const nuevoMec: Mecanico = {
      codigoMecanico: targetId.toUpperCase(),
      nombre: payload.nombre || "Mecánico Registrado",
      taller: payload.taller || "Taller Oficial",
      estado: "Activo",
      telefono: payload.telefono || ""
    };
    data.mecanicos.push(nuevoMec);
    saveSimulatedData(data);
    return { success: true, message: "Mecánico registrado exitosamente en AutoScore." };
  }
  
  return { success: false, error: "Acción de administrador no reconocida." };
}
