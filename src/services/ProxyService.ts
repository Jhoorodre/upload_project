// Serviço proxy para contornar CORS durante desenvolvimento
export class ProxyService {
  // Usa um proxy CORS público para desenvolvimento
  private static CORS_PROXY = 'https://api.allorigins.win/raw?url=';
  
  static async fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
    // Para desenvolvimento, usa proxy CORS
    if (process.env.NODE_ENV === 'development') {
      // Para POST requests, precisa de uma abordagem diferente
      if (options?.method === 'POST') {
        // Alternativa: usar um proxy que aceita POST
        const proxyUrl = 'https://corsproxy.io/?' + encodeURIComponent(url);
        return fetch(proxyUrl, options);
      }
      return fetch(ProxyService.CORS_PROXY + encodeURIComponent(url), options);
    }
    
    // Para produção, usa fetch normal
    return fetch(url, options);
  }
}