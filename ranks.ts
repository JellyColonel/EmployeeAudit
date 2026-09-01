/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Ранги отдела «Скорая Медицинская Помощь» (средний состав, 4–11). */
export const SMP_RANKS: Record<number, string> = {
    4: "Фельдшер",
    5: "Ординатор",
    6: "Старший ординатор",
    7: "Психиатр",
    8: "Терапевт",
    9: "Хирург",
    10: "Зам. зав. отделением",
    11: "Заведующий отделением"
};

function normalizeRankName(name: string): string {
    return name.toLowerCase().replace(/ё/g, "е").replace(/[.\s]+/g, " ").trim();
}

/**
 * Сверяет разобранные ранги с таблицей СМП. Ничего не блокирует — возвращает
 * предупреждения, чтобы кривой отчёт был виден до отправки аудита.
 */
export function validateRanks(
    oldRank: number, newRank: number, oldRankName: string, newRankName: string
): string[] {
    const warnings: string[] = [];

    const checks: [number, string][] = [[oldRank, oldRankName], [newRank, newRankName]];
    for (const [rank, name] of checks) {
        const expected = SMP_RANKS[rank];
        if (!expected) {
            warnings.push(`Rank ${rank} («${name}») is outside the EMS table (4–11)`);
        } else if (normalizeRankName(expected) !== normalizeRankName(name)) {
            warnings.push(`Rank ${rank} is «${name}» in the report, but «${expected}» in the EMS table`);
        }
    }

    if (newRank !== oldRank + 1) {
        warnings.push(`Promotion is not by a single rank: ${oldRank} → ${newRank}`);
    }

    return warnings;
}
