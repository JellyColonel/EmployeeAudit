/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export type Lang = "en" | "ru";

/**
 * Проблемы разбора отчёта. Парсер возвращает коды, а не готовый текст, чтобы
 * не зависеть от языка интерфейса: перевод накладывается уже при показе.
 */
export type AuditIssue =
    | { code: "no-report-embed"; }
    | { code: "missing-name-field"; }
    | { code: "unparsable-name"; value: string; }
    | { code: "missing-rank-field"; }
    | { code: "unparsable-ranks"; value: string; }
    | { code: "no-user-mention"; }
    | { code: "rank-out-of-table"; rank: number; name: string; }
    | { code: "rank-name-mismatch"; rank: number; name: string; expected: string; }
    | { code: "rank-jump"; from: number; to: number; };

const UI = {
    en: {
        pluginDescription: "Builds an employee audit record from a promotion report (Hospital faction, Russia Online)",
        menuLabel: "Copy Employee Audit",
        copied: "Employee audit copied",
        inserted: "Employee audit inserted into the chat box",

        promoterName: "Your in-game first and last name — the «Повышает» line",
        promoterStatic: "Your Static ID",
        promoterId: "Your Discord ID. Leave empty to use the current account",
        promoterIdPlaceholder: "automatic",
        channelIds: "Channel IDs where the menu item is shown, comma-separated. Empty — every channel",
        channelIdsPlaceholder: "every channel",
        action: "What clicking the item does",
        actionCopy: "Copy to clipboard",
        actionInsert: "Insert into the chat box",
        actionBoth: "Both",
        template: "Audit template. Placeholders: {promoterId} {promoterName} {promoterStatic} {targetId} {targetName} {targetStatic} {oldRank} {newRank} {reportLink}",
        language: "Interface language of this plugin"
    },
    ru: {
        pluginDescription: "Собирает текст кадрового аудита из отчёта на повышение (фракция «Больница», Russia Online)",
        menuLabel: "Скопировать кадровый аудит",
        copied: "Кадровый аудит скопирован",
        inserted: "Кадровый аудит вставлен в поле ввода",

        promoterName: "Ваше имя и фамилия — строка «Повышает»",
        promoterStatic: "Ваш Static ID",
        promoterId: "Ваш Discord ID. Пусто — берётся текущий аккаунт",
        promoterIdPlaceholder: "автоматически",
        channelIds: "ID каналов, где показывать пункт меню (через запятую). Пусто — во всех каналах",
        channelIdsPlaceholder: "во всех каналах",
        action: "Что делать по клику",
        actionCopy: "Скопировать в буфер обмена",
        actionInsert: "Вставить в поле ввода",
        actionBoth: "И то, и другое",
        template: "Шаблон аудита. Плейсхолдеры: {promoterId} {promoterName} {promoterStatic} {targetId} {targetName} {targetStatic} {oldRank} {newRank} {reportLink}",
        language: "Язык интерфейса плагина"
    }
} satisfies Record<Lang, Record<string, string>>;

export type UiKey = keyof typeof UI["en"];

export function t(key: UiKey, lang: Lang): string {
    return UI[lang][key];
}

/**
 * Названия полей отчёта и строки аудита остаются русскими в обоих языках:
 * это игровой текст, пользователь ищет их глазами именно в таком виде.
 */
const ISSUES: Record<Lang, (issue: AuditIssue) => string> = {
    en: issue => {
        switch (issue.code) {
            case "no-report-embed":
                return "This message has no promotion report embed";
            case "missing-name-field":
                return "Report is missing the «Имя Фамилия | Static ID» field";
            case "unparsable-name":
                return `Could not parse name and Static ID: «${issue.value}»`;
            case "missing-rank-field":
                return "Report is missing the rank field";
            case "unparsable-ranks":
                return `Could not parse ranks: «${issue.value}»`;
            case "no-user-mention":
                return "No user mention in the report — cannot tell who was promoted";
            case "rank-out-of-table":
                return `Rank ${issue.rank} («${issue.name}») is outside the mid-level range (4–11)`;
            case "rank-name-mismatch":
                return `Rank ${issue.rank} is «${issue.name}» in the report, but «${issue.expected}» in the rank table`;
            case "rank-jump":
                return `Promotion is not by a single rank: ${issue.from} → ${issue.to}`;
        }
    },
    ru: issue => {
        switch (issue.code) {
            case "no-report-embed":
                return "В сообщении нет embed'а отчёта на повышение";
            case "missing-name-field":
                return "В отчёте нет поля «Имя Фамилия | Static ID»";
            case "unparsable-name":
                return `Не удалось разобрать имя и Static ID: «${issue.value}»`;
            case "missing-rank-field":
                return "В отчёте нет поля с рангами";
            case "unparsable-ranks":
                return `Не удалось разобрать ранги: «${issue.value}»`;
            case "no-user-mention":
                return "В отчёте нет упоминания повышаемого — некого подставить в «Повышен(а)»";
            case "rank-out-of-table":
                return `Ранг ${issue.rank} («${issue.name}») вне диапазона среднего состава (4–11)`;
            case "rank-name-mismatch":
                return `Ранг ${issue.rank} в отчёте назван «${issue.name}», в таблице рангов — «${issue.expected}»`;
            case "rank-jump":
                return `Повышение не на один ранг: ${issue.from} → ${issue.to}`;
        }
    }
};

export function formatIssue(issue: AuditIssue, lang: Lang): string {
    return ISSUES[lang](issue);
}

/** `auto` означает «как в Discord»: русский клиент → русский плагин. */
export function resolveLang(setting: string | undefined, discordLocale: string | undefined): Lang {
    if (setting === "en" || setting === "ru") return setting;
    return discordLocale?.toLowerCase().startsWith("ru") ? "ru" : "en";
}
