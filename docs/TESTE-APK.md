# Esqueleto de Teste do APK (Acode normal)

Guia rápido para validar cada build antes de usar no dia a dia.
Baixe o APK em: https://github.com/rlkbiloga-coder/acode_original/releases/tag/latest-apk (arquivo `acode.apk`)

## 0. Pré-instalação (automático)
- [ ] CI verde no commit que gerou o APK (actions do repo)
- [ ] `acode.apk` atualizado na data do build (tamanho esperado: ~43 MB)
- [ ] Rodar `utils/scripts/apk_check.sh acode.apk` (ou o passo 1 do checklist manual)

## 1. Instalação
- [ ] Desinstalar versões antigas ANTES deste primeiro build com chave nova
- [ ] Instala o APK e abre sem erro "app não instalado"
- [ ] Ícone do Acode aparece corretamente no launcher (não ícone genérico)
- [ ] Nome do app aparece como "Acode"

## 2. Smoke básico
- [ ] Cria um arquivo novo e salva
- [ ] Syntax highlight funciona (abrir um .js ou .py)
- [ ] Abrir uma pasta e navegar pelos arquivos
- [ ] Trocar tema e idioma nas configurações

## 3. Funcionalidades-chave
- [ ] Terminal embutido abre e executa um comando (ex: `ls`)
- [ ] Preview de HTML no browser interno
- [ ] Instalar/abrir um plugin
- [ ] Buscar e substituir texto

## 4. Atualização (chave estável)
- [ ] Com o app instalado, baixar um APK novo e instalar POR CIMA
- [ ] Deve atualizar sem pedir desinstalação

## Rollback (se algo der erro)
- APK da versão anterior que funcionava: asset `backup-thcode-2026-10-02.apk` no mesmo release
- Código-fonte do estado anterior: tag `backup/pre-acode-normal-2026-10-02`
  - Restaurar: `git checkout backup/pre-acode-normal-2026-10-02 -- .` e abrir PR de reversão
- Se o CI/build falhar: nada no seu aparelho mudou, só corrigir e rebuildar
