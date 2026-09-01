/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { LocaleStore } from "@webpack/common";

import { DEFAULT_REPORT_CHANNEL_ID } from "./constants";
import { type Lang, resolveLang, t, type UiKey } from "./i18n";
import { DEFAULT_TEMPLATE } from "./template";

/**
 * Язык интерфейса плагина. `auto` берётся из языка Discord.
 * Читается лениво, потому что LocaleStore — ленивый стор Vencord и на момент
 * загрузки модуля может быть ещё не найден.
 */
export function currentLang(): Lang {
    let locale: string | undefined;
    try {
        locale = LocaleStore?.locale;
    } catch { /* стор ещё не готов — считаем язык английским */ }

    return resolveLang(settings.store.language, locale);
}

/**
 * Описания настроек читаются в момент отрисовки панели, поэтому оформлены
 * геттерами: смена языка применяется без перезапуска Discord.
 */
function describe(key: UiKey) {
    return {
        get description() {
            return t(key, currentLang());
        }
    };
}

export const settings = definePluginSettings({
    language: {
        type: OptionType.SELECT,
        ...describe("language"),
        options: [
            { label: "Auto (Discord language)", value: "auto", default: true },
            { label: "English", value: "en" },
            { label: "Русский", value: "ru" }
        ]
    },
    promoterName: {
        type: OptionType.STRING,
        ...describe("promoterName"),
        default: "Виктор Громов",
        placeholder: "Имя Фамилия"
    },
    promoterStatic: {
        type: OptionType.STRING,
        ...describe("promoterStatic"),
        default: "500",
        placeholder: "500"
    },
    promoterId: {
        type: OptionType.STRING,
        ...describe("promoterId"),
        default: "",
        get placeholder() {
            return t("promoterIdPlaceholder", currentLang());
        }
    },
    channelIds: {
        type: OptionType.STRING,
        ...describe("channelIds"),
        default: DEFAULT_REPORT_CHANNEL_ID,
        get placeholder() {
            return t("channelIdsPlaceholder", currentLang());
        }
    },
    action: {
        type: OptionType.SELECT,
        ...describe("action"),
        options: [
            { get label() { return t("actionCopy", currentLang()); }, value: "copy", default: true },
            { get label() { return t("actionInsert", currentLang()); }, value: "insert" },
            { get label() { return t("actionBoth", currentLang()); }, value: "both" }
        ]
    },
    template: {
        type: OptionType.STRING,
        ...describe("template"),
        default: DEFAULT_TEMPLATE,
        multiline: true
    }
});
