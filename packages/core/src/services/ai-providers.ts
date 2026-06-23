import axios from 'axios';
import { logger } from './logger';

export class AIProviderService {
  public static async validateKey(provider: string, apiKey: string): Promise<boolean> {
    try {
      switch (provider) {
        case 'openrouter':
          await axios.get('https://openrouter.ai/api/v1/auth/key', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return true;
        case 'openai':
          await axios.get('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return true;
        case 'anthropic':
          // Anthropic doesn't have a simple auth endpoint, so we test a fast models list or mock request
          // Actually, anthropic has no models endpoint. Let's make a dummy request.
          await axios.post('https://api.anthropic.com/v1/messages', {
            model: "claude-3-haiku-20240307",
            max_tokens: 1,
            messages: [{ role: "user", content: "hi" }]
          }, {
            headers: { 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' }
          });
          return true;
        case 'nvidia': // Nvidia NIM
          await axios.get('https://integrate.api.nvidia.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return true;
        case 'google': // Google Gemini / Vertex
          await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          return true;
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (err: unknown) {
      // Anthropic throws 400 Bad Request if key is valid but body is wrong. If 401, it's invalid.
      if (provider === 'anthropic' && err?.response?.status === 400) {
        return true;
      }
      logger.error(`Validation failed for provider ${provider}: ${err?.response?.data?.error?.message || err.message}`);
      return false;
    }
  }

  public static async fetchModels(provider: string, apiKey: string): Promise<{ id: string, name: string }[]> {
    try {
      switch (provider) {
        case 'openrouter': {
          const res = await axios.get('https://openrouter.ai/api/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return res.data.data.map((m: Record<string, unknown>) => ({ id: m.id, name: m.name || m.id }));
        }
        case 'openai': {
          const res = await axios.get('https://api.openai.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return res.data.data.map((m: Record<string, unknown>) => ({ id: m.id, name: m.id }));
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
          const res = await axios.get('https://integrate.api.nvidia.com/v1/models', {
            headers: { Authorization: `Bearer ${apiKey}` }
          });
          return res.data.data.map((m: Record<string, unknown>) => ({ id: m.id, name: m.id }));
        }
        case 'google': {
          const res = await axios.get(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
          return res.data.models.map((m: Record<string, unknown>) => ({ id: m.name, name: m.displayName || m.name }));
        }
        default:
          throw new Error(`Unsupported AI provider: ${provider}`);
      }
    } catch (err: unknown) {
      logger.error(`Fetch models failed for provider ${provider}: ${err?.response?.data?.error?.message || err.message}`);
      throw new Error('Failed to fetch models from provider');
    }
  }
}
