// Tipos comunes de la capa de proveedores de IA (seccion 27 del pliego).
// Cada proveedor es sustituible sin modificar el resto de la app. Ninguna
// clave de API vive en el frontend: las implementaciones reales llaman a un
// endpoint backend propio que guarda las credenciales como variables de
// entorno de servidor. Si ese backend no esta desplegado/configurado, el
// proveedor reporta "not-configured" en lugar de simular un resultado.

export type ProviderResultStatus = "ok" | "not-configured" | "error";

export interface ProviderResult<T> {
  status: ProviderResultStatus;
  data?: T;
  message?: string;
}

export function notConfigured<T>(providerLabel: string): ProviderResult<T> {
  return {
    status: "not-configured",
    message: `${providerLabel}: proveedor de IA no configurado. Conecta un backend/API en la configuracion del proyecto para habilitar esta funcion.`,
  };
}
