/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Заглушки модулей Vencord: ровно столько, сколько нужно, чтобы settings.ts
// импортировался вне Discord и мы могли проверить, что модуль вообще грузится.

export const OptionType = { STRING: 0, NUMBER: 1, BIGINT: 2, BOOLEAN: 3, SELECT: 4, SLIDER: 5, COMPONENT: 6, CUSTOM: 7 };

/** Подставной LocaleStore; тест переключает язык через setLocale. */
export const LocaleStore = { locale: "en-US" };
export function setLocale(locale) {
    LocaleStore.locale = locale;
}

/**
 * Урезанный definePluginSettings: собирает store из default'ов, как настоящий.
 * Важно, что определения он не копирует спредом — иначе заглушка сама вычислила
 * бы геттеры и тест перестал бы ловить то, ради чего написан.
 */
export function definePluginSettings(definition) {
    const store = {};
    for (const key of Object.keys(definition)) {
        const def = definition[key];
        if ("default" in def) store[key] = def.default;
        else if (def.options) store[key] = def.options.find(o => o.default)?.value;
    }
    return { def: definition, store };
}
