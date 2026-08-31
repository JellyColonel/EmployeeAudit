#!/usr/bin/env bash
# Собирает Vencord в WSL и подкладывает результат в тот dist, который читает
# пропатченный Discord на Windows.
#
# Работает потому, что установщик Vencord подменил app.asar заглушкой
#   require("C:\Users\<user>\AppData\Roaming\Vencord\dist\patcher.js")
# то есть Discord грузит ровно эту папку, а она пишется из WSL. Node на Windows
# для этого не нужен, `pnpm inject` тоже — инжект уже сделан установщиком.
set -euo pipefail

VENCORD_REPO="${VENCORD_REPO:-$HOME/projects/Vencord}"
WIN_USER="${WIN_USER:-Valeriu}"
TARGET="${TARGET:-/mnt/c/Users/$WIN_USER/AppData/Roaming/Vencord/dist}"

[ -d "$VENCORD_REPO" ] || { echo "Нет репозитория Vencord: $VENCORD_REPO" >&2; exit 1; }
[ -d "$TARGET" ] || { echo "Нет папки Vencord на Windows: $TARGET" >&2; exit 1; }

echo "==> Сборка в $VENCORD_REPO"
cd "$VENCORD_REPO"
corepack pnpm build

BACKUP="$TARGET.bak-$(date +%Y%m%d-%H%M%S)"
echo "==> Резервная копия: $BACKUP"
cp -r "$TARGET" "$BACKUP"

# Копируем только файлы desktop-сборки. vencordDesktop* — это Vesktop, он не нужен.
# package.json в целевой папке не трогаем: его кладёт установщик Vencord.
echo "==> Копирование dist"
for f in patcher.js patcher.js.map patcher.js.LEGAL.txt \
         preload.js preload.js.map \
         renderer.js renderer.js.map renderer.js.LEGAL.txt \
         renderer.css renderer.css.map; do
    cp -f "$VENCORD_REPO/dist/$f" "$TARGET/$f"
done

echo
echo "Готово. Теперь на Windows:"
echo "  1. Полностью закрыть Discord (трей → Quit, не просто крестик)"
echo "  2. Запустить заново"
echo "  3. Настройки → Vencord → Plugins → включить EmployeeAudit"
echo
echo "Откатиться: cp -f $BACKUP/* $TARGET/"
