// Serviço proxy para contornar CORS durante desenvolvimento
export class ProxyService {
  // Proxies CORS públicos para desenvolvimento
  private static readonly CORS_PROXIES = {
    GET: 'https://api.allorigins.win/raw?url=',
    POST: 'https://corsproxy.io/?'
  };
  
  private static isProduction(): boolean {
    // Browser-safe check
    return process?.env?.NODE_ENV === 'production' || 
           window.location.hostname !== 'localhost';
  }
  
  static async fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
    try {
      // Para produção, usa fetch normal
      if (ProxyService.isProduction()) {
        return fetch(url, options);
      }
      
      // Para desenvolvimento, usa proxy CORS
      const method = options?.method || 'GET';
      const proxyPrefix = method === 'POST' 
        ? ProxyService.CORS_PROXIES.POST 
        : ProxyService.CORS_PROXIES.GET;
      
      const proxyUrl = proxyPrefix + encodeURIComponent(url);
      
      return fetch(proxyUrl, options);
    } catch (error) {
      console.error('Proxy fetch failed:', error);
      // Fallback to direct fetch
      return fetch(url, options);
    }
  }
}