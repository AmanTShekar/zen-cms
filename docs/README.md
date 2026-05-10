# Zenith CMS Documentation

## Overview
Zenith is a next-generation headless CMS built for speed and security.

## Architecture Diagram
```mermaid
graph TD
    User[Editor/Admin] --> AdminUI[Admin Dashboard]
    AdminUI --> Core[Zenith Core Engine]
    Core --> DB[(MongoDB)]
    Core --> AI[OpenAI / Anthropic]
    Core --> Storage[Cloudinary / Local]
    Program[External App] --> API[REST / GraphQL]
    API --> Core
```

## Features
- **Declarative Schema**: Define everything in one TypeScript file.
- **Auto-Docs**: Instant Swagger and GraphQL.
- **Deep Security**: RLS and Delta Auditing.
