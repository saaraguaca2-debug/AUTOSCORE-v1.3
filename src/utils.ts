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
