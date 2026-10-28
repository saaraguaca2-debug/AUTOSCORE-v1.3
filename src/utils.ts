/**
 * Utilidades para sanitización de privacidad técnica y seguridad en AutoScore.
 * Protege de forma estricta los códigos de acceso de mecánicos y talleres,
 * asegurando que no se filtren en comentarios de clientes, reseñas públicas,
 * certificados ni reportes técnicos.
 */

export function sanitizarComentarioYTexto(
  texto: string | undefined | null,
  codigosPrivados: (string | undefined | null)[] = []
): string {
  if (!texto || typeof texto !== "string") return "";
  let limpio = texto;

  // 1. Quitar firmas como "Realizado por: Nombre (CODIGO)" -> "Realizado por: Nombre"
  limpio = limpio.replace(/Realizado por:\s*([^\(\n\r]+?)\s*\([^\)]*?\)/gi, "Realizado por: $1");

  // 2. Quitar registros como "Reg: CODIGO" o "| Reg: CODIGO |"
  limpio = limpio.replace(/\|\s*Reg:\s*[^|\n]+\s*\|/gi, "| Acreditación Homologada |");
  limpio = limpio.replace(/Reg:\s*[A-Za-z0-9_\-]+/gi, "Acreditación Homologada");

  // 3. Quitar menciones explícitas de códigos/claves privadas en comentarios
  // Ejemplos: "código MEC-01", "código: 123", "clave 456", "id mecánico ABC"
  limpio = limpio.replace(/(?:c[oó]digo(?:\s+de\s+(?:acceso|mec[aá]nico|taller))?|clave(?:\s+de\s+acceso)?|id\s+mec[aá]nico)\s*[:#=\-]?\s*[A-Za-z0-9_\-]+/gi, "");

  // 4. Si se pasan códigos privados conocidos (por ejemplo el codigoMecanico de la fila o del taller), purgarlos
  for (const cod of codigosPrivados) {
    if (cod && typeof cod === "string") {
      const trimmed = cod.trim();
      if (trimmed.length >= 2) {
        const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Eliminar si aparece entre paréntesis: (CODIGO)
        limpio = limpio.replace(new RegExp(`\\(\\s*${escaped}\\s*\\)`, 'gi'), '');
        // Eliminar con # o prefijo: #CODIGO
        limpio = limpio.replace(new RegExp(`#${escaped}\\b`, 'gi'), '');
        // Eliminar como palabra independiente
        limpio = limpio.replace(new RegExp(`\\b${escaped}\\b`, 'gi'), '');
      }
    }
  }

  // 5. Limpieza de paréntesis residuales vacíos y espacios múltiples
  limpio = limpio
    .replace(/\(\s*\)/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n/g, "\n")
    .replace(/\|\s*\|/g, "|")
    .trim();

  return limpio;
}

/**
 * Formatea un número telefónico a formato internacional E.164 compatible con WhatsApp (wa.me)
 */
export function formatWhatsAppNumber(phone: string): string {
  let cleaned = String(phone || "").replace(/[^0-9]/g, "");
  if (!cleaned) return "";

  // Si empieza con 0, quitarlo (ej: 04141234567 -> 4141234567)
  if (cleaned.startsWith("0")) {
    cleaned = cleaned.substring(1);
  }

  // Si ya empieza con 58 y tiene 12 dígitos, es perfecto
  if (cleaned.startsWith("58") && cleaned.length === 12) {
    return cleaned;
  }

  // Autocompletar código de país de Venezuela (58) si no lo tiene y empieza con prefijos comunes
  const prefijosComunes = ["414", "424", "412", "416", "426"];
  const startsWithPrefijo = prefijosComunes.some(p => cleaned.startsWith(p));

  if (startsWithPrefijo) {
    if (cleaned.length === 10 || cleaned.length === 9) {
      cleaned = "58" + cleaned;
    }
  }

  // Si la longitud es 10 y no empieza con 58, anteponer 58
  if (cleaned.length === 10 && !cleaned.startsWith("58")) {
    cleaned = "58" + cleaned;
  }

  return cleaned;
}
