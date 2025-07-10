import { Config } from '../types';

export class GitHubService {
  private async makeGitHubRequest(
    url: string, 
    method: 'GET' | 'PUT' | 'DELETE' = 'GET', 
    data?: any, 
    token?: string
  ): Promise<any> {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: data ? JSON.stringify(data) : undefined,
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Token inválido ou expirado. Verifique seu PAT.');
      } else if (response.status === 404) {
        throw new Error('Repositório não encontrado. Verifique owner/repo.');
      } else if (response.status === 403) {
        throw new Error('Sem permissão. Verifique as permissões do token.');
      } else if (response.status >= 500) {
        throw new Error('Erro no servidor do GitHub. Tente novamente.');
      }
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }



  async testConnection(config: Config['github']): Promise<boolean> {
    const { pat, owner, repo } = config;
    
    if (!pat || !owner || !repo) {
      return false;
    }
    
    // Validate PAT format
    if (!pat.startsWith('ghp_') && !pat.startsWith('github_pat_')) {
      console.warn('Invalid GitHub token format. Expected to start with "ghp_" or "github_pat_"');
      return false;
    }

    try {
      const url = `https://api.github.com/repos/${owner}/${repo}`;
      await this.makeGitHubRequest(url, 'GET', undefined, pat);
      return true;
    } catch (error) {
      return false;
    }
  }

  async getJsonFile(owner: string, repo: string, path: string, pat: string): Promise<{ content: any; sha: string | null }> {
    if (!pat || !owner || !repo || !path) {
      throw new Error('Parâmetros incompletos para buscar JSON');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    try {
      const response = await this.makeGitHubRequest(url, 'GET', undefined, pat);
      const content = JSON.parse(atob(response.content));
      return { content, sha: response.sha };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return { content: {}, sha: null };
      }
      throw error;
    }
  }

  async saveJsonFile(
    owner: string, 
    repo: string, 
    path: string, 
    content: any, 
    pat: string, 
    sha?: string
  ): Promise<string> {
    if (!pat || !owner || !repo || !path) {
      throw new Error('Parâmetros incompletos para salvar JSON');
    }

    const encodedContent = btoa(JSON.stringify(content, null, 2));
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const updateData = {
      message: `Update ${path}`,
      content: encodedContent,
      sha: sha || undefined,
    };

    const response = await this.makeGitHubRequest(url, 'PUT', updateData, pat);
    return response.content.html_url;
  }

  async listRepositoryContents(owner: string, repo: string, path: string = '', pat: string): Promise<any[]> {
    if (!pat || !owner || !repo) {
      throw new Error('Parâmetros incompletos para listar conteúdo');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    try {
      const response = await this.makeGitHubRequest(url, 'GET', undefined, pat);
      return Array.isArray(response) ? response : [response];
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return [];
      }
      throw error;
    }
  }

  async deleteJsonFile(
    owner: string,
    repo: string,
    path: string,
    pat: string,
    sha: string
  ): Promise<void> {
    if (!pat || !owner || !repo || !path || !sha) {
      throw new Error('Parâmetros incompletos para deletar arquivo');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;
    
    const deleteData = {
      message: `Delete ${path}`,
      sha: sha
    };

    await this.makeGitHubRequest(url, 'DELETE', deleteData, pat);
  }
}