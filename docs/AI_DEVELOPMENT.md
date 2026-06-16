# Zenith CMS — AI Integration Guide

The Zenith CMS Admin UI includes a built-in AI Content Hub (Neural Bridge) that allows content editors to generate, refine, and analyze content directly within the dashboard.

This document outlines how the AI system works, how to configure it, and how to extend its capabilities.

---

## 1. Provider Configuration

Zenith's AI layer is model-agnostic. It routes requests to various LLM providers based on the environment variables defined in your `.env` file. You must provide at least one API key to enable AI features.

| Environment Variable | Provider | Best For |
|---|---|---|
| `OPENAI_API_KEY` | OpenAI (GPT-4o, GPT-4o-mini) | General content generation, complex reasoning |
| `ANTHROPIC_API_KEY` | Anthropic (Claude 3.5 Sonnet) | Nuanced writing, formatting consistency |
| `XAI_API_KEY` | xAI (Grok-2) | Real-time context, edgy/dynamic copy |
| `OPENROUTER_API_KEY` | OpenRouter | Access to open-source models (Llama 3, Mixtral) |

If multiple keys are provided, the Admin UI will allow the user to select their preferred model from a dropdown before generating content.

---

## 2. Core Features

### 2.1 Content Generation
The **AI Hub** (accessible via the `Ctrl+Space` shortcut or the toolbar) allows editors to enter a prompt (e.g., "Write a 3-paragraph introduction about our new SaaS product"). The generated text is streamed back to the editor in real-time and can be inserted directly into Rich Text, Textarea, or Text fields.

### 2.2 SEO Analysis
The `content-tools/seo-analysis` endpoint takes the draft content of a document and evaluates it against standard SEO metrics:
- Readability score (Flesch-Kincaid)
- Keyword density
- Heading structure
- Suggestions for meta title/description improvements

### 2.3 Tone Adjustment
Editors can highlight text inside a Rich Text field and select an AI action such as "Make more professional", "Shorten", or "Translate to Spanish". The API processes the highlighted text and returns the modification.

---

## 3. The API Layer (`/api/v1/content-tools`)

The AI functionality is strictly secured behind the Admin authentication middleware. Unauthenticated users, or users with insufficient permissions, cannot trigger AI generations (preventing API key abuse).

**Example Request:**
```bash
POST /api/v1/content-tools/ai/generate
Content-Type: application/json
Authorization: Bearer <token>

{
  "prompt": "Write a meta description for a blog post about React 19.",
  "provider": "openai",
  "model": "gpt-4o-mini",
  "maxTokens": 100
}
```

---

## 4. Extending the Prompts

If you want to enforce specific brand guidelines or prompt structures, you can use the Plugin system or Lifecycle Hooks to intercept AI requests before they hit the external providers.

**Example: Enforcing Brand Voice via Hooks**
```typescript
// Example inside cms.config.ts or a custom plugin
const config: CMSConfig = {
  // ...
  hooks: {
    // Note: AI hook interception requires a custom plugin or extending the router currently
    // This demonstrates the conceptual pattern.
  }
}
```
*(Deep customization of the internal AI system prompts is planned for Zenith v0.3.0).*
