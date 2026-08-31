/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FIELD_NAME_STATIC, FIELD_RANKS, REPORT_TITLE } from "./constants";
import { validateRanks } from "./ranks";

/** Минимальные формы объектов Discord, которые нужны парсеру. */
export interface EmbedFieldLike {
    rawName?: string;
    rawValue?: string;
    name?: string;
    value?: string;
}

export interface EmbedLike {
    type?: string;
    rawTitle?: string;
    title?: string;
    fields?: EmbedFieldLike[];
}

export interface MessageLike {
    content?: string;
    embeds?: EmbedLike[];
}

export interface ParsedReport {
    /** Discord ID повышаемого; null, если упоминания в content не оказалось. */
    targetUserId: string | null;
    name: string;
    staticId: string;
    oldRank: number;
    newRank: number;
    oldRankName: string;
    newRankName: string;
}

export type ParseResult =
    /** `warnings` не блокируют копирование — это сигналы о странном отчёте. */
    | { ok: true; report: ParsedReport; warnings: string[]; }
    | { ok: false; error: string; };

/** Приводит строку к виду, пригодному для сравнения: нижний регистр, «ё» → «е». */
function normalize(text: string): string {
    return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/** Убирает markdown-обёртки, которыми бот выделяет значения (`**301**`). */
function stripMarkdown(text: string): string {
    return text.replace(/\*\*/g, "").replace(/^\s*[`*_~]+|[`*_~]+\s*$/g, "").trim();
}

function fieldName(field: EmbedFieldLike): string {
    return field.rawName ?? field.name ?? "";
}

function fieldValue(field: EmbedFieldLike): string {
    return field.rawValue ?? field.value ?? "";
}

/** Находит в сообщении embed отчёта на повышение. */
export function findReportEmbed(message: MessageLike): EmbedLike | null {
    const wanted = normalize(REPORT_TITLE);
    return message.embeds?.find(e => normalize(e.rawTitle ?? e.title ?? "") === wanted) ?? null;
}

export function isPromotionReport(message: MessageLike): boolean {
    return findReportEmbed(message) !== null;
}

function findField(embed: EmbedLike, pattern: RegExp): EmbedFieldLike | null {
    return embed.fields?.find(f => pattern.test(normalize(fieldName(f)))) ?? null;
}

/** `Евгений Курчатов | 45642` → имя и статик. Разделителем считается последний `|`. */
export function parseNameStatic(value: string): { name: string; staticId: string; } | null {
    const clean = stripMarkdown(value);
    const sep = clean.lastIndexOf("|");
    if (sep === -1) return null;

    const name = clean.slice(0, sep).trim();
    const staticId = clean.slice(sep + 1).trim();
    if (!name || !staticId) return null;

    return { name, staticId };
}

/** `Ординатор [5] → Старший ординатор [6]` → номера и названия рангов. */
export function parseRanks(value: string): {
    oldRank: number; newRank: number; oldRankName: string; newRankName: string;
} | null {
    const clean = stripMarkdown(value);
    const parts = clean.split(/\s*(?:→|-+>|—>|=+>)\s*/);
    if (parts.length !== 2) return null;

    const sides = parts.map(part => {
        const match = /^(.*?)\s*\[\s*(\d+)\s*\]\s*$/.exec(part.trim());
        if (!match) return null;
        return { name: match[1].trim(), rank: Number(match[2]) };
    });

    const [from, to] = sides;
    if (!from || !to) return null;

    return {
        oldRank: from.rank,
        newRank: to.rank,
        oldRankName: from.name,
        newRankName: to.name
    };
}

/**
 * Discord ID повышаемого из `content` вида `<@&роль> | <@пользователь>`.
 * Упоминания ролей (`<@&…>`) игнорируются; берётся последнее упоминание пользователя.
 */
export function parseTargetUserId(content: string): string | null {
    const mentions = [...content.matchAll(/<@!?(\d+)>/g)];
    return mentions.length ? mentions[mentions.length - 1][1] : null;
}

export function parseReport(message: MessageLike): ParseResult {
    const embed = findReportEmbed(message);
    if (!embed) return { ok: false, error: "В сообщении нет embed'а отчёта на повышение" };

    const nameField = findField(embed, FIELD_NAME_STATIC);
    if (!nameField) return { ok: false, error: "В отчёте нет поля «Имя Фамилия | Static ID»" };

    const nameStatic = parseNameStatic(fieldValue(nameField));
    if (!nameStatic) return { ok: false, error: `Не разобрать имя и статик: «${fieldValue(nameField)}»` };

    const rankField = findField(embed, FIELD_RANKS);
    if (!rankField) return { ok: false, error: "В отчёте нет поля с рангами" };

    const ranks = parseRanks(fieldValue(rankField));
    if (!ranks) return { ok: false, error: `Не разобрать ранги: «${fieldValue(rankField)}»` };

    return {
        ok: true,
        report: {
            targetUserId: parseTargetUserId(message.content ?? ""),
            ...nameStatic,
            ...ranks
        },
        warnings: validateRanks(ranks.oldRank, ranks.newRank, ranks.oldRankName, ranks.newRankName)
    };
}
