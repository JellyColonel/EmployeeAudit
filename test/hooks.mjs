/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Vencord собирается esbuild'ом и использует импорты без расширений.
// Node так не умеет, поэтому для тестов дорезолвиваем «./foo» → «./foo.ts».
import { registerHooks } from "node:module";

// Модули Vencord подменяются заглушками: под Node их не существует.
const VENCORD_STUBS = new Set(["@api/Settings", "@utils/types", "@webpack/common"]);

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (VENCORD_STUBS.has(specifier)) {
            return nextResolve("./stubs/vencord.mjs", { ...context, parentURL: import.meta.url });
        }

        if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
            try {
                return nextResolve(specifier + ".ts", context);
            } catch { /* падаем в обычное разрешение ниже */ }
        }
        return nextResolve(specifier, context);
    }
});
