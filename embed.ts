/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Минимальные формы объектов Discord и общие приёмы разбора embed'ов. Отчёт на
 * повышение и заявление на увольнение приходят от разных ботов и устроены
 * по-разному, но читаются одинаково: поля ищутся по имени, значения чистятся
 * от markdown.
 */

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
    author?: { id?: string; username?: string; bot?: boolean; };
}

/** Приводит строку к виду, пригодному для сравнения: нижний регистр, «ё» → «е». */
export function normalize(text: string): string {
    return text.toLowerCase().replace(/ё/g, "е").replace(/\s+/g, " ").trim();
}

/**
 * Убирает markdown-обёртки, которыми боты выделяют значения: `**301**` у одного,
 * `` `6` `` у другого.
 */
export function stripMarkdown(text: string): string {
    return text.replace(/\*\*/g, "").replace(/^\s*[`*_~]+|[`*_~]+\s*$/g, "").trim();
}

export function fieldName(field: EmbedFieldLike): string {
    return field.rawName ?? field.name ?? "";
}

export function fieldValue(field: EmbedFieldLike): string {
    return field.rawValue ?? field.value ?? "";
}

/**
 * Поля ищутся по имени, а не по индексу: набор полей плавает от сообщения к
 * сообщению. Имена у второго бота заканчиваются на « :», поэтому регулярки
 * пишутся без якоря на конец.
 */
export function findField(embed: EmbedLike, pattern: RegExp): EmbedFieldLike | null {
    return embed.fields?.find(f => pattern.test(normalize(fieldName(f)))) ?? null;
}

/** Значение поля, найденного по имени; пустая строка, если поля нет. */
export function findFieldValue(embed: EmbedLike, pattern: RegExp): string {
    const field = findField(embed, pattern);
    return field ? fieldValue(field) : "";
}
