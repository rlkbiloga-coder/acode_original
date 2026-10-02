#!/usr/bin/env bash
# Verificação rápida de integridade do APK (funciona no Termux)
# Uso: ./utils/scripts/apk_check.sh caminho/do/acode.apk
set -e
APK="$1"
[ -n "$APK" ] || { echo "Uso: $0 caminho/do/acode.apk"; exit 1; }
[ -f "$APK" ] || { echo "ERROR: arquivo não encontrado"; exit 1; }
SIZE=$(stat -c%s "$APK" 2>/dev/null || stat -f%z "$APK")
[ "$SIZE" -lt 10000000 ] && { echo "ERROR: APK muito pequeno ($SIZE bytes)"; exit 1; }
unzip -t "$APK" > /dev/null || { echo "ERROR: APK não é um zip válido"; exit 1; }
for entry in AndroidManifest.xml resources.arsc; do
  unzip -l "$APK" | grep -q "$entry" || { echo "ERROR: falta $entry"; exit 1; }
done
unzip -l "$APK" | grep -q "classes.dex" || { echo "ERROR: falta classes.dex"; exit 1; }
echo "OK: APK íntegro ($(( SIZE / 1000000 )) MB), manifesto e código OK."
