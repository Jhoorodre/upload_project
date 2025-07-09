import { Config, MangaData, ChapterData } from '../types';

export class GitHubService {
  private async makeGitHubRequest(
    url: string, 
    method: 'GET' | 'PUT' = 'GET', 
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
      throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  async getCurrentIndex(config: Config['github']): Promise<{ data: any; sha: string | null }> {
    const { pat, owner, repo, filename } = config;
    
    if (!pat || !owner || !repo || !filename) {
      throw new Error('GitHub configuration incomplete');
    }

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    
    try {
      const response = await this.makeGitHubRequest(url, 'GET', undefined, pat);
      const content = JSON.parse(atob(response.content));
      return { data: content, sha: response.sha };
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return { data: {}, sha: null };
      }
      throw error;
    }
  }

  async updateIndex(
    config: Config['github'],
    mangaData: MangaData,
    chapterData: ChapterData,
    urls: string[]
  ): Promise<string> {
    const { pat, owner, repo, filename } = config;
    
    if (!pat || !owner || !repo || !filename) {
      throw new Error('GitHub configuration incomplete');
    }

    const { data: currentIndex, sha } = await this.getCurrentIndex(config);
    
    if (!currentIndex[mangaData.title]) {
      currentIndex[mangaData.title] = {
        ...mangaData,
        chapters: {}
      };
    }

    const chapterKey = `${chapterData.volume}-${chapterData.number}`;
    currentIndex[mangaData.title].chapters[chapterKey] = {
      ...chapterData,
      pages: urls
    };

    const content = btoa(JSON.stringify(currentIndex, null, 2));
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filename}`;
    
    const updateData = {
      message: `Update ${mangaData.title} - Chapter ${chapterData.number}`,
      content,
      sha: sha || undefined,
    };

    const response = await this.makeGitHubRequest(url, 'PUT', updateData, pat);
    return response.content.html_url;
  }

  async testConnection(config: Config['github']): Promise<boolean> {
    const { pat, owner, repo } = config;
    
    if (!pat || !owner || !repo) {
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
}