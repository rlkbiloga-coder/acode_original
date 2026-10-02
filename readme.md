<div align="center">
  <img src="res/logo_1.png" width="180" alt="Acode">

  <h1>Thcode · Acode Editor</h1>
  <p><b>Editor de código para Android, com 10 bots de IA integrados</b></p>

  <a href="https://github.com/rlkbiloga-coder/acode_original/releases"><img src="https://img.shields.io/badge/versão-2.0.0-blue?style=flat-square" alt="versão"></a>
  <a href="https://github.com/rlkbiloga-coder/acode_original/actions"><img src="https://img.shields.io/github/actions/workflow/status/rlkbiloga-coder/acode_original/ci.yml?style=flat-square&label=CI" alt="CI"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/licen%C3%A7a-MIT-green?style=flat-square" alt="licença"></a>
  <a href="https://rlkbiloga-coder.github.io/acode_original/"><img src="https://img.shields.io/badge/site-online-purple?style=flat-square" alt="site"></a>
  <a href="https://github.com/rlkbiloga-coder/acode_original/releases/tag/latest-apk"><img src="https://img.shields.io/badge/download-APK-blue?style=flat-square" alt="APK"></a>
  <a href="https://github.com/rlkbiloga-coder/acode_original/blob/main/CONTRIBUTING.md"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=flat-square" alt="PRs"></a>
  <a href="https://github.com/rlkbiloga-coder/acode_original/stargazers"><img src="https://img.shields.io/github/stars/rlkbiloga-coder/acode_original?style=flat-square" alt="stars"></a>
  <a href="https://github.com/rlkbiloga-coder/acode_original/network/members"><img src="https://img.shields.io/github/forks/rlkbiloga-coder/acode_original?style=flat-square" alt="forks"></a>
  <a href="https://github.com/rlkbiloga-coder/acode_original/commits/main"><img src="https://img.shields.io/github/last-commit/rlkbiloga-coder/acode_original?style=flat-square" alt="last commit"></a>
</div>

---

## Visão geral

Editor de código mobile completo para criar sites e programar em qualquer lugar, direto do celular. Edita HTML, CSS, JavaScript, Python, Java e dezenas de outras linguagens, com preview em tempo real, console embutido, terminal e plugins.

É um fork avançado do editor de código aberto Acode, mantido de forma independente, com a interface do app original preservada e a adição de um painel de IA próprio.

Site oficial: https://rlkbiloga-coder.github.io/acode_original/

## Recursos

- Edição de arquivos em dezenas de linguagens, com destaque de sintaxe
- Preview em tempo real de sites direto no editor
- Console JavaScript embutido
- Terminal Alpine integrado
- S/FTP e SSH para arquivos remotos
- Sistema de plugins com muitos disponíveis
- Suporte a mais de 30 idiomas na interface
- Modo escuro e temas
- Interface idêntica ao app original, fluida no Android

## Bots IA Integrados

Painel de IA no menu lateral, com 10 bots, um para cada ocasião:

1. **Assistente** — dúvidas gerais de código
2. **Corretor de Bugs** — encontra e corrige erros
3. **Explicador** — explica o que o código faz
4. **Refatorador** — melhora a estrutura do código
5. **Gerador de Testes** — cria testes automatizados
6. **Documentador** — gera comentários e documentação
7. **Commit** — mensagens no padrão Conventional Commits
8. **Professor** — ensina conceitos com exercícios
9. **Regex** — cria e decifra expressões regulares
10. **Otimizador** — aponta gargalos de performance

### Como usar os bots

1. Compile o app e abra o painel "Bots IA" na barra lateral.
2. Toque na engrenagem e configure o provedor: Groq, OpenRouter, OpenAI ou qualquer API compatível com OpenAI.
3. A chave da API fica salva apenas no aparelho (`localStorage`) e é enviada direto ao provedor.
4. O arquivo aberto no editor é enviado como contexto automaticamente (pode ser desativado no painel).

Sem chave configurada, o bot avisa e abre as configurações. Nada de respostas inventadas.

## Compilação

Requisitos: Node.js 20+, JDK 17 e Android SDK (para o APK).

```bash
git clone https://github.com/rlkbiloga-coder/acode_original.git
cd acode_original
git submodule update --init --recursive
npm install
npm run build        # gera o app (www/)
npm run build:android # APK via Cordova (requer Android SDK)
```

Para desenvolvimento web local: `npm run dev`

## Estrutura do projeto

```
acode_original/
|- index.html, site/   - Site oficial (GitHub Pages)
|- src/                - Código do app, estilos e traduções
|- www/                - Arquivos compilados do app
|- utils/              - Scripts de build e CLI
|- codemirror-lsp-client/ - Submódulo (LSP do CodeMirror)
```

## Contribuição

Veja [CONTRIBUTING.md](CONTRIBUTING.md) para instruções detalhadas de como contribuir e compilar o projeto.
Consulte também o [Código de Conduta](CODE_OF_CONDUCT.md).

## Contribuidores

<a href="https://github.com/rlkbiloga-coder/acode_original/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=rlkbiloga-coder/acode_original" />
</a>

## Releases

Cada versão sai com tag e notas de lançamento:
https://github.com/rlkbiloga-coder/acode_original/releases

## Licença

MIT. Projeto derivado do editor Acode, mantido por rlkbiloga-coder.
