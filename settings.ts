/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";
import { LocaleStore } from "@webpack/common";

import { DEFAULT_AUDIT_CHANNEL_ID, DEFAULT_CHANNEL_IDS, DEFAULT_CITIZEN_ROLE_ID, DEFAULT_DEPARTMENT, DEFAULT_DISMISSAL_DEPARTMENT, DEFAULT_REACTION_EMOJI, DEFAULT_ROLES_TO_ADD, DEFAULT_ROLES_TO_REMOVE } from "./constants";
import { type Lang, resolveLang, t } from "./i18n";
import { DEFAULT_ROLE_THRESHOLD } from "./plan";
import { DEFAULT_COMMAND_TEMPLATE, DEFAULT_DISMISSAL_COMMAND_TEMPLATE, DEFAULT_TEMPLATE } from "./template";

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
        default: "",
        placeholder: "Имя Фамилия"
    },
    promoterStatic: {
        type: OptionType.STRING,
        get description() { return t("promoterStatic", currentLang()); },
        default: "",
        placeholder: "12345"
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
        default: DEFAULT_CHANNEL_IDS,
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
    showAuditItem: {
        type: OptionType.BOOLEAN,
        get description() { return t("showAuditItem", currentLang()); },
        default: true
    },
    showCommandItem: {
        type: OptionType.BOOLEAN,
        get description() { return t("showCommandItem", currentLang()); },
        default: true
    },
    // Пункт выключен по умолчанию: в отличие от остальных, он меняет роли, ник
    // и публикует сообщение, и включать такое без спроса нельзя.
    showPromoteItem: {
        type: OptionType.BOOLEAN,
        get description() { return t("showPromoteItem", currentLang()); },
        default: false
    },
    stepRoles: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepRoles", currentLang()); },
        default: true
    },
    stepNickname: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepNickname", currentLang()); },
        default: true
    },
    // Выключен: с сентября 2026 аудит заполняет бот по /повышение, а отправить
    // slash-команду плагин не может — она ушла бы обычным текстом. Шаг остаётся
    // для текстовых аудитов, как их писали до бота.
    stepAudit: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepAudit", currentLang()); },
        default: false
    },
    stepReaction: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepReaction", currentLang()); },
        default: true
    },
    stepCopyCommand: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepCopyCommand", currentLang()); },
        default: true
    },
    roleThreshold: {
        type: OptionType.NUMBER,
        get description() { return t("roleThreshold", currentLang()); },
        default: DEFAULT_ROLE_THRESHOLD
    },
    rolesToAdd: {
        type: OptionType.STRING,
        get description() { return t("rolesToAdd", currentLang()); },
        default: DEFAULT_ROLES_TO_ADD
    },
    rolesToRemove: {
        type: OptionType.STRING,
        get description() { return t("rolesToRemove", currentLang()); },
        default: DEFAULT_ROLES_TO_REMOVE
    },
    department: {
        type: OptionType.STRING,
        get description() { return t("department", currentLang()); },
        default: DEFAULT_DEPARTMENT
    },
    auditChannelId: {
        type: OptionType.STRING,
        get description() { return t("auditChannelId", currentLang()); },
        default: DEFAULT_AUDIT_CHANNEL_ID
    },
    reactionEmoji: {
        type: OptionType.STRING,
        get description() { return t("reactionEmoji", currentLang()); },
        default: DEFAULT_REACTION_EMOJI
    },
    // Как и повышение, увольнение выключено по умолчанию: оно снимает все роли.
    showDismissItem: {
        type: OptionType.BOOLEAN,
        get description() { return t("showDismissItem", currentLang()); },
        default: false
    },
    stepDismissalRoles: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalRoles", currentLang()); },
        default: true
    },
    stepDismissalNickname: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalNickname", currentLang()); },
        default: true
    },
    stepDismissalReaction: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalReaction", currentLang()); },
        default: true
    },
    stepDismissalCommand: {
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalCommand", currentLang()); },
        default: true
    },
    citizenRoleId: {
        type: OptionType.STRING,
        get description() { return t("citizenRoleId", currentLang()); },
        default: DEFAULT_CITIZEN_ROLE_ID
    },
    dismissalDepartment: {
        type: OptionType.STRING,
        get description() { return t("dismissalDepartment", currentLang()); },
        default: DEFAULT_DISMISSAL_DEPARTMENT
    },
    dismissalCommandTemplate: {
        type: OptionType.STRING,
        get description() { return t("dismissalCommandTemplate", currentLang()); },
        default: DEFAULT_DISMISSAL_COMMAND_TEMPLATE,
        multiline: true
    },
    template: {
        type: OptionType.STRING,
        get description() { return t("template", currentLang()); },
        default: DEFAULT_TEMPLATE,
        multiline: true
    },
    commandTemplate: {
        type: OptionType.STRING,
        get description() { return t("commandTemplate", currentLang()); },
        default: DEFAULT_COMMAND_TEMPLATE,
        multiline: true
    }
});
