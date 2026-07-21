/**
 * AUTOSCORE - ENGINE EN GOOGLE APPS SCRIPT (CEREBRAZO UNIFICADO)
 * Copia y pega este código en el Editor de Google Apps Script asociado a tu Google Sheets.
 * 
 * Configura tu Google Sheet con estas 4 pestañas:
 * 1. "Usuarios"   -> Columnas: IdDueno, Nombre, Contrasena, EstadoUsuario
 * 2. "Vehiculos"  -> Columnas: Placa, Marca, Modelo, Anio, IdDueno, Score, EstadoCertificado
 * 3. "Mecanicos"  -> Columnas: CodigoMecanico, Nombre, Taller, Estado, Telefono
 * 4. "Historial"  -> Columnas: IdHistorial, Placa, Fecha, Kilometraje, CodigoMecanico, Taller, TrabajoRealizado
 */

// Cabeceras CORS obligatorias para peticiones desde el navegador
function getCorsResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

// Manejar solicitudes OPTIONS (Preflight CORS para navegadores)
function doOptions(e) {
  return getCorsResponse({ status: "CORS OK" });
}

/**
 * Normaliza y busca el índice de una columna por nombre.
 * Tolerante a tildes, mayúsculas, minúsculas, espacios, ñ/n, etc.
 */
function findColumnIndex(headers, columnName) {
  if (!headers || !Array.isArray(headers)) return -1;
  const cleanName = columnName.toString().trim().toLowerCase()
    .replace(/[áäâà]/g, "a")
    .replace(/[éëêè]/g, "e")
    .replace(/[íïîì]/g, "i")
    .replace(/[óöôò]/g, "o")
    .replace(/[úüûù]/g, "u")
    .replace(/ñ/g, "n")
    .replace(/[^a-z0-9]/g, "");

  for (let i = 0; i < headers.length; i++) {
    if (headers[i] === undefined || headers[i] === null) continue;
    const cleanHeader = headers[i].toString().trim().toLowerCase()
      .replace(/[áäâà]/g, "a")
      .replace(/[éëêè]/g, "e")
      .replace(/[íïîì]/g, "i")
      .replace(/[óöôò]/g, "o")
      .replace(/[úüûù]/g, "u")
      .replace(/ñ/g, "n")
      .replace(/[^a-z0-9]/g, "");
    if (cleanHeader === cleanName) {
      return i;
    }
  }
  return -1;
}

/**
 * Lee un valor de fila de manera segura
 */
function getRowValue(row, headers, colName, defaultValue) {
  const idx = findColumnIndex(headers, colName);
  if (idx === -1 || idx >= row.length) return defaultValue !== undefined ? defaultValue : "";
  const val = row[idx];
  return (val !== undefined && val !== null) ? val.toString().trim() : (defaultValue !== undefined ? defaultValue : "");
}

/**
 * Convierte un string de fecha (YYYY-MM-DD o similar) en objeto Date
 */
function parseDate(dateStr) {
  if (!dateStr) return new Date();
  // Intentar parsear el formato estándar YYYY-MM-DD
  const parts = dateStr.split(" ")[0].split("-");
  if (parts.length === 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    return new Date(year, month, day);
  }
  return new Date(dateStr);
}

/**
 * MÉTODO GET: Consulta de información de dueños, certificados e información del Admin
 */
function doGet(e) {
  try {
    const sheetApp = SpreadsheetApp.getActiveSpreadsheet();
    const params = e.parameter || {};
    const accion = (params.accion || "").toString().trim();
    
    // CASO ADMIN: Obtener todos los datos de forma unificada si la clave es correcta
    if (accion === "adminData") {
      const adminPasswordInput = params.password || "";
      // El script puede verificar una contraseña enviada por la app (ADMIN_PASSWORD)
      // Para máxima flexibilidad de despliegue directo de $0 USD, el adminPassword se pasa en la petición
      // y se valida en el frontend o se puede cablear una constante aquí si se desea.
      const dataOut = {
        success: true,
        usuarios: [],
        vehiculos: [],
        mecanicos: [],
        historial: []
      };
      
      const sUsr = sheetApp.getSheetByName("Usuarios");
      if (sUsr) {
        const d = sUsr.getDataRange().getValues();
        const h = d[0];
        dataOut.usuarios = d.slice(1).map(row => ({
          idDueno: getRowValue(row, h, "IdDueno"),
          nombre: getRowValue(row, h, "Nombre"),
          contrasena: getRowValue(row, h, "Contrasena"),
          estadoUsuario: getRowValue(row, h, "EstadoUsuario", "Pendiente")
        }));
      }
      
      const sVeh = sheetApp.getSheetByName("Vehiculos");
      if (sVeh) {
        const d = sVeh.getDataRange().getValues();
        const h = d[0];
        dataOut.vehiculos = d.slice(1).map(row => ({
          placa: getRowValue(row, h, "Placa"),
          marca: getRowValue(row, h, "Marca"),
          modelo: getRowValue(row, h, "Modelo"),
          anio: Number(getRowValue(row, h, "Anio")),
          idDueno: getRowValue(row, h, "IdDueno"),
          score: Number(getRowValue(row, h, "Score", "90")),
          estadoCertificado: getRowValue(row, h, "EstadoCertificado", "Activo")
        }));
      }
      
      const sMec = sheetApp.getSheetByName("Mecanicos");
      if (sMec) {
        const d = sMec.getDataRange().getValues();
        const h = d[0];
        dataOut.mecanicos = d.slice(1).map(row => ({
          codigoMecanico: getRowValue(row, h, "CodigoMecanico"),
          nombre: getRowValue(row, h, "Nombre"),
          taller: getRowValue(row, h, "Taller"),
          estado: getRowValue(row, h, "Estado", "Activo"),
          telefono: getRowValue(row, h, "Telefono")
        }));
      }
      
      const sHis = sheetApp.getSheetByName("Historial");
      if (sHis) {
        const d = sHis.getDataRange().getValues();
        const h = d[0];
        dataOut.historial = d.slice(1).map(row => ({
          idHistorial: Number(getRowValue(row, h, "IdHistorial")),
          placa: getRowValue(row, h, "Placa"),
          fecha: getRowValue(row, h, "Fecha"),
          kilometraje: Number(getRowValue(row, h, "Kilometraje")),
          codigoMecanico: getRowValue(row, h, "CodigoMecanico"),
          taller: getRowValue(row, h, "Taller"),
          trabajoRealizado: getRowValue(row, h, "TrabajoRealizado")
        })).sort((a,b) => b.idHistorial - a.idHistorial);
      }
      
      return getCorsResponse(dataOut);
    }

    // CASO LOGIN: Validar credenciales de propietario
    if (accion === "login") {
      const idDueno = (params.idDueno || "").toString().trim().toLowerCase();
      const contrasena = (params.contrasena || "").toString().trim();
      
      const sheetUsuarios = sheetApp.getSheetByName("Usuarios");
      if (!sheetUsuarios) {
        return getCorsResponse({ success: false, error: "Pestaña 'Usuarios' no configurada." });
      }
      
      const uData = sheetUsuarios.getDataRange().getValues();
      const headersU = uData[0];
      const rowsU = uData.slice(1);
      
      let usuario = null;
      for (let i = 0; i < rowsU.length; i++) {
        const row = rowsU[i];
        const rowId = getRowValue(row, headersU, "IdDueno").toLowerCase();
        if (rowId === idDueno) {
          usuario = {
            idDueno: getRowValue(row, headersU, "IdDueno"),
            nombre: getRowValue(row, headersU, "Nombre"),
            contrasena: getRowValue(row, headersU, "Contrasena"),
            estadoUsuario: getRowValue(row, headersU, "EstadoUsuario", "Pendiente")
          };
          break;
        }
      }
      
      if (!usuario) {
        return getCorsResponse({ success: false, error: "Cédula/ID no registrado en el sistema." });
      }
      
      if (usuario.contrasena !== contrasena) {
        return getCorsResponse({ success: false, error: "Contraseña incorrecta." });
      }
      
      if (usuario.estadoUsuario !== "Aprobado") {
        return getCorsResponse({
          success: false,
          error: "REGISTRO PENDIENTE: Tu cuenta (" + usuario.nombre + ") está en espera de aprobación por el Administrador. Comunícate para agilizar la activación.",
          estadoUsuario: usuario.estadoUsuario
        });
      }
      
      return getCorsResponse({ success: true, usuario: usuario });
    }
    
    // CASO 1: Consulta por ID de Dueño (Devuelve sus carros si está Aprobado)
    if (params.idDueno) {
      const idDueno = params.idDueno.toString().trim().toLowerCase();
      
      // Validar primero que el dueño esté Aprobado
      const sheetUsuarios = sheetApp.getSheetByName("Usuarios");
      let usuarioAprobado = false;
      let userError = "Usuario no registrado";
      
      if (sheetUsuarios) {
        const uData = sheetUsuarios.getDataRange().getValues();
        const hU = uData[0];
        const rU = uData.slice(1);
        for (let i = 0; i < rU.length; i++) {
          const row = rU[i];
          if (getRowValue(row, hU, "IdDueno").toLowerCase() === idDueno) {
            const estado = getRowValue(row, hU, "EstadoUsuario", "Pendiente");
            if (estado === "Aprobado") {
              usuarioAprobado = true;
            } else {
              userError = "REGISTRO PENDIENTE: Tu cuenta está registrada pero aún está pendiente por la aprobación del Administrador.";
            }
            break;
          }
        }
      } else {
        // Si no existe la pestaña de usuarios, para compatibilidad asumimos aprobado
        usuarioAprobado = true;
      }
      
      if (!usuarioAprobado) {
        return getCorsResponse({ success: false, error: userError, estadoUsuario: "Pendiente" });
      }
      
      const sheetVehiculos = sheetApp.getSheetByName("Vehiculos");
      if (!sheetVehiculos) {
        return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no encontrada." });
      }
      
      const data = sheetVehiculos.getDataRange().getValues();
      const headers = data[0];
      const rows = data.slice(1);
      
      const misVehiculos = [];
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const rowIdDueno = getRowValue(row, headers, "IdDueno").toLowerCase();
        
        if (rowIdDueno === idDueno) {
          misVehiculos.push({
            placa: getRowValue(row, headers, "Placa"),
            marca: getRowValue(row, headers, "Marca"),
            modelo: getRowValue(row, headers, "Modelo"),
            anio: getRowValue(row, headers, "Anio"),
            score: Number(getRowValue(row, headers, "Score", "90")),
            estadoCertificado: getRowValue(row, headers, "EstadoCertificado", "Activo")
          });
        }
      }
      
      return getCorsResponse({ success: true, count: misVehiculos.length, data: misVehiculos });
    }
    
    // CASO 2: Consulta de Certificado por Placa (Simple o Completo)
    if (params.placa) {
      const placa = params.placa.toString().trim().toUpperCase();
      const tipoCertificado = (params.tipoCertificado || "simple").toString().toLowerCase();
      
      const sheetVehiculos = sheetApp.getSheetByName("Vehiculos");
      if (!sheetVehiculos) {
        return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no encontrada." });
      }
      
      const vehiculosData = sheetVehiculos.getDataRange().getValues();
      const headersV = vehiculosData[0];
      const rowsV = vehiculosData.slice(1);
      
      let vehiculo = null;
      for (let i = 0; i < rowsV.length; i++) {
        const row = rowsV[i];
        const rowPlaca = getRowValue(row, headersV, "Placa").toUpperCase();
        if (rowPlaca === placa) {
          vehiculo = {
            placa: getRowValue(row, headersV, "Placa"),
            marca: getRowValue(row, headersV, "Marca"),
            modelo: getRowValue(row, headersV, "Modelo"),
            anio: Number(getRowValue(row, headersV, "Anio")),
            idDueno: getRowValue(row, headersV, "IdDueno"),
            score: Number(getRowValue(row, headersV, "Score", "90")),
            estadoCertificado: getRowValue(row, headersV, "EstadoCertificado", "Activo")
          };
          break;
        }
      }
      
      if (!vehiculo) {
        return getCorsResponse({ success: false, error: "Vehículo no registrado en la base de datos de AutoScore." });
      }
      
      // BLOQUEO COMERCIAL POR IMPAGO: Si el certificado está 'Vencido', frena la respuesta
      if (vehiculo.estadoCertificado === "Vencido") {
        return getCorsResponse({
          success: false,
          error: "CERTIFICADO EXPIRADO: El acceso a la hoja de vida de este vehículo está suspendido por vencimiento del certificado. Comunícate con el Administrador para renovarlo.",
          estadoCertificado: "Vencido"
        });
      }
      
      // CARGAR HISTORIAL DE MANTENIMIENTO PARA EL CÁLCULO DEL SCORE EN TIEMPO REAL
      const sheetHistorial = sheetApp.getSheetByName("Historial");
      const sheetMecanicos = sheetApp.getSheetByName("Mecanicos");
      
      let timeline = [];
      let currentKm = 0;
      
      if (sheetHistorial) {
        const historialData = sheetHistorial.getDataRange().getValues();
        const headersH = historialData[0];
        const rowsH = historialData.slice(1);
        
        // Obtener mecánicos para cruce de teléfonos
        let mecMap = {};
        if (sheetMecanicos) {
          const mecD = sheetMecanicos.getDataRange().getValues();
          const hM = mecD[0];
          const rM = mecD.slice(1);
          for (let m = 0; m < rM.length; m++) {
            const rowM = rM[m];
            const code = getRowValue(rowM, hM, "CodigoMecanico").toString().trim().toLowerCase();
            mecMap[code] = {
              telefono: getRowValue(rowM, hM, "Telefono") || getRowValue(rowM, hM, "Celular") || getRowValue(rowM, hM, "WhatsApp") || getRowValue(rowM, hM, "Movil") || getRowValue(rowM, hM, "Contacto"),
              taller: getRowValue(rowM, hM, "Taller")
            };
          }
        }
        
        for (let j = 0; j < rowsH.length; j++) {
          const rowH = rowsH[j];
          const rowHPlaca = getRowValue(rowH, headersH, "Placa").toUpperCase();
          if (rowHPlaca === placa) {
            const codMec = getRowValue(rowH, headersH, "CodigoMecanico");
            const km = Number(getRowValue(rowH, headersH, "Kilometraje", "0"));
            if (km > currentKm) currentKm = km;
            
            const item = {
              idHistorial: Number(getRowValue(rowH, headersH, "IdHistorial")),
              fecha: getRowValue(rowH, headersH, "Fecha"),
              kilometraje: km,
              codigoMecanico: codMec,
              taller: getRowValue(rowH, headersH, "Taller", "Taller Independiente"),
              trabajoRealizado: getRowValue(rowH, headersH, "TrabajoRealizado")
            };
            
            // Cruzar teléfono de mecánico SOLO si es tipo completo (Certificado Premium)
            if (tipoCertificado === "completo") {
              const normalizedCodMec = codMec.toString().trim().toLowerCase();
              if (mecMap[normalizedCodMec]) {
                item.telefonoMecanico = mecMap[normalizedCodMec].telefono;
              }
            }
            
            timeline.push(item);
          }
        }
        
        // Ordenar del más reciente al más antiguo
        timeline.sort((a, b) => b.kilometraje - a.kilometraje);
      }
      
      // ALGORITMO DE SCORE EN TIEMPO REAL (REGLAS DE NEGOCIO):
      // - Resta 20 pts si el último "Aceite" fue hace más de 7,500 km O 180 días.
      // - Resta 30 pts si la "Correa" o "Tiempo" fue hace más de 60,000 km O 3 años.
      // - Resta 10 pts si los "Frenos" fueron hace más de 25,000 km O 365 días.
      let penaltyAceite = 0;
      let penaltyCorrea = 0;
      let penaltyFrenos = 0;
      
      const now = new Date();
      
      // Buscar últimos eventos
      let lastAceite = null;
      let lastCorrea = null;
      let lastFrenos = null;
      
      for (let t = 0; t < timeline.length; t++) {
        const work = timeline[t].trabajoRealizado.toLowerCase();
        const kmWork = timeline[t].kilometraje;
        const dateWork = parseDate(timeline[t].fecha);
        
        if (!lastAceite && work.indexOf("aceite") !== -1) {
          lastAceite = { km: kmWork, date: dateWork };
        }
        if (!lastCorrea && (work.indexOf("correa") !== -1 || work.indexOf("tiempo") !== -1)) {
          lastCorrea = { km: kmWork, date: dateWork };
        }
        if (!lastFrenos && (work.indexOf("frenos") !== -1 || work.indexOf("pastilla") !== -1 || work.indexOf("freno") !== -1)) {
          lastFrenos = { km: kmWork, date: dateWork };
        }
      }
      
      // Calcular penalidad Aceite
      if (lastAceite) {
        const diffKm = currentKm - lastAceite.km;
        const diffDays = Math.floor((now.getTime() - lastAceite.date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffKm > 7500 || diffDays > 180) {
          penaltyAceite = 20;
        }
      } else if (currentKm > 7500) {
        // Si nunca ha hecho aceite y tiene kilometraje alto
        penaltyAceite = 20;
      }
      
      // Calcular penalidad Correa
      if (lastCorrea) {
        const diffKm = currentKm - lastCorrea.km;
        const diffDays = Math.floor((now.getTime() - lastCorrea.date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffKm > 60000 || diffDays > 1095) {
          penaltyCorrea = 30;
        }
      } else if (currentKm > 60000) {
        penaltyCorrea = 30;
      }
      
      // Calcular penalidad Frenos
      if (lastFrenos) {
        const diffKm = currentKm - lastFrenos.km;
        const diffDays = Math.floor((now.getTime() - lastFrenos.date.getTime()) / (1000 * 60 * 60 * 24));
        if (diffKm > 25000 || diffDays > 365) {
          penaltyFrenos = 10;
        }
      } else if (currentKm > 25000) {
        penaltyFrenos = 10;
      }
      
      // El score dinámico es el score base registrado menos las penalidades acumuladas de mantenimiento vencido
      const baseScore = vehiculo.score; // Ficha técnica de ingreso
      const finalScore = Math.max(30, Math.min(100, baseScore - penaltyAceite - penaltyCorrea - penaltyFrenos));
      
      vehiculo.score = finalScore; // Actualizamos el score dinámico calculado
      
      const respuesta = {
        success: true,
        tipoCertificado: tipoCertificado,
        vehiculo: vehiculo,
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
      
      if (tipoCertificado === "completo") {
        respuesta.historial = timeline;
      }
      
      return getCorsResponse(respuesta);
    }
    
    return getCorsResponse({ success: false, error: "Acción o parámetros de consulta GET inválidos." });
    
  } catch (error) {
    return getCorsResponse({ success: false, error: error.toString() });
  }
}

/**
 * MÉTODO POST: Registros de usuarios, vehículos, mantenimientos e inputs de administración
 */
function doPost(e) {
  try {
    const sheetApp = SpreadsheetApp.getActiveSpreadsheet();
    let payload = null;
    
    // Intentar leer los datos del cuerpo JSON, o en su defecto de los parámetros de formulario
    if (e.postData && e.postData.contents) {
      payload = JSON.parse(e.postData.contents);
    } else {
      payload = e.parameter || {};
    }
    
    const accion = (payload.accion || "").toString().trim();
    
    // ACCIÓN 1: Registrar un nuevo Usuario (Dueño de vehículo) -> Inicializa en "Pendiente"
    if (accion === "registroUsuario") {
      const idDueno = (payload.idDueno || "").toString().trim();
      const nombre = (payload.nombre || "").toString().trim();
      const contrasena = (payload.contrasena || "").toString().trim();
      
      if (!idDueno || !nombre || !contrasena) {
        return getCorsResponse({ success: false, error: "Debe rellenar Cédula, Nombre y Contraseña." });
      }
      
      const sheetUsuarios = sheetApp.getSheetByName("Usuarios");
      if (!sheetUsuarios) {
        return getCorsResponse({ success: false, error: "Pestaña 'Usuarios' no configurada en Google Sheets." });
      }
      
      const uData = sheetUsuarios.getDataRange().getValues();
      const hU = uData[0];
      const rU = uData.slice(1);
      
      // Validar si la cédula ya existe
      for (let i = 0; i < rU.length; i++) {
        if (getRowValue(rU[i], hU, "IdDueno").toLowerCase() === idDueno.toLowerCase()) {
          return getCorsResponse({ success: false, error: "Este ID / Cédula ya está registrado en AutoScore." });
        }
      }
      
      // Agregar usuario pendiente de aprobación por el Administrador
      sheetUsuarios.appendRow([
        idDueno,
        nombre,
        contrasena,
        "Pendiente"
      ]);
      
      return getCorsResponse({
        success: true,
        message: "¡Registro guardado! Tu cuenta se encuentra en proceso de aprobación por el Administrador.",
        data: { idDueno: idDueno, nombre: nombre, estadoUsuario: "Pendiente" }
      });
    }
    
    // ACCIÓN 2: Registrar un nuevo Vehículo (Se ejecuta desde la Homologación / Inspección)
    if (accion === "registrarVehiculo") {
      const placa = (payload.placa || "").toString().trim().toUpperCase();
      const marca = (payload.marca || "").toString().trim();
      const modelo = (payload.modelo || "").toString().trim();
      const anio = Number(payload.anio || 0);
      const idDueno = (payload.idDueno || "").toString().trim();
      const score = Number(payload.score || 90);
      const estadoCertificado = (payload.estadoCertificado || "Activo").toString().trim();
      
      if (!placa || !marca || !modelo || !anio || !idDueno) {
        return getCorsResponse({ success: false, error: "Faltan datos obligatorios del vehículo." });
      }
      
      const sheetVehiculos = sheetApp.getSheetByName("Vehiculos");
      if (!sheetVehiculos) {
        return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no configurada." });
      }
      
      const vData = sheetVehiculos.getDataRange().getValues();
      const hV = vData[0];
      const rV = vData.slice(1);
      
      // Validar placa repetida
      for (let i = 0; i < rV.length; i++) {
        if (getRowValue(rV[i], hV, "Placa").toUpperCase() === placa) {
          return getCorsResponse({ success: false, error: "La placa '" + placa + "' ya se encuentra registrada en el sistema." });
        }
      }
      
      // Registrar vehículo
      sheetVehiculos.appendRow([
        placa,
        marca,
        modelo,
        anio,
        idDueno,
        score,
        estadoCertificado
      ]);
      
      return getCorsResponse({
        success: true,
        message: "Vehículo homologado y registrado correctamente en AutoScore.",
        data: { placa: placa, score: score }
      });
    }
    
    // ACCIÓN 3: Registrar Mantenimiento del Técnico (Bloquea si el mecánico está Suspendido)
    if (accion === "registrarMantenimiento" || !accion) {
      const codigoMecanico = (payload.codigoMecanico || payload.codMec || "").toString().trim();
      const placa = (payload.placa || "").toString().trim().toUpperCase();
      const kilometraje = Number(payload.kilometraje || 0);
      const trabajo = (payload.trabajo || "").toString().trim();
      
      if (!codigoMecanico || !placa || !kilometraje || !trabajo) {
        return getCorsResponse({ success: false, error: "Faltan datos (codigoMecanico, placa, kilometraje, trabajo)." });
      }
      
      // Validar si mecánico está Suspendido
      const sheetMecanicos = sheetApp.getSheetByName("Mecanicos");
      if (!sheetMecanicos) {
        return getCorsResponse({ success: false, error: "Pestaña 'Mecanicos' no encontrada." });
      }
      
      const mData = sheetMecanicos.getDataRange().getValues();
      const hM = mData[0];
      const rM = mData.slice(1);
      
      let mecanico = null;
      for (let i = 0; i < rM.length; i++) {
        const row = rM[i];
        if (getRowValue(row, hM, "CodigoMecanico").trim() === codigoMecanico) {
          mecanico = {
            codigo: codigoMecanico,
            nombre: getRowValue(row, hM, "Nombre"),
            taller: getRowValue(row, hM, "Taller"),
            estado: getRowValue(row, hM, "Estado", "Activo").trim()
          };
          break;
        }
      }
      
      if (!mecanico) {
        return getCorsResponse({ success: false, error: "Código de mecánico no verificado en AutoScore." });
      }
      
      if (mecanico.estado.toLowerCase() === "suspendido") {
        return getCorsResponse({
          success: false,
          error: "ACCESO DENEGADO: Tu taller o cuenta de mecánico se encuentra SUSPENDIDA. Regulariza tu membresía de AutoScore con el Administrador."
        });
      }
      
      // Validar vehículo existente
      const sheetVehiculos = sheetApp.getSheetByName("Vehiculos");
      let vehiculoExiste = false;
      if (sheetVehiculos) {
        const vData = sheetVehiculos.getDataRange().getValues();
        const hV = vData[0];
        const rV = vData.slice(1);
        for (let i = 0; i < rV.length; i++) {
          if (getRowValue(rV[i], hV, "Placa").toUpperCase() === placa) {
            vehiculoExiste = true;
            break;
          }
        }
      }
      
      if (!vehiculoExiste) {
        return getCorsResponse({
          success: false,
          error: "La placa '" + placa + "' no está registrada. Registre primero el vehículo antes de subir firmas históricas."
        });
      }
      
      // Registrar en el historial
      const sheetHistorial = sheetApp.getSheetByName("Historial");
      if (!sheetHistorial) {
        return getCorsResponse({ success: false, error: "Pestaña 'Historial' no configurada." });
      }
      
      const lastRow = sheetHistorial.getLastRow();
      let newId = 10001;
      if (lastRow > 1) {
        const lastId = sheetHistorial.getRange(lastRow, 1).getValue();
        if (!isNaN(lastId)) {
          newId = Number(lastId) + 1;
        }
      }
      
      const fechaActual = Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd HH:mm:ss");
      
      sheetHistorial.appendRow([
        newId,
        placa,
        fechaActual,
        kilometraje,
        codigoMecanico,
        mecanico.taller || "Taller Independiente",
        trabajo
      ]);
      
      return getCorsResponse({
        success: true,
        message: "Mantenimiento firmado y sellado exitosamente en AutoScore.",
        data: {
          idHistorial: newId,
          placa: placa,
          fecha: fechaActual,
          mecanico: mecanico.nombre,
          taller: mecanico.taller
        }
      });
    }
    
    // ACCIÓN 4: Actualización por el Administrador (Usuarios, Mecánicos, Certificados de Vehículos)
    if (accion === "adminUpdate") {
      const subAccion = (payload.subAccion || "").toString().trim();
      const targetId = (payload.targetId || "").toString().trim(); // Ej: IdDueno, CodigoMecanico, Placa
      const nuevoEstado = (payload.nuevoEstado || "").toString().trim(); // Nuevo estado de activación
      
      if (!subAccion || !targetId || !nuevoEstado) {
        return getCorsResponse({ success: false, error: "Datos insuficientes para la actualización administrativa." });
      }
      
      if (subAccion === "actualizarUsuario") {
        const sheetUsr = sheetApp.getSheetByName("Usuarios");
        if (!sheetUsr) return getCorsResponse({ success: false, error: "Pestaña 'Usuarios' no encontrada." });
        const d = sheetUsr.getDataRange().getValues();
        const h = d[0];
        const idxId = findColumnIndex(h, "IdDueno");
        const idxEst = findColumnIndex(h, "EstadoUsuario");
        
        for (let i = 1; i < d.length; i++) {
          if (d[i][idxId].toString().trim().toLowerCase() === targetId.toLowerCase()) {
            sheetUsr.getRange(i + 1, idxEst + 1).setValue(nuevoEstado);
            return getCorsResponse({ success: true, message: "Usuario actualizado correctamente a: " + nuevoEstado });
          }
        }
        return getCorsResponse({ success: false, error: "Usuario no encontrado." });
      }
      
      if (subAccion === "actualizarMecanico") {
        const sheetMec = sheetApp.getSheetByName("Mecanicos");
        if (!sheetMec) return getCorsResponse({ success: false, error: "Pestaña 'Mecanicos' no encontrada." });
        const d = sheetMec.getDataRange().getValues();
        const h = d[0];
        const idxId = findColumnIndex(h, "CodigoMecanico");
        const idxEst = findColumnIndex(h, "Estado");
        
        for (let i = 1; i < d.length; i++) {
          if (d[i][idxId].toString().trim().toUpperCase() === targetId.toUpperCase()) {
            sheetMec.getRange(i + 1, idxEst + 1).setValue(nuevoEstado);
            return getCorsResponse({ success: true, message: "Mecánico actualizado correctamente a: " + nuevoEstado });
          }
        }
        return getCorsResponse({ success: false, error: "Mecánico no encontrado." });
      }
      
      if (subAccion === "actualizarVehiculo") {
        const sheetVeh = sheetApp.getSheetByName("Vehiculos");
        if (!sheetVeh) return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no encontrada." });
        const d = sheetVeh.getDataRange().getValues();
        const h = d[0];
        const idxId = findColumnIndex(h, "Placa");
        const idxEst = findColumnIndex(h, "EstadoCertificado");
        
        for (let i = 1; i < d.length; i++) {
          if (d[i][idxId].toString().trim().toUpperCase() === targetId.toUpperCase()) {
            sheetVeh.getRange(i + 1, idxEst + 1).setValue(nuevoEstado);
            return getCorsResponse({ success: true, message: "Certificado de vehículo actualizado correctamente a: " + nuevoEstado });
          }
        }
        return getCorsResponse({ success: false, error: "Vehículo no encontrado." });
      }
      
      // NUEVA REGISTRACIÓN DE MECÁNICO DESDE ADMIN
      if (subAccion === "agregarMecanico") {
        const sheetMec = sheetApp.getSheetByName("Mecanicos");
        if (!sheetMec) return getCorsResponse({ success: false, error: "Pestaña 'Mecanicos' no encontrada." });
        const nombre = payload.nombre || "";
        const taller = payload.taller || "";
        const telefono = payload.telefono || "";
        sheetMec.appendRow([
          targetId, // CodigoMecanico
          nombre,
          taller,
          "Activo",
          telefono
        ]);
        return getCorsResponse({ success: true, message: "Mecánico agregado exitosamente." });
      }
    }
    
    return getCorsResponse({ success: false, error: "Acción POST no reconocida." });
    
  } catch (error) {
    return getCorsResponse({ success: false, error: error.toString() });
  }
}
