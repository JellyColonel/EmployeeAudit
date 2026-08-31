// Vencord собирается esbuild'ом и использует импорты без расширений.
// Node так не умеет, поэтому для тестов дорезолвиваем «./foo» → «./foo.ts».
import { registerHooks } from "node:module";

registerHooks({
    resolve(specifier, context, nextResolve) {
        if (specifier.startsWith(".") && !/\.[cm]?[jt]sx?$/.test(specifier)) {
            try {
                return nextResolve(specifier + ".ts", context);
            } catch { /* падаем в обычное разрешение ниже */ }
        }
        return nextResolve(specifier, context);
    }
});
