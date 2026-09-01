#!/usr/bin/env bash
# Собирает Vencord с плагином и публикует релиз с готовым к установке архивом.
# Архив рассчитан на человека без git, Node и прочих инструментов: внутри
# сборка и install.bat, который сам делает резервную копию.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
VENCORD_REPO="${VENCORD_REPO:-$HOME/projects/Vencord}"
BUILD_FLAGS="${BUILD_FLAGS:---disable-updater}"
TAG="${1:-v$(date +%Y.%m.%d)}"

DIST_FILES=(
    patcher.js patcher.js.map patcher.js.LEGAL.txt
    preload.js preload.js.map
    renderer.js renderer.js.map renderer.js.LEGAL.txt
    renderer.css renderer.css.map
)

[ -d "$VENCORD_REPO" ] || { echo "Нет репозитория Vencord: $VENCORD_REPO" >&2; exit 1; }

echo "==> Сборка в $VENCORD_REPO ($BUILD_FLAGS)"
cd "$VENCORD_REPO"
corepack pnpm build $BUILD_FLAGS
VENCORD_HASH="$(git -C "$VENCORD_REPO" rev-parse --short HEAD)"

STAGE="$(mktemp -d)"
trap 'rm -rf "$STAGE"' EXIT
PKG="$STAGE/EmployeeAudit"
mkdir -p "$PKG/dist"

for f in "${DIST_FILES[@]}"; do
    cp "$VENCORD_REPO/dist/$f" "$PKG/dist/$f"
done
cp "$REPO_ROOT"/dist-package/install.bat "$REPO_ROOT"/dist-package/install.ps1 \
   "$REPO_ROOT"/dist-package/update.bat "$REPO_ROOT"/dist-package/update.ps1 \
   "$REPO_ROOT"/dist-package/README.txt "$PKG/"

ZIP="$REPO_ROOT/EmployeeAudit-$TAG.zip"
rm -f "$ZIP"
python3 - "$STAGE" "$ZIP" << 'PY'
import os, sys, zipfile
stage, out = sys.argv[1], sys.argv[2]
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for root, _, files in os.walk(stage):
        for name in files:
            full = os.path.join(root, name)
            z.write(full, os.path.relpath(full, stage))
PY

echo "==> Архив: $ZIP ($(du -h "$ZIP" | cut -f1))"

PLUGIN_HASH="$(git -C "$REPO_ROOT" rev-parse --short HEAD)"
gh release create "$TAG" "$ZIP" \
    --repo JellyColonel/EmployeeAudit \
    --title "EmployeeAudit $TAG" \
    --notes "$(cat <<NOTES
Готовая к установке сборка Vencord с плагином EmployeeAudit.

## Установка

1. Скачать \`$(basename "$ZIP")\`, распаковать.
2. Полностью закрыть Discord: трей → Quit.
3. Запустить \`install.bat\`.
4. В Discord включить плагин: Настройки → Vencord → Plugins → EmployeeAudit,
   затем вписать в его настройках своё имя и Static ID.

Обновляться потом — \`update.bat\`, он скачивает последний релиз сам.
Подробности в \`README.txt\` внутри архива.

Нужен уже установленный Vencord: https://vencord.dev

## Состав

- Vencord \`$VENCORD_HASH\` — https://github.com/Vendicated/Vencord
- Плагин \`$PLUGIN_HASH\` — собран с \`$BUILD_FLAGS\`

Встроенный апдейтер Vencord в сборке отключён: он всё равно неработоспособен,
когда \`dist\` подменён, и без флага показывал бы ошибку.

Лицензия GPL-3.0-or-later, как у Vencord.
NOTES
)"

echo "==> Релиз $TAG опубликован"
rm -f "$ZIP"
