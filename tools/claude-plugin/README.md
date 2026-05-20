# Zenith Skill for Claude Code

Claude Code skill providing comprehensive guidance for Zenith CMS development, featuring dynamic schema compilation patterns, database-agnostic queries, brute force security lockouts, and state-of-the-art glassmorphic frontend styling.

## Installation

### From GitHub

Install this skill directly from the Zenith CMS repository using Claude Code:

```bash
/plugin install github:AmanTShekar/Zenith-CMS
```

---

## What's Included

The `zenith` skill provides expert guidance on:

*   **Monorepo Scoping**: Decoupling server-side logic (`packages/core`) from dynamic UI states (`packages/admin`).
*   **Dynamic Schema Validation**: Compiling custom validation structures dynamically (`packages/core/src/schema/engine.ts`).
*   **Security Lockouts**: Resolving authentication requests securely via `AuthService` lockout timers and HttpOnly sessions.
*   **Database Adapters**: Structuring database-agnostic queries so Postgres and MongoDB adapters perform uniformly.
*   **Premium Glassmorphic CSS**: Styling active panels with deep translucency, soft glowing overlays, and hardware-accelerated animations.

---

## Usage

Once installed, Claude will automatically invoke the skill when working within Zenith CMS. The skill triggers whenever you:
*   Work with database collection schemas or adapters.
*   Build or update admin builder widgets.
*   Implement authentication and routing security protocols.

You can also explicitly query:
```
@zenith How do I securely restrict field selections by tenant?
```
