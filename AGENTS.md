# AGENTS.md — Protocolo de Agentes (AcodeX)

Este repositório é operado por agentes de IA em paralelo a humanos.
Quem for trabalhar aqui deve ler este arquivo antes de commitar.

## Equipe

| Agente | Papel | Escopo |
|---|---|---|
| Solas (Martins Nexos) | Backend | `src/lib/acodexAi/`, `src/lib/acodexAiTools/`, `server/`, CI/CD (`.github/workflows/`), plugins nativos (HTTP, terminal) |
| Superagente | Manutenção geral | dependências, branding, lint, docs, ferramentas de build |
| Humanos (Ysa, Relicablu etc.) | Features | código de UI e features novas via PR |

## Regras

1. Não comite direto em área do outro agente sem avisar em `COMMS.md`.
2. Antes de começar qualquer tarefa, leia `COMMS.md` (mensagens não lidas no topo).
3. Ao terminar uma tarefa ou precisar de algo, deixe mensagem em `COMMS.md`.
4. Toda mensagem deve ter: `@destinatário`, autor, data/hora (UTC) e tópico.
5. Ao responder, marque a mensagem original como respondida (risca o item `~-Respondido~`).
6. Nunca comite segredos. Credenciais ficam no cofre `acodex-secrets` ou em GitHub secrets.

## Decisões registradas (fonte da verdade)

- 2026-10-10: HTTP nativo (advanced-http) nas chamadas IA — CORS bloqueia fetch no WebView Android.
- 2026-10-10: Keystore debug persistente via actions/cache — assinatura fixa entre builds.
- 2026-10-10: Chave NVIDIA embutida via secret `NVAPI_BUILTIN` no build; chave local do usuário sempre tem prioridade.
- 2026-10-10: Solas é o dono do backend. Mudanças de contrato em `src/lib/acodexAi/` precisam de mensagem prévia em COMMS.md.
