// Serviço especializado para contornar CORS especificamente para uploads
export class CorsProxyService {
  private static readonly PROXY_ENDPOINTS = [
    {
      name: 'allorigins',
      url: 'https://api.allorigins.win/raw?url=',
      supportsFormData: true,
      priority: 1 // Funcionando!
    },
    {
      name: 'corsproxy.io',
      url: 'https://corsproxy.io/?',
      supportsFormData: true,
      priority: 2
    },
    {
      name: 'cors-anywhere',
      url: 'https://cors-anywhere.herokuapp.com/',
      supportsFormData: true,
      priority: 3
    }
  ];

  static async uploadWithCorsProxy(url: string, formData: FormData, signal?: AbortSignal): Promise<Response> {
    // Ordenar proxies por prioridade (allorigins primeiro)
    const workingProxies = CorsProxyService.PROXY_ENDPOINTS
      .filter(p => p.supportsFormData)
      .sort((a, b) => a.priority - b.priority);
    
    for (const proxy of workingProxies) {
      try {
        console.log(`🔄 Tentando upload via ${proxy.name}...`);
        
        const proxyUrl = proxy.url + encodeURIComponent(url);
        const response = await fetch(proxyUrl, {
          method: 'POST',
          body: formData,
          signal,
          headers: {
            'X-Requested-With': 'XMLHttpRequest',
            'Accept': '*/*'
          }
        });
        
        if (response.ok) {
          console.log(`✅ Upload via ${proxy.name} funcionou!`);
          return response;
        } else {
          console.log(`❌ ${proxy.name} retornou status ${response.status}`);
        }
      } catch (error) {
        console.log(`❌ Erro em ${proxy.name}:`, error);
        continue;
      }
    }
    
    throw new Error('Todos os proxies falharam para upload.');
  }
  
  static async testProxy(url: string): Promise<{ proxy: string; working: boolean }[]> {
    const results: { proxy: string; working: boolean }[] = [];
    
    for (const proxy of CorsProxyService.PROXY_ENDPOINTS) {
      try {
        const proxyUrl = proxy.url + encodeURIComponent(url);
        const response = await fetch(proxyUrl, { 
          method: 'HEAD',
          headers: {
            'X-Requested-With': 'XMLHttpRequest'
          }
        });
        
        results.push({
          proxy: proxy.name,
          working: response.ok
        });
      } catch (error) {
        results.push({
          proxy: proxy.name,
          working: false
        });
      }
    }
    
    return results;
  }
}
