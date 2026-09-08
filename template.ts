/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

export interface AuditData {
    promoterId: string;
    promoterName: string;
    promoterStatic: string;
    targetId: string;
    /** Discord-хендл повышаемого без «@» (`jellycolonel`), из UserStore. */
    targetUsername: string;
    targetName: string;
    targetStatic: string;
    oldRank: number | string;
    newRank: number | string;
    reportLink: string;
}

/** Кадровый аудит текстом — так он писался руками, пока не появился бот. */
export const DEFAULT_TEMPLATE = [
    "Повышение",
    "Повышает: <@{promoterId}> {promoterName} | {promoterStatic}",
    "Повышен(а): <@{targetId}> {targetName} | {targetStatic}",
    "Прежний ранг: {oldRank}",
    "Новый ранг: {newRank}",
    "Причина повышения: {reportLink}"
].join("\n");

/**
 * Вызов slash-команды бота, заполняющего аудит.
 *
 * Аргументы именованные (`пользователь:…`), потому что вставленный текст Discord
 * в аргументы команды не разбирает: имена нужны, чтобы после выбора команды в
 * поле ввода значения встали по своим местам, а не в первый попавшийся аргумент.
 * Повышающий здесь не указывается — бот берёт его из того, кто вызвал команду.
 *
 * Повышаемый передаётся упоминанием `<@id>`, а не хендлом: аргумент типа USER
 * заполняется из него сразу и правильно, тогда как текстовый `@хендл` остаётся
 * текстом и пользователя приходится доводить руками. Проверено вживую 08.09.2026.
 * `{targetUsername}` из-за этого в шаблоне по умолчанию не нужен, но остаётся
 * доступным — шаблон правится под себя.
 */
export const DEFAULT_COMMAND_TEMPLATE =
    "/повышение пользователь:<@{targetId}> был:{oldRank} стал:{newRank} причина:{reportLink}";

/** Данные увольнения для подстановки в шаблон команды. */
export interface DismissalData {
    targetId: string;
    targetName: string;
    targetStatic: string;
    /** Отдел из ника заявителя — тот, что будет заменён на «Гр.». */
    department: string;
    rank: number | string;
    /** Причина, которую человек написал в заявлении. */
    reason: string;
    /** Ссылка на само заявление — она и идёт в аргумент «причина». */
    reportLink: string;
    inventoryLink: string;
}

/**
 * Вызов команды бота, оформляющего увольнение. Ранг здесь один — тот, что был
 * на момент увольнения; «причина» у бота означает ссылку на заявление, а не
 * текст, который написал сам увольняющийся.
 */
export const DEFAULT_DISMISSAL_COMMAND_TEMPLATE =
    "/увольнение пользователь:<@{targetId}> ранг:{rank} причина:{reportLink}";

/** Ссылка на сообщение-отчёт, идущая в строку «Причина повышения». */
export function messageLink(guildId: string | null | undefined, channelId: string, messageId: string): string {
    return `https://discord.com/channels/${guildId ?? "@me"}/${channelId}/${messageId}`;
}

/** Подстановка `{ключ}` из данных; неизвестные плейсхолдеры остаются как есть. */
export function renderTemplate(template: string, data: Record<string, string | number>): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in data ? String(data[key]) : whole);
}

export function renderAudit(template: string, data: AuditData): string {
    return renderTemplate(template, data as unknown as Record<string, string | number>);
}

export function renderDismissal(template: string, data: DismissalData): string {
    return renderTemplate(template, data as unknown as Record<string, string | number>);
}

/** Использует ли шаблон хоть один из перечисленных плейсхолдеров. */
export function usesPlaceholder(template: string, ...keys: (keyof AuditData)[]): boolean {
    return keys.some(key => template.includes(`{${key}}`));
}
