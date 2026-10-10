/**
 * Chaves de API embutidas no build (modo improvisado).
 *
 * Este arquivo versionado fica VAZIO. Durante o build no GitHub Actions,
 * o workflow injeta o pool completo vindo dos secrets NVAPI_POOL e
 * NVAPI_BUILTIN — nenhum valor entra no histórico do git. Plano: migrar
 * para um proxy próprio e remover isto.
 */
export const BUILTIN_API_KEYS = { nvidia: "", pool: [] };
