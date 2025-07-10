// Serviço proxy para contornar CORS durante desenvolvimento
export class ProxyService {
  
  static async fetchWithProxy(url: string, options?: RequestInit): Promise<Response> {
    const method = options?.method || 'GET';
    
    // Para uploads (FormData), usar estratégia específica
    if (method === 'POST' && options?.body instanceof FormData) {
      return ProxyService.handleFormDataUpload(url, options);
    }
    
    // Para outros tipos de requisição, usar proxy simples
    return ProxyService.handleRegularRequest(url, options);
  }
  
  // Método específico para upload com FormData
  private static async handleFormDataUpload(url: string, options: RequestInit): Promise<Response> {
    const proxies = [
      'https://cors-anywhere.herokuapp.com/',
      'https://api.allorigins.win/raw?url=',
      'https://corsproxy.io/?'
    ];
    
    for (const proxyPrefix of proxies) {
      try {
        const proxyUrl = proxyPrefix + encodeURIComponent(url);
        console.log(`🔄 Tentando proxy para upload: ${proxyPrefix.split('/')[2]}...`);
        
        const response = await fetch(proxyUrl, {
          ...options,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*',
            ...(options.headers || {})
          }
        });
        
        if (response.ok) {
          console.log(`✅ Upload via proxy funcionou: ${proxyPrefix.split('/')[2]}`);
          return response;
        } else {
          console.log(`❌ Proxy retornou erro ${response.status}: ${proxyPrefix.split('/')[2]}`);
        }
      } catch (error) {
        console.log(`❌ Proxy falhou com erro: ${proxyPrefix.split('/')[2]}`, error);
        continue;
      }
    }
    
    throw new Error('Todos os proxies falharam para upload. Verifique sua conexão.');
  }
  
  // Método para requisições regulares
  private static async handleRegularRequest(url: string, options?: RequestInit): Promise<Response> {
    const method = options?.method || 'GET';
    const proxies = method === 'POST' 
      ? ['https://cors-anywhere.herokuapp.com/', 'https://api.allorigins.win/raw?url=']
      : ['https://api.allorigins.win/raw?url=', 'https://cors-anywhere.herokuapp.com/'];
    
    for (const proxyPrefix of proxies) {
      try {
        const proxyUrl = proxyPrefix + encodeURIComponent(url);
        console.log(`🔄 Tentando proxy: ${proxyPrefix.split('/')[2]}...`);
        
        const response = await fetch(proxyUrl, {
          ...options,
          headers: {
            ...(options?.headers || {})
          }
        });
        
        if (response.ok) {
          console.log(`✅ Proxy funcionou: ${proxyPrefix.split('/')[2]}`);
          return response;
        }
      } catch (error) {
        console.log(`❌ Proxy falhou: ${proxyPrefix.split('/')[2]}`);
        continue;
      }
    }
    
    throw new Error('Todos os proxies falharam.');
  }
}