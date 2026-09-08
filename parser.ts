/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { FIELD_NAME_STATIC, FIELD_RANKS, REPORT_TITLE } from "./constants";
import { type AuditIssue } from "./i18n";
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

/**
 * Откуда взяты данные. `embed` — отчёт бота «Ева Повышаловна»; `short` — заявка,
 * написанная руками: упоминание, ранги строкой `3-4`, ссылка на отчёт и пинги
 * ролей, которые в аудит не идут.
 */
export type ReportSource = "embed" | "short";

export interface ParsedReport {
    /** Discord ID повышаемого; null, если упоминания в content не оказалось. */
    targetUserId: string | null;
    /** Имя и статик есть только в embed-отчёте: в короткой заявке их не пишут. */
    name: string;
    staticId: string;
    oldRank: number;
    newRank: number;
    oldRankName: string;
    newRankName: string;
    /**
     * Ссылка-причина из текста заявки. У embed-отчёта её нет: там причиной
     * служит ссылка на само сообщение с отчётом.
     */
    reportLink?: string;
    source: ReportSource;
}

export type ParseResult =
    /** `warnings` не блокируют копирование — это сигналы о странном отчёте. */
    | { ok: true; report: ParsedReport; warnings: AuditIssue[]; }
    | { ok: false; issue: AuditIssue; };

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

/** `Артур Белов | 10001` → имя и статик. Разделителем считается последний `|`. */
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
 * Discord ID повышаемого. Упоминания ролей (`<@&…>`) не считаются — в отчёте
 * первым идёт пинг проверяющих, а в заявке роли стоят последней строкой.
 *
 * Поэтому сторона выбирается по формату: в отчёте (`<@&роль> | <@пользователь>`)
 * повышаемый последний, в заявке — первый, ещё до ссылки и пингов.
 */
export function parseTargetUserId(content: string, pick: "first" | "last" = "last"): string | null {
    const mentions = [...content.matchAll(/<@!?(\d+)>/g)];
    if (!mentions.length) return null;
    return pick === "first" ? mentions[0][1] : mentions[mentions.length - 1][1];
}

/**
 * Ранги короткой заявки: `3-4` отдельной строкой. Строка должна состоять только
 * из них — иначе «с 3-4 попытки» в обычном сообщении сошло бы за заявку.
 */
export function parseShortRanks(content: string): { oldRank: number; newRank: number; } | null {
    for (const line of content.split(/\r?\n/)) {
        const match = /^\s*(\d{1,2})\s*(?:-{1,2}>?|=>|[–—→>])\s*(\d{1,2})\s*$/.exec(line);
        if (match) return { oldRank: Number(match[1]), newRank: Number(match[2]) };
    }
    return null;
}

/** Первая ссылка на сообщение Discord в тексте — она и есть причина повышения. */
export function parseMessageLink(content: string): string | null {
    const match = /https?:\/\/(?:[\w-]+\.)?discord(?:app)?\.com\/channels\/(?:\d+|@me)\/\d+\/\d+/.exec(content);
    return match ? match[0] : null;
}

/** Похоже ли сообщение на короткую заявку: упоминание плюс строка рангов. */
export function isShortPromotion(message: MessageLike): boolean {
    const content = message.content ?? "";
    return findReportEmbed(message) === null
        && parseShortRanks(content) !== null
        && parseTargetUserId(content, "first") !== null;
}

/** Оба формата разом — по этому признаку показывается пункт меню. */
export function looksLikePromotion(message: MessageLike): boolean {
    return isPromotionReport(message) || isShortPromotion(message);
}

export function parseReport(message: MessageLike): ParseResult {
    const embed = findReportEmbed(message);
    if (!embed) return parseShortReport(message);

    const nameField = findField(embed, FIELD_NAME_STATIC);
    if (!nameField) return { ok: false, issue: { code: "missing-name-field" } };

    const nameStatic = parseNameStatic(fieldValue(nameField));
    if (!nameStatic) return { ok: false, issue: { code: "unparsable-name", value: fieldValue(nameField) } };

    const rankField = findField(embed, FIELD_RANKS);
    if (!rankField) return { ok: false, issue: { code: "missing-rank-field" } };

    const ranks = parseRanks(fieldValue(rankField));
    if (!ranks) return { ok: false, issue: { code: "unparsable-ranks", value: fieldValue(rankField) } };

    return {
        ok: true,
        report: {
            targetUserId: parseTargetUserId(message.content ?? ""),
            ...nameStatic,
            ...ranks,
            source: "embed"
        },
        warnings: validateRanks(ranks.oldRank, ranks.newRank, ranks.oldRankName, ranks.newRankName)
    };
}

/**
 * Короткая заявка. Имени и статика в ней нет — они остаются пустыми, а
 * названий рангов нет вовсе, поэтому сверять с таблицей нечего: проверяются
 * только номера.
 */
function parseShortReport(message: MessageLike): ParseResult {
    const content = message.content ?? "";

    const ranks = parseShortRanks(content);
    if (!ranks) return { ok: false, issue: { code: "no-report-embed" } };

    const targetUserId = parseTargetUserId(content, "first");
    if (!targetUserId) return { ok: false, issue: { code: "no-user-mention" } };

    const reportLink = parseMessageLink(content);
    if (!reportLink) return { ok: false, issue: { code: "no-report-link" } };

    return {
        ok: true,
        report: {
            targetUserId,
            name: "",
            staticId: "",
            oldRankName: "",
            newRankName: "",
            reportLink,
            source: "short",
            ...ranks
        },
        warnings: validateRanks(ranks.oldRank, ranks.newRank)
    };
}
