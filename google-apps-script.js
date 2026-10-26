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
 * Auto-detecta si una columna existe en la fila 1 (cabeceras).
 * Si no existe, la crea automáticamente en la siguiente columna disponible.
 * Retorna el índice (0-based) de la columna.
 */
function ensureColumnHeader(sheet, columnName) {
  if (!sheet) return -1;
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1).setValue(columnName);
    return 0;
  }
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const idx = findColumnIndex(headers, columnName);
  if (idx !== -1) {
    return idx;
  }
  // Auto-crear en la primera fila la columna faltante
  const newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue(columnName);
  return newCol - 1;
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
 * Sanitiza textos públicos (comentarios, trabajos, observaciones)
 * eliminando códigos de acceso privado de mecánicos y talleres.
 */
function sanitizarTextoPrivado(texto, codigos) {
  if (!texto) return "";
  var limpio = texto.toString();
  limpio = limpio.replace(/Realizado por:\s*([^\(\n\r]+?)\s*\([^\)]*?\)/gi, "Realizado por: $1");
  limpio = limpio.replace(/\|\s*Reg:\s*[^|\n]+\s*\|/gi, "| Acreditación Homologada |");
  limpio = limpio.replace(/Reg:\s*[A-Za-z0-9_\-]+/gi, "Acreditación Homologada");
  limpio = limpio.replace(/(?:c[oó]digo(?:\s+de\s+(?:acceso|mec[aá]nico|taller))?|clave(?:\s+de\s+acceso)?|id\s+mec[aá]nico)\s*[:#=\-]?\s*[A-Za-z0-9_\-]+/gi, "");
  if (codigos && Array.isArray(codigos)) {
    for (var i = 0; i < codigos.length; i++) {
      var c = codigos[i];
      if (c && typeof c === "string" && c.trim().length >= 2) {
        var esc = c.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        limpio = limpio.replace(new RegExp('\\(\\s*' + esc + '\\s*\\)', 'gi'), '');
        limpio = limpio.replace(new RegExp('#' + esc + '\\b', 'gi'), '');
        limpio = limpio.replace(new RegExp('\\b' + esc + '\\b', 'gi'), '');
      }
    }
  }
  return limpio.replace(/\(\s*\)/g, "").replace(/[ \t]+/g, " ").replace(/\n\s*\n/g, "\n").trim();
}

/**
 * MÉTODO GET: Consulta de información de dueños, certificados e información del Admin
 */
function doGet(e) {
  try {
    const sheetApp = SpreadsheetApp.getActiveSpreadsheet();
    const params = e.parameter || {};
    const accion = (params.accion || "").toString().trim();
    
    // CASO ADMIN / DIRECTORIO: Obtener datos oficiales o directorio de reputación técnica de talleres
    if (accion === "adminData" || accion === "directorioMecanicos" || accion === "reputacionTalleres") {
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
      
      const sHis = sheetApp.getSheetByName("Historial");
      const statsMecanicos = {};

      if (sHis) {
        const d = sHis.getDataRange().getValues();
        const h = d[0];
        
        // Recopilar evaluaciones por código de mecánico
        for (let i = 1; i < d.length; i++) {
          const cod = getRowValue(d[i], h, "CodigoMecanico").toUpperCase();
          const ev = getRowValue(d[i], h, "Evaluacion").toLowerCase();
          if (cod) {
            if (!statsMecanicos[cod]) statsMecanicos[cod] = { pos: 0, neg: 0, total: 0 };
            statsMecanicos[cod].total++;
            if (ev === "bueno" || ev.indexOf("positiv") !== -1 || ev === "1") {
              statsMecanicos[cod].pos++;
            } else if (ev === "malo" || ev.indexOf("negativ") !== -1 || ev === "0") {
              statsMecanicos[cod].neg++;
            }
          }
        }

        dataOut.historial = d.slice(1).map(row => {
          const codMec = getRowValue(row, h, "CodigoMecanico");
          const trabOriginal = getRowValue(row, h, "TrabajoRealizado");
          const comOriginal = getRowValue(row, h, "ComentarioEvaluacion");
          return {
            idHistorial: Number(getRowValue(row, h, "IdHistorial")),
            placa: getRowValue(row, h, "Placa"),
            fecha: getRowValue(row, h, "Fecha"),
            kilometraje: Number(getRowValue(row, h, "Kilometraje")),
            codigoMecanico: codMec,
            taller: getRowValue(row, h, "Taller"),
            trabajoRealizado: sanitizarTextoPrivado(trabOriginal, [codMec]),
            evaluacion: getRowValue(row, h, "Evaluacion"),
            comentarioEvaluacion: sanitizarTextoPrivado(comOriginal, [codMec]),
            fechaEvaluacion: getRowValue(row, h, "FechaEvaluacion")
          };
        }).sort((a,b) => b.idHistorial - a.idHistorial);
      }

      const sMec = sheetApp.getSheetByName("Mecanicos");
      if (sMec) {
        const d = sMec.getDataRange().getValues();
        const h = d[0];
        dataOut.mecanicos = d.slice(1).map(row => {
          const cod = getRowValue(row, h, "CodigoMecanico").toUpperCase();
          const st = statsMecanicos[cod] || { pos: 0, neg: 0, total: 0 };
          const totalVal = st.pos + st.neg;
          const pct = totalVal > 0 ? Math.round((st.pos / totalVal) * 100) : 100;
          return {
            codigoMecanico: getRowValue(row, h, "CodigoMecanico"),
            nombre: getRowValue(row, h, "Nombre"),
            taller: getRowValue(row, h, "Taller"),
            estado: getRowValue(row, h, "Estado", "Activo"),
            telefono: getRowValue(row, h, "Telefono"),
            totalPositivas: st.pos,
            totalNegativas: st.neg,
            totalServicios: st.total,
            porcentajeCalidad: pct
          };
        });
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
      
      // REGLA COMERCIAL: Si el certificado está 'Vencido' y la consulta es para visualización de usuario simple (no mecánico con tipoCertificado=completo),
      // solo se permite visualización simple en la app sin auditoría VIP
      if (vehiculo.estadoCertificado === "Vencido" && tipoCertificado !== "completo") {
        return getCorsResponse({
          success: true,
          tipoCertificado: "simple",
          vehiculo: vehiculo,
          historial: [],
          esVencido: true,
          advertencia: "CERTIFICADO VENCIDO: Solo visualización simple en la app permitida. Descargas, compartir y auditoría VIP inhabilitadas hasta su renovación."
        });
      }
      
      // CARGAR HISTORIAL DE MANTENIMIENTO PARA EL CÁLCULO DEL SCORE EN TIEMPO REAL
      const sheetHistorial = sheetApp.getSheetByName("Historial");
      const sheetMecanicos = sheetApp.getSheetByName("Mecanicos");
      
      let timeline = [];
      let currentKm = 0;
      
      // === COMIENZO DEL PARCHE DE TRAZABILIDAD REFORZADO ===
      if (sheetHistorial && sheetMecanicos) {
        const historialData = sheetHistorial.getDataRange().getValues();
        const headersH = historialData[0];
        const rowsH = historialData.slice(1);
        
        const mecanicosData = sheetMecanicos.getDataRange().getValues();
        const headersM = mecanicosData[0]; // Fila estricta de títulos
        const rowsM = mecanicosData.slice(1);
        
        // Rastreador manual tolerante a mayúsculas, minúsculas y acentos
        let colCod = -1;
        let colTel = -1;
        for (let c = 0; c < headersM.length; c++) {
          const nombreCol = headersM[c].toString().trim().toLowerCase();
          if (nombreCol === "codigomecanico" || nombreCol === "códigomecánico") colCod = c;
          if (nombreCol === "telefono" || nombreCol === "teléfono" || nombreCol === "tel") colTel = c;
        }
        
        // Respaldo de seguridad por si acaso
        if (colCod === -1) colCod = 0;
        if (colTel === -1) colTel = 4; // Columna E por defecto
        
        // Construir el directorio en memoria de forma segura
        const directorioMecanicos = {};
        for (let k = 0; k < rowsM.length; k++) {
          const rowM = rowsM[k];
          const codMec = rowM[colCod] !== undefined && rowM[colCod] !== null ? rowM[colCod].toString().trim() : "";
          const telMec = rowM[colTel] !== undefined && rowM[colTel] !== null ? rowM[colTel].toString().trim() : "";
          if (codMec) {
            directorioMecanicos[codMec] = telMec;
            directorioMecanicos[codMec.toLowerCase()] = telMec; // Soporte adicional para búsqueda insensible a mayúsculas/minúsculas
          }
        }
        
        // Procesar el historial inyectando el teléfono cruzado con respaldo robusto de cabeceras
        let hPlaca = headersH.indexOf("Placa");
        if (hPlaca === -1) hPlaca = findColumnIndex(headersH, "Placa");
        if (hPlaca === -1) hPlaca = 1; // Columna B por defecto
        
        let hId = headersH.indexOf("IdHistorial");
        if (hId === -1) hId = findColumnIndex(headersH, "IdHistorial");
        if (hId === -1) hId = 0; // Columna A por defecto
        
        let hFecha = headersH.indexOf("Fecha");
        if (hFecha === -1) hFecha = findColumnIndex(headersH, "Fecha");
        if (hFecha === -1) hFecha = 2; // Columna C por defecto
        
        let hKm = headersH.indexOf("Kilometraje");
        if (hKm === -1) hKm = findColumnIndex(headersH, "Kilometraje");
        if (hKm === -1) hKm = 3; // Columna D por defecto
        
        let hCodMec = headersH.indexOf("CodigoMecanico");
        if (hCodMec === -1) hCodMec = findColumnIndex(headersH, "CodigoMecanico");
        if (hCodMec === -1) hCodMec = 4; // Columna E por defecto
        
        let hTaller = headersH.indexOf("Taller");
        if (hTaller === -1) hTaller = findColumnIndex(headersH, "Taller");
        if (hTaller === -1) hTaller = 5; // Columna F por defecto
        
        let hTrabajo = headersH.indexOf("TrabajoRealizado");
        if (hTrabajo === -1) hTrabajo = findColumnIndex(headersH, "TrabajoRealizado");
        if (hTrabajo === -1) hTrabajo = 6; // Columna G por defecto

        let hEval = findColumnIndex(headersH, "Evaluacion");
        let hComEval = findColumnIndex(headersH, "ComentarioEvaluacion");
        let hFechaEval = findColumnIndex(headersH, "FechaEvaluacion");
        
        for (let j = 0; j < rowsH.length; j++) {
          const row = rowsH[j];
          const valPlaca = hPlaca !== -1 && row[hPlaca] !== undefined ? row[hPlaca].toString().trim().toUpperCase() : "";
          if (valPlaca === placa) {
            const codigoFirma = hCodMec !== -1 && row[hCodMec] !== undefined ? row[hCodMec].toString().trim() : "";
            const telDelTaller = directorioMecanicos[codigoFirma] || directorioMecanicos[codigoFirma.toLowerCase()] || "";
            
            const km = hKm !== -1 && row[hKm] !== undefined ? Number(row[hKm] || 0) : 0;
            if (km > currentKm) currentKm = km;
            
            // Formatear fecha de forma ultra-segura
            let rawFecha = hFecha !== -1 && row[hFecha] !== undefined ? row[hFecha] : "";
            let formattedFecha = "";
            if (rawFecha instanceof Date) {
              formattedFecha = Utilities.formatDate(rawFecha, "GMT-4", "dd/MM/yyyy");
            } else if (rawFecha) {
              try {
                const strDate = rawFecha.toString().trim();
                if (/^\d{2}\/\d{2}\/\d{4}$/.test(strDate)) {
                  formattedFecha = strDate;
                } else {
                  formattedFecha = Utilities.formatDate(new Date(strDate), "GMT-4", "dd/MM/yyyy");
                }
              } catch (e) {
                formattedFecha = String(rawFecha).split(" ")[0];
              }
            } else {
              formattedFecha = Utilities.formatDate(new Date(), "GMT-4", "dd/MM/yyyy");
            }

            const evalVal = hEval !== -1 && row[hEval] !== undefined ? row[hEval].toString().trim() : "";
            const comVal = hComEval !== -1 && row[hComEval] !== undefined ? row[hComEval].toString().trim() : "";
            const fechaEvalVal = hFechaEval !== -1 && row[hFechaEval] !== undefined ? row[hFechaEval].toString().trim() : "";
            
            const strTrabajo = hTrabajo !== -1 && row[hTrabajo] !== undefined ? row[hTrabajo].toString().trim() : "";
            let tipoRegVal = "";
            const hTipoReg = findColumnIndex(headersH, "TipoRegistro");
            if (hTipoReg !== -1 && row[hTipoReg] !== undefined && row[hTipoReg]) {
              tipoRegVal = row[hTipoReg].toString().trim();
            }
            if (!tipoRegVal) {
              if (strTrabajo.indexOf("INSPECCIÓN TÉCNICA") !== -1 || 
                  strTrabajo.indexOf("INSPECCION TECNICA") !== -1 || 
                  strTrabajo.indexOf("RE-INSPECCIÓN TÉCNICA") !== -1 || 
                  strTrabajo.indexOf("RE-INSPECCION TECNICA") !== -1 ||
                  strTrabajo.indexOf("CERTIFICACIÓN DE INSPECCIÓN") !== -1) {
                tipoRegVal = "Inspección Técnica";
              } else {
                tipoRegVal = "Reparación";
              }
            }
            
            timeline.push({
              idHistorial: hId !== -1 && row[hId] !== undefined ? Number(row[hId]) : j,
              fecha: formattedFecha,
              kilometraje: km,
              codigoMecanico: codigoFirma,
              taller: (hTaller !== -1 && row[hTaller] !== undefined && row[hTaller]) ? row[hTaller].toString().trim() : "Taller Autorizado",
              trabajoRealizado: strTrabajo,
              tipoRegistro: tipoRegVal,
              telefonoMecanico: telDelTaller,
              evaluacion: evalVal,
              comentarioEvaluacion: comVal,
              fechaEvaluacion: fechaEvalVal
            });
          }
        }
        
        // Ordenar del más reciente al más antiguo
        timeline.sort((a, b) => b.kilometraje - a.kilometraje);
      }
      // === FIN DEL PARCHE ===
      
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
      
      // El score registrado en la base de datos (pestaña 'Vehiculos') es la fuente de verdad directa
      const baseScore = vehiculo.score; // Score registrado en la hoja de cálculo
      const finalScore = Math.max(30, Math.min(100, (baseScore || 90) - penaltyAceite - penaltyCorrea - penaltyFrenos));
      
      // Respetar prioritariamente el Score guardado en la base de datos
      if (!isNaN(baseScore) && baseScore > 0) {
        vehiculo.score = baseScore;
      } else {
        vehiculo.score = finalScore;
      }
      vehiculo.scoreBase = baseScore;
      vehiculo.scoreCalculado = finalScore;
      
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
      
      // Siempre incluimos el historial de mantenimiento en la respuesta para garantizar que el teléfono del mecánico y toda la trazabilidad técnica estén siempre disponibles en el frontend
      respuesta.historial = timeline;
      
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
      
      // Validar si la placa ya existe
      let filaExistente = -1;
      for (let i = 0; i < rV.length; i++) {
        if (getRowValue(rV[i], hV, "Placa").toUpperCase() === placa) {
          filaExistente = i + 2; // Fila 1 es cabecera
          break;
        }
      }

      // Si ya existe y se trata de una Re-Inspección
      if (filaExistente !== -1) {
        if (payload.esReinspeccion) {
          const idxScore = findColumnIndex(hV, "Score");
          const idxEstado = findColumnIndex(hV, "EstadoCertificado");
          if (idxScore !== -1) {
            sheetVehiculos.getRange(filaExistente, idxScore + 1).setValue(score);
          }
          if (idxEstado !== -1) {
            sheetVehiculos.getRange(filaExistente, idxEstado + 1).setValue(estadoCertificado || "Activo");
          }
          return getCorsResponse({
            success: true,
            message: "Vehículo re-inspeccionado y Score actualizado correctamente a " + score + " pts.",
            data: { placa: placa, score: score, esReinspeccion: true }
          });
        }
        return getCorsResponse({ success: false, error: "La placa '" + placa + "' ya se encuentra registrada en el sistema. Utilice el modo Re-Inspección Técnica para actualizar su score." });
      }
      
      // Registrar nuevo vehículo
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

    // ACCIÓN NUEVA: Re-Inspección Técnica por Mejoras (Actualiza Score en 'Vehiculos' y emite firma en 'Historial')
    if (accion === "reinspeccionarVehiculo") {
      const placa = (payload.placa || "").toString().trim().toUpperCase();
      const score = Number(payload.score || 90);
      const codigoMecanico = (payload.codigoMecanico || payload.codMec || "").toString().trim();
      const kilometraje = Number(payload.kilometraje || 0);
      const trabajo = (payload.trabajo || "").toString().trim();
      const estadoCertificado = (payload.estadoCertificado || "Activo").toString().trim();
      
      if (!placa || !codigoMecanico || !trabajo) {
        return getCorsResponse({ success: false, error: "Faltan datos obligatorios para la re-inspección (placa, mecánico, trabajo)." });
      }
      
      // 1. Validar mecánico y suspensión
      const sheetMecanicos = sheetApp.getSheetByName("Mecanicos");
      let mecanico = null;
      if (sheetMecanicos) {
        const mData = sheetMecanicos.getDataRange().getValues();
        const hM = mData[0];
        const rM = mData.slice(1);
        for (let i = 0; i < rM.length; i++) {
          if (getRowValue(rM[i], hM, "CodigoMecanico").trim() === codigoMecanico) {
            mecanico = {
              codigo: codigoMecanico,
              nombre: getRowValue(rM[i], hM, "Nombre"),
              taller: getRowValue(rM[i], hM, "Taller"),
              estado: getRowValue(rM[i], hM, "Estado", "Activo").trim()
            };
            break;
          }
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
      
      // 2. Buscar y actualizar vehículo en hoja 'Vehiculos'
      const sheetVehiculos = sheetApp.getSheetByName("Vehiculos");
      if (!sheetVehiculos) {
        return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no configurada." });
      }
      
      const vData = sheetVehiculos.getDataRange().getValues();
      const hV = vData[0];
      const idxPlaca = findColumnIndex(hV, "Placa");
      const idxScore = findColumnIndex(hV, "Score");
      const idxEstado = findColumnIndex(hV, "EstadoCertificado");
      
      let vehiculoEncontradoFila = -1;
      for (let i = 1; i < vData.length; i++) {
        if (vData[i][idxPlaca].toString().trim().toUpperCase() === placa) {
          vehiculoEncontradoFila = i + 1; // 1-based index para getRange
          break;
        }
      }
      
      if (vehiculoEncontradoFila === -1) {
        return getCorsResponse({ success: false, error: "El vehículo con placa '" + placa + "' no existe. Debe realizar una Inspección de Ingreso primero." });
      }
      
      // Actualizar Score en la hoja
      if (idxScore !== -1) {
        sheetVehiculos.getRange(vehiculoEncontradoFila, idxScore + 1).setValue(score);
      }
      
      // Reactivar certificado
      if (idxEstado !== -1) {
        sheetVehiculos.getRange(vehiculoEncontradoFila, idxEstado + 1).setValue(estadoCertificado || "Activo");
      }
      
      // 3. Registrar constancia de re-inspección en el Historial
      const sheetHistorial = sheetApp.getSheetByName("Historial");
      let newId = 10001;
      if (sheetHistorial) {
        const lastRow = sheetHistorial.getLastRow();
        if (lastRow > 1) {
          const lastId = sheetHistorial.getRange(lastRow, 1).getValue();
          if (!isNaN(lastId)) {
            newId = Number(lastId) + 1;
          }
        }
        const fechaActual = Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd HH:mm:ss");
        
        // Auto-crear cabecera 'TipoRegistro' en Historial si no existe
        ensureColumnHeader(sheetHistorial, "TipoRegistro");
        const hData = sheetHistorial.getDataRange().getValues();
        const hH = hData[0];
        const newRow = new Array(hH.length).fill("");
        const colId = findColumnIndex(hH, "IdHistorial");
        const colPla = findColumnIndex(hH, "Placa");
        const colFec = findColumnIndex(hH, "Fecha");
        const colKm = findColumnIndex(hH, "Kilometraje");
        const colCod = findColumnIndex(hH, "CodigoMecanico");
        const colTal = findColumnIndex(hH, "Taller");
        const colTra = findColumnIndex(hH, "TrabajoRealizado");
        const colTipo = findColumnIndex(hH, "TipoRegistro");

        if (colId !== -1) newRow[colId] = newId; else newRow[0] = newId;
        if (colPla !== -1) newRow[colPla] = placa; else newRow[1] = placa;
        if (colFec !== -1) newRow[colFec] = fechaActual; else newRow[2] = fechaActual;
        if (colKm !== -1) newRow[colKm] = kilometraje; else newRow[3] = kilometraje;
        if (colCod !== -1) newRow[colCod] = codigoMecanico; else newRow[4] = codigoMecanico;
        if (colTal !== -1) newRow[colTal] = mecanico.taller || "Taller Independiente"; else newRow[5] = mecanico.taller || "Taller Independiente";
        if (colTra !== -1) newRow[colTra] = trabajo; else newRow[6] = trabajo;
        if (colTipo !== -1) newRow[colTipo] = "Inspección Técnica";

        sheetHistorial.appendRow(newRow);
      }
      
      return getCorsResponse({
        success: true,
        message: "¡Re-inspección técnica completada! Nuevo Score certificado: " + score + " pts.",
        data: {
          placa: placa,
          score: score,
          idHistorial: newId,
          mecanico: mecanico.nombre,
          taller: mecanico.taller,
          tipoRegistro: "Inspección Técnica"
        }
      });
    }

    // ACCIÓN 3: Registrar Inspección Técnica Oficial (Explícitamente como Inspección Técnica, no como Reparación)
    if (accion === "registrarInspeccionTecnica") {
      const placa = (payload.placa || "").toString().trim().toUpperCase();
      const score = Number(payload.score || 90);
      const codigoMecanico = (payload.codigoMecanico || payload.codMec || "").toString().trim();
      const kilometraje = Number(payload.kilometraje || 0);
      const trabajo = (payload.trabajo || "").toString().trim();
      const marca = (payload.marca || "").toString().trim();
      const modelo = (payload.modelo || "").toString().trim();
      const anio = Number(payload.anio || 0);
      const idDueno = (payload.idDueno || "").toString().trim();
      const esReinspeccion = !!payload.esReinspeccion;
      const estadoCertificado = (payload.estadoCertificado || "Activo").toString().trim();

      if (!placa || !codigoMecanico || !trabajo) {
        return getCorsResponse({ success: false, error: "Faltan datos obligatorios para la inspección técnica (placa, mecánico, trabajo)." });
      }

      // Validar mecánico
      const sheetMecanicos = sheetApp.getSheetByName("Mecanicos");
      let mecanico = null;
      if (sheetMecanicos) {
        const mData = sheetMecanicos.getDataRange().getValues();
        const hM = mData[0];
        const rM = mData.slice(1);
        for (let i = 0; i < rM.length; i++) {
          if (getRowValue(rM[i], hM, "CodigoMecanico").trim() === codigoMecanico) {
            mecanico = {
              codigo: codigoMecanico,
              nombre: getRowValue(rM[i], hM, "Nombre"),
              taller: getRowValue(rM[i], hM, "Taller"),
              estado: getRowValue(rM[i], hM, "Estado", "Activo").trim()
            };
            break;
          }
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

      // Registrar o actualizar vehículo en 'Vehiculos'
      const sheetVehiculos = sheetApp.getSheetByName("Vehiculos");
      if (!sheetVehiculos) {
        return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no configurada." });
      }

      const vData = sheetVehiculos.getDataRange().getValues();
      const hV = vData[0];
      const idxPlaca = findColumnIndex(hV, "Placa");
      const idxScore = findColumnIndex(hV, "Score");
      const idxEstado = findColumnIndex(hV, "EstadoCertificado");

      let filaVehiculo = -1;
      for (let i = 1; i < vData.length; i++) {
        if (vData[i][idxPlaca].toString().trim().toUpperCase() === placa) {
          filaVehiculo = i + 1;
          break;
        }
      }

      if (filaVehiculo !== -1) {
        if (idxScore !== -1) sheetVehiculos.getRange(filaVehiculo, idxScore + 1).setValue(score);
        if (idxEstado !== -1) sheetVehiculos.getRange(filaVehiculo, idxEstado + 1).setValue(estadoCertificado);
      } else {
        if (!marca || !modelo || !anio || !idDueno) {
          return getCorsResponse({ success: false, error: "Faltan datos del vehículo para la primera inspección técnica." });
        }
        sheetVehiculos.appendRow([placa, marca, modelo, anio, idDueno, score, estadoCertificado]);
      }

      // Guardar en 'Historial' explícitamente como Inspección Técnica
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
      
      // Auto-crear cabecera 'TipoRegistro' en Historial si no existe
      ensureColumnHeader(sheetHistorial, "TipoRegistro");
      const hData = sheetHistorial.getDataRange().getValues();
      const hH = hData[0];
      const newRow = new Array(hH.length).fill("");
      const colId = findColumnIndex(hH, "IdHistorial");
      const colPla = findColumnIndex(hH, "Placa");
      const colFec = findColumnIndex(hH, "Fecha");
      const colKm = findColumnIndex(hH, "Kilometraje");
      const colCod = findColumnIndex(hH, "CodigoMecanico");
      const colTal = findColumnIndex(hH, "Taller");
      const colTra = findColumnIndex(hH, "TrabajoRealizado");
      const colTipo = findColumnIndex(hH, "TipoRegistro");

      if (colId !== -1) newRow[colId] = newId; else newRow[0] = newId;
      if (colPla !== -1) newRow[colPla] = placa; else newRow[1] = placa;
      if (colFec !== -1) newRow[colFec] = fechaActual; else newRow[2] = fechaActual;
      if (colKm !== -1) newRow[colKm] = kilometraje; else newRow[3] = kilometraje;
      if (colCod !== -1) newRow[colCod] = codigoMecanico; else newRow[4] = codigoMecanico;
      if (colTal !== -1) newRow[colTal] = mecanico.taller || "Taller Independiente"; else newRow[5] = mecanico.taller || "Taller Independiente";
      if (colTra !== -1) newRow[colTra] = trabajo; else newRow[6] = trabajo;
      if (colTipo !== -1) newRow[colTipo] = "Inspección Técnica";

      sheetHistorial.appendRow(newRow);

      return getCorsResponse({
        success: true,
        message: esReinspeccion
          ? "¡Re-Inspección Técnica completada y Score actualizado a " + score + " pts!"
          : "¡Inspección Técnica Oficial de Ingreso sellada y registrada!",
        data: {
          idHistorial: newId,
          placa: placa,
          score: score,
          tipoRegistro: "Inspección Técnica",
          fecha: fechaActual,
          mecanico: mecanico.nombre,
          taller: mecanico.taller
        }
      });
    }
    
    // ACCIÓN 4: Registrar Mantenimiento del Técnico (Reparaciones cotidianas)
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
      
      // Auto-crear cabecera 'TipoRegistro' en Historial si no existe
      ensureColumnHeader(sheetHistorial, "TipoRegistro");
      const hData = sheetHistorial.getDataRange().getValues();
      const hH = hData[0];
      const newRow = new Array(hH.length).fill("");
      const colId = findColumnIndex(hH, "IdHistorial");
      const colPla = findColumnIndex(hH, "Placa");
      const colFec = findColumnIndex(hH, "Fecha");
      const colKm = findColumnIndex(hH, "Kilometraje");
      const colCod = findColumnIndex(hH, "CodigoMecanico");
      const colTal = findColumnIndex(hH, "Taller");
      const colTra = findColumnIndex(hH, "TrabajoRealizado");
      const colTipo = findColumnIndex(hH, "TipoRegistro");

      if (colId !== -1) newRow[colId] = newId; else newRow[0] = newId;
      if (colPla !== -1) newRow[colPla] = placa; else newRow[1] = placa;
      if (colFec !== -1) newRow[colFec] = fechaActual; else newRow[2] = fechaActual;
      if (colKm !== -1) newRow[colKm] = kilometraje; else newRow[3] = kilometraje;
      if (colCod !== -1) newRow[colCod] = codigoMecanico; else newRow[4] = codigoMecanico;
      if (colTal !== -1) newRow[colTal] = mecanico.taller || "Taller Independiente"; else newRow[5] = mecanico.taller || "Taller Independiente";
      if (colTra !== -1) newRow[colTra] = trabajo; else newRow[6] = trabajo;
      if (colTipo !== -1) newRow[colTipo] = "Reparación";

      sheetHistorial.appendRow(newRow);
      
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
    
    // ACCIÓN NUEVA: Evaluar / Calificar Servicio de Mecánico y Taller (Bueno o Malo + Experiencia)
    if (accion === "evaluarServicio" || accion === "calificarMecanico") {
      const idHistorial = Number(payload.idHistorial || 0);
      const evaluacion = (payload.evaluacion || payload.calificacion || "").toString().trim(); // "Bueno" o "Malo"
      const comentario = (payload.comentario || payload.experiencia || "").toString().trim();
      
      if (!idHistorial || !evaluacion) {
        return getCorsResponse({ success: false, error: "Faltan datos obligatorios para la evaluación (idHistorial, evaluacion)." });
      }
      
      const sheetHistorial = sheetApp.getSheetByName("Historial");
      if (!sheetHistorial) {
        return getCorsResponse({ success: false, error: "Pestaña 'Historial' no configurada." });
      }
      
      const d = sheetHistorial.getDataRange().getValues();
      const h = d[0];
      const idxId = findColumnIndex(h, "IdHistorial");
      
      if (idxId === -1) {
        return getCorsResponse({ success: false, error: "Columna 'IdHistorial' no encontrada en la hoja Historial." });
      }
      
      // Auto-crear columnas de Evaluación si no existen en la hoja
      let idxEval = findColumnIndex(h, "Evaluacion");
      let idxCom = findColumnIndex(h, "ComentarioEvaluacion");
      let idxFechaEval = findColumnIndex(h, "FechaEvaluacion");
      
      if (idxEval === -1) {
        idxEval = h.length;
        sheetHistorial.getRange(1, idxEval + 1).setValue("Evaluacion");
      }
      if (idxCom === -1) {
        idxCom = idxEval === h.length ? idxEval + 1 : h.length;
        sheetHistorial.getRange(1, idxCom + 1).setValue("ComentarioEvaluacion");
      }
      if (idxFechaEval === -1) {
        idxFechaEval = Math.max(idxEval, idxCom) + 1;
        sheetHistorial.getRange(1, idxFechaEval + 1).setValue("FechaEvaluacion");
      }
      
      // Buscar la fila por IdHistorial
      let filaTarget = -1;
      for (let i = 1; i < d.length; i++) {
        if (Number(d[i][idxId]) === idHistorial) {
          filaTarget = i + 1; // 1-based index para getRange
          break;
        }
      }
      
      if (filaTarget === -1) {
        return getCorsResponse({ success: false, error: "Registro de historial #" + idHistorial + " no encontrado." });
      }
      
      const fechaActual = Utilities.formatDate(new Date(), "GMT-4", "yyyy-MM-dd HH:mm:ss");
      const comentarioLimpio = sanitizarTextoPrivado(comentario);
      sheetHistorial.getRange(filaTarget, idxEval + 1).setValue(evaluacion);
      sheetHistorial.getRange(filaTarget, idxCom + 1).setValue(comentarioLimpio);
      sheetHistorial.getRange(filaTarget, idxFechaEval + 1).setValue(fechaActual);
      
      return getCorsResponse({
        success: true,
        message: "¡Evaluación registrada correctamente! Gracias por certificar la calidad técnica de este taller.",
        data: {
          idHistorial: idHistorial,
          evaluacion: evaluacion,
          comentario: comentario,
          fecha: fechaActual
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

      if (subAccion === "actualizarScoreVehiculo" || subAccion === "actualizarScore") {
        const sheetVeh = sheetApp.getSheetByName("Vehiculos");
        if (!sheetVeh) return getCorsResponse({ success: false, error: "Pestaña 'Vehiculos' no encontrada." });
        const d = sheetVeh.getDataRange().getValues();
        const h = d[0];
        const idxId = findColumnIndex(h, "Placa");
        const idxScore = findColumnIndex(h, "Score");
        const numScore = Number(payload.nuevoScore || nuevoEstado || 90);
        
        for (let i = 1; i < d.length; i++) {
          if (d[i][idxId].toString().trim().toUpperCase() === targetId.toUpperCase()) {
            if (idxScore !== -1) {
              sheetVeh.getRange(i + 1, idxScore + 1).setValue(numScore);
            }
            return getCorsResponse({ success: true, message: "Score del vehículo " + targetId + " actualizado correctamente a: " + numScore + " pts." });
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
