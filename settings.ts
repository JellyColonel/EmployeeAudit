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
import { sectionSetting } from "./sections";
import { DEFAULT_COMMAND_TEMPLATE, DEFAULT_DISMISSAL_COMMAND_TEMPLATE, DEFAULT_DISMISSAL_NO_DISCORD_COMMAND_TEMPLATE, DEFAULT_TEMPLATE } from "./template";

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
    reactionEmoji: {
        type: OptionType.STRING,
        get description() { return t("reactionEmoji", currentLang()); },
        default: DEFAULT_REACTION_EMOJI
    },
    // Заголовок сворачиваемой секции: настройки ниже прячутся своим `hidden`,
    // пока он не раскрыт. См. sections.tsx — почему это работает.
    promotionSection: {
        type: OptionType.COMPONENT,
        default: false,
        component: sectionSetting(
            () => Boolean(settings.store.promotionSection),
            () => t("sectionPromotion", currentLang()))
    },
    showAuditItem: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("showAuditItem", currentLang()); },
        default: true
    },
    showCommandItem: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("showCommandItem", currentLang()); },
        default: true
    },
    // Пункт выключен по умолчанию: в отличие от остальных, он меняет роли, ник
    // и публикует сообщение, и включать такое без спроса нельзя.
    showPromoteItem: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("showPromoteItem", currentLang()); },
        default: false
    },
    stepRoles: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepRoles", currentLang()); },
        default: true
    },
    stepNickname: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepNickname", currentLang()); },
        default: true
    },
    // Выключен: с сентября 2026 аудит заполняет бот по /повышение, а отправить
    // slash-команду плагин не может — она ушла бы обычным текстом. Шаг остаётся
    // для текстовых аудитов, как их писали до бота.
    stepAudit: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepAudit", currentLang()); },
        default: false
    },
    stepReaction: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepReaction", currentLang()); },
        default: true
    },
    stepCopyCommand: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepCopyCommand", currentLang()); },
        default: true
    },
    roleThreshold: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.NUMBER,
        get description() { return t("roleThreshold", currentLang()); },
        default: DEFAULT_ROLE_THRESHOLD
    },
    rolesToAdd: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.STRING,
        get description() { return t("rolesToAdd", currentLang()); },
        default: DEFAULT_ROLES_TO_ADD
    },
    rolesToRemove: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.STRING,
        get description() { return t("rolesToRemove", currentLang()); },
        default: DEFAULT_ROLES_TO_REMOVE
    },
    department: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.STRING,
        get description() { return t("department", currentLang()); },
        default: DEFAULT_DEPARTMENT
    },
    auditChannelId: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.STRING,
        get description() { return t("auditChannelId", currentLang()); },
        default: DEFAULT_AUDIT_CHANNEL_ID
    },
    template: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.STRING,
        get description() { return t("template", currentLang()); },
        default: DEFAULT_TEMPLATE,
        multiline: true
    },
    commandTemplate: {
        hidden: () => !settings.store.promotionSection,
        type: OptionType.STRING,
        get description() { return t("commandTemplate", currentLang()); },
        default: DEFAULT_COMMAND_TEMPLATE,
        multiline: true
    },
    dismissalSection: {
        type: OptionType.COMPONENT,
        default: false,
        component: sectionSetting(
            () => Boolean(settings.store.dismissalSection),
            () => t("sectionDismissal", currentLang()))
    },
    // Как и повышение, увольнение выключено по умолчанию: оно снимает все роли.
    showDismissItem: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.BOOLEAN,
        get description() { return t("showDismissItem", currentLang()); },
        default: false
    },
    stepDismissalRoles: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalRoles", currentLang()); },
        default: true
    },
    stepDismissalNickname: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalNickname", currentLang()); },
        default: true
    },
    stepDismissalReaction: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalReaction", currentLang()); },
        default: true
    },
    stepDismissalCommand: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.BOOLEAN,
        get description() { return t("stepDismissalCommand", currentLang()); },
        default: true
    },
    citizenRoleId: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.STRING,
        get description() { return t("citizenRoleId", currentLang()); },
        default: DEFAULT_CITIZEN_ROLE_ID
    },
    dismissalDepartment: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.STRING,
        get description() { return t("dismissalDepartment", currentLang()); },
        default: DEFAULT_DISMISSAL_DEPARTMENT
    },
    dismissalCommandTemplate: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.STRING,
        get description() { return t("dismissalCommandTemplate", currentLang()); },
        default: DEFAULT_DISMISSAL_COMMAND_TEMPLATE,
        multiline: true
    },
    dismissalNoDiscordCommandTemplate: {
        hidden: () => !settings.store.dismissalSection,
        type: OptionType.STRING,
        get description() { return t("dismissalNoDiscordCommandTemplate", currentLang()); },
        default: DEFAULT_DISMISSAL_NO_DISCORD_COMMAND_TEMPLATE,
        multiline: true
    },
});
