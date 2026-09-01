#!/usr/bin/env bash
# Собирает Vencord в WSL и подкладывает результат в тот dist, который читает
# пропатченный Discord на Windows.
#
# Работает потому, что установщик Vencord подменил app.asar заглушкой
#   require("C:\Users\<user>\AppData\Roaming\Vencord\dist\patcher.js")
# то есть Discord грузит ровно эту папку. Путь виндовый, но из WSL он доступен на
# запись через /mnt/c, поэтому собранный здесь dist кладётся туда напрямую.
# Node на Windows для этого не нужен, `pnpm inject` тоже — инжект уже сделан
# установщиком.
set -euo pipefail

VENCORD_REPO="${VENCORD_REPO:-$HOME/projects/Vencord}"
WIN_USER="${WIN_USER:-Valeriu}"
TARGET="${TARGET:-/mnt/c/Users/$WIN_USER/AppData/Roaming/Vencord/dist}"

[ -d "$VENCORD_REPO" ] || { echo "Нет репозитория Vencord: $VENCORD_REPO" >&2; exit 1; }
[ -d "$TARGET" ] || { echo "Нет папки Vencord на Windows: $TARGET" >&2; exit 1; }

# --standalone: без него esbuild подставляет process.platform константой сборки.
# Мы собираем в WSL, значит в сборку попадёт "linux", виндовые ветки Vencord
# свернутся в false и будут выброшены — winCtrlQ, winNativeTitleBar и
# windowsMaterial перестают работать. С флагом платформа остаётся рантайм-
# проверкой, и сборка корректна на Windows.
#
# --disable-updater: апдейтер Vencord в подменённом dist всё равно нерабочий —
# git-апдейтер ищет репозиторий в %APPDATA%\Vencord, где его нет. Без флага
# вкладка Updater висит с ошибкой; с флагом она просто не создаётся.
# Он же снимает единственный минус --standalone: standalone-сборка выбрала бы
# http-апдейтер, который мог бы перезаписать нашу сборку.
BUILD_FLAGS="${BUILD_FLAGS:---standalone --disable-updater}"

echo "==> Сборка в $VENCORD_REPO ($BUILD_FLAGS)"
cd "$VENCORD_REPO"
corepack pnpm build $BUILD_FLAGS

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
