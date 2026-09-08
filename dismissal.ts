/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FIELD_DISCORD_ID, FIELD_DISMISSAL_INVENTORY, FIELD_DISMISSAL_NAME, FIELD_DISMISSAL_RANK, FIELD_DISMISSAL_REASON, FIELD_DISMISSAL_REQUEST } from "./constants";
import { type EmbedLike, findField, findFieldValue, type MessageLike, stripMarkdown } from "./embed";
import { type AuditIssue } from "./i18n";

export interface ParsedDismissal {
    /** Discord ID увольняемого — берётся из поля, а не из упоминания. */
    targetUserId: string;
    /** Отдел из ника: первый сегмент «ПСЭС | Ольга Юрьева | 66242». */
    department: string;
    name: string;
    staticId: string;
    rank: number;
    reason: string;
    /** Ссылка на скриншоты инвентаря; в аудит не идёт, но бывает нужна глазами. */
    inventoryLink: string;
}

export type DismissalResult =
    | { ok: true; dismissal: ParsedDismissal; }
    | { ok: false; issue: AuditIssue; };

/**
 * Заявление опознаётся по набору полей, а не по заголовку: у этого embed'а его
 * нет вовсе. Пара «запрашивает увольнение» плюс «причина увольнения» достаточно
 * специфична, чтобы не спутать её с чем-то ещё, и переживёт смену бота.
 */
export function findDismissalEmbed(message: MessageLike): EmbedLike | null {
    return message.embeds?.find(e =>
        findField(e, FIELD_DISMISSAL_REQUEST) !== null
        && findField(e, FIELD_DISMISSAL_REASON) !== null) ?? null;
}

export function isDismissalRequest(message: MessageLike): boolean {
    return findDismissalEmbed(message) !== null;
}

/**
 * `ПСЭС | Ольга Юрьева | 66242` — в заявлении это ник целиком, с отделом, тогда
 * как в отчёте на повышение то же поле содержит только `Имя | Static`. Отдел
 * необязателен: без него разбираются те же две части.
 */
export function parseNickParts(value: string): { department: string; name: string; staticId: string; } | null {
    const parts = stripMarkdown(value).split("|").map(part => part.trim());
    if (parts.length < 2) return null;

    const staticId = parts[parts.length - 1];
    const name = parts[parts.length - 2];
    const department = parts.length > 2 ? parts.slice(0, -2).join(" | ") : "";

    if (!name || !staticId) return null;
    return { department, name, staticId };
}

/** `<@100…>` или `` `100…` `` — ID увольняемого в любом из двух видов. */
export function parseUserId(value: string): string | null {
    const match = /(\d{17,20})/.exec(stripMarkdown(value));
    return match ? match[1] : null;
}

export function parseDismissal(message: MessageLike): DismissalResult {
    const embed = findDismissalEmbed(message);
    if (!embed) return { ok: false, issue: { code: "no-dismissal-embed" } };

    // ID есть отдельным полем, поэтому упоминание из content — только запасной
    // вариант: поле надёжнее, оно не зависит от того, кого ещё упомянули.
    const idValue = findFieldValue(embed, FIELD_DISCORD_ID) || findFieldValue(embed, FIELD_DISMISSAL_REQUEST);
    const targetUserId = parseUserId(idValue) ?? parseUserId(message.content ?? "");
    if (!targetUserId) return { ok: false, issue: { code: "no-user-mention" } };

    const nameValue = findFieldValue(embed, FIELD_DISMISSAL_NAME);
    if (!nameValue) return { ok: false, issue: { code: "missing-name-field" } };

    const parts = parseNickParts(nameValue);
    if (!parts) return { ok: false, issue: { code: "unparsable-name", value: nameValue } };

    const rankValue = findFieldValue(embed, FIELD_DISMISSAL_RANK);
    const rankMatch = /(\d{1,2})/.exec(stripMarkdown(rankValue));
    if (!rankMatch) return { ok: false, issue: { code: "unparsable-ranks", value: rankValue } };

    return {
        ok: true,
        dismissal: {
            targetUserId,
            ...parts,
            rank: Number(rankMatch[1]),
            reason: stripMarkdown(findFieldValue(embed, FIELD_DISMISSAL_REASON)),
            inventoryLink: stripMarkdown(findFieldValue(embed, FIELD_DISMISSAL_INVENTORY))
        }
    };
}
