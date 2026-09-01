/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { LocaleStore } from "@webpack/common";

import { DEFAULT_REPORT_CHANNEL_ID } from "./constants";
import { type Lang, resolveLang, t } from "./i18n";
import { DEFAULT_TEMPLATE } from "./template";

/**
 * Язык интерфейса плагина; `auto` берётся из языка Discord.
 *
 * Всё тело под try/catch намеренно: функция вызывается из геттеров описаний,
 * и любое исключение отсюда всплыло бы при загрузке модуля настроек, уронив
 * весь renderer Vencord, а не только плагин. Английский — безопасный запасной
 * вариант.
 */
export function currentLang(): Lang {
    try {
        return resolveLang(settings.store.language, LocaleStore?.locale);
    } catch {
        return "en";
    }
}

/**
 * Описания и подписи — геттеры: они читаются в момент отрисовки панели, когда
 * настройки уже готовы, поэтому смена языка применяется без перезапуска.
 *
 * Раскладывать их спредом нельзя: спред вычисляет геттер сразу, то есть ещё до
 * того, как `settings` создана.
 */
export const settings = definePluginSettings({
    language: {
        type: OptionType.SELECT,
        get description() { return t("language", currentLang()); },
        options: [
            { label: "Auto (Discord language)", value: "auto", default: true },
            { label: "English", value: "en" },
            { label: "Русский", value: "ru" }
        ]
    },
    promoterName: {
        type: OptionType.STRING,
        get description() { return t("promoterName", currentLang()); },
        default: "Виктор Громов",
        placeholder: "Имя Фамилия"
    },
    promoterStatic: {
        type: OptionType.STRING,
        get description() { return t("promoterStatic", currentLang()); },
        default: "500",
        placeholder: "500"
    },
    promoterId: {
        type: OptionType.STRING,
        get description() { return t("promoterId", currentLang()); },
        default: "",
        get placeholder() { return t("promoterIdPlaceholder", currentLang()); }
    },
    channelIds: {
        type: OptionType.STRING,
        get description() { return t("channelIds", currentLang()); },
        default: DEFAULT_REPORT_CHANNEL_ID,
        get placeholder() { return t("channelIdsPlaceholder", currentLang()); }
    },
    action: {
        type: OptionType.SELECT,
        get description() { return t("action", currentLang()); },
        options: [
            { get label() { return t("actionCopy", currentLang()); }, value: "copy", default: true },
            { get label() { return t("actionInsert", currentLang()); }, value: "insert" },
            { get label() { return t("actionBoth", currentLang()); }, value: "both" }
        ]
    },
    template: {
        type: OptionType.STRING,
        get description() { return t("template", currentLang()); },
        default: DEFAULT_TEMPLATE,
        multiline: true
    }
});
