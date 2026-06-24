import { logger } from './logger';

export class AIProviderService {
  public static async validateKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      let res: Response;
      switch (provider) {
        case 'openrouter':
          res = await fetch('https://openrouter.ai/api/v1/auth/key', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return true;
        case 'openai':
          res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return true;
        case 'anthropic':
          // Anthropic doesn't have a simple auth endpoint, so we test a fast models list or mock request
          res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: { 
              'x-api-key': apiKey, 
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json'
            },
            body: JSON.stringify({
              model: "claude-3-haiku-20240307",
              max_tokens: 1,
              messages: [{ role: "user", content: "hi" }]
            })
          });
          if (!res.ok) {
            // Anthropic throws 400 Bad Request if key is valid but body is wrong. If 401, it's invalid.
            if (res.status === 400) return true;
            throw new Error(`Status ${res.status}`);
          }
          return true;
        case 'nvidia': // Nvidia NIM
          res = await fetch('https://integrate.api.nvidia.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return true;
        case 'google': // Google Gemini / Vertex
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          return true;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (err: unknown) {
      logger.error(`Validation failed for provider ${provider}: ${(err as Error).message}`);
      return false;
    }
  }

  public static async fetchModels(provider: string, apiKey: string): Promise<{ id: string, name: string }[]> {
    try {
      let res: Response;
      let data: Record<string, any>;
      switch (provider) {
        case 'openrouter': {
          res = await fetch('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          data = await res.json();
          return data.data.map((m: any) => ({ id: m.id, name: m.name || m.id }));
        }
        case 'openai': {
          res = await fetch('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          data = await res.json();
          return data.data.map((m: any) => ({ id: m.id, name: m.id }));
        }
        case 'anthropic': {
          return [
            { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet' },
            { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus' },
            { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku' },
            { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku' }
          ];
        }
        case 'nvidia': {
          res = await fetch('https://integrate.api.nvidia.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          if (!res.ok) throw new Error(`Status ${res.status}`);
          data = await res.json();
          return data.data.map((m: any) => ({ id: m.id, name: m.id }));
        }
        case 'google': {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          if (!res.ok) throw new Error(`Status ${res.status}`);
          data = await res.json();
          return data.models.map((m: any) => ({ id: m.name, name: m.displayName || m.name }));
        }
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (err: unknown) {
      logger.error(`Fetch models failed for provider ${provider}: ${(err as Error).message}`);
      throw new Error('Failed to fetch models from provider');
    }
  }
}
