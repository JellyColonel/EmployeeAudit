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
    | { code: "promoter-not-configured"; }
    | { code: "unknown-username"; }
    | { code: "no-report-link"; }
    | { code: "no-name-in-source"; }
    | { code: "no-guild"; }
    | { code: "no-manage-roles"; }
    | { code: "no-manage-nicknames"; }
    | { code: "roles-not-configured"; }
    | { code: "department-not-set"; }
    | { code: "no-current-nick"; }
    | { code: "unparsable-nick"; value: string; }
    | { code: "nickname-too-long"; value: string; }
    | { code: "audit-channel-not-set"; }
    | { code: "reaction-not-set"; }
    | { code: "empty-command"; }
    | { code: "no-dismissal-embed"; }
    | { code: "citizen-role-not-set"; }
    | { code: "member-lookup-failed"; }
    | { code: "unknown-role"; value: string; }
    | { code: "role-too-high"; value: string; }
    | { code: "nothing-to-do"; };

const UI = {
    en: {
        pluginDescription: "Builds an employee audit record from a promotion report (Hospital faction, Russia Online)",
        menuLabel: "Copy Employee Audit",
        menuLabelCommand: "Copy Promotion Command",
        copied: "Employee audit copied",
        inserted: "Employee audit inserted into the chat box",
        copiedCommand: "Promotion command copied",
        insertedCommand: "Promotion command inserted into the chat box",

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
        template: "Audit template. Placeholders: {promoterId} {promoterName} {promoterStatic} {targetId} {targetUsername} {targetName} {targetStatic} {oldRank} {newRank} {reportLink}",
        commandTemplate: "Bot command template. Same placeholders; the command's user argument is filled from the <@{targetId}> mention",
        showAuditItem: "Show the «Copy Employee Audit» menu item",
        showCommandItem: "Show the «Copy Promotion Command» menu item",
        language: "Interface language of this plugin",

        menuLabelPromote: "Carry Out Promotion",
        showPromoteItem: "Show the «Carry Out Promotion» menu item. It changes roles and nickname, posts the audit and reacts to the message — everything at once",
        stepRoles: "Promotion step: change Discord roles",
        stepNickname: "Promotion step: change the server nickname",
        stepAudit: "Promotion step: post the audit text",
        stepReaction: "Promotion step: react to the report message",
        stepCopyCommand: "Promotion step: copy the /повышение command to the clipboard. The plugin cannot send a slash command itself, so the last step stays manual: pick the command in the audit channel and paste the arguments",
        roleThreshold: "First rank of the middle staff — 4, not 3. Roles and the department in the nickname change only when a promotion crosses into it: 3 → 4 does, 5 → 6 does not",
        rolesToAdd: "Role IDs granted when crossing into the middle staff, comma-separated",
        rolesToRemove: "Role IDs taken away when crossing into the middle staff, comma-separated",
        department: "Department for the nickname — the first segment of «Отдел | Имя Фамилия | Static ID»",
        auditChannelId: "ID of the channel the audit text is posted to",
        reactionEmoji: "Emoji marking a handled message. A server emoji is written as name:id",

        confirmTitle: "Carry out the promotion?",
        confirmButton: "Carry out",
        cancelButton: "Cancel",
        summaryTarget: "Employee",
        summaryRanks: "Ranks",
        summaryRolesAdd: "Grant roles",
        summaryRolesRemove: "Take away roles",
        summaryNickname: "Nickname",
        summaryAudit: "Post the audit to",
        summaryReaction: "React with",
        summaryCommand: "Copy the command",

        stepNameRoles: "roles",
        stepNameNickname: "nickname",
        stepNameAudit: "audit",
        stepNameReaction: "checkmark",
        stepNameCommand: "command",
        promotionDone: "Promotion carried out",
        promotionDoneCommand: "Done, the command is in the clipboard",

        menuLabelDismiss: "Carry Out Dismissal",
        showDismissItem: "Show the «Carry Out Dismissal» menu item. It takes away every role, leaves the citizen one, renames the department in the nickname and copies the /увольнение command",
        stepDismissalRoles: "Dismissal step: take away every role and grant the citizen one",
        stepDismissalNickname: "Dismissal step: change the department in the nickname",
        stepDismissalReaction: "Dismissal step: react to the request message",
        stepDismissalCommand: "Dismissal step: copy the /увольнение command to the clipboard",
        citizenRoleId: "ID of the role a dismissed employee is left with",
        dismissalDepartment: "Department for a dismissed employee's nickname — the first segment, «Гр.» from «Гражданин»",
        dismissalCommandTemplate: "Dismissal command template. Placeholders: {targetId} {targetName} {targetStatic} {department} {rank} {reason} {reportLink} {inventoryLink}",

        confirmDismissalTitle: "Carry out the dismissal?",
        summaryRank: "Rank",
        summaryDepartment: "Department",
        summaryReason: "Reason",
        summaryRolesLeft: "Roles left",
        summaryMember: "On the server",
        summaryMemberGone: "already left — roles and nickname are skipped",
        promotionFailedAt: "Failed at step",
        promotionCompleted: "Completed"
    },
    ru: {
        pluginDescription: "Собирает текст кадрового аудита из отчёта на повышение (фракция «Больница», Russia Online)",
        menuLabel: "Скопировать кадровый аудит",
        menuLabelCommand: "Скопировать команду повышения",
        copied: "Кадровый аудит скопирован",
        inserted: "Кадровый аудит вставлен в поле ввода",
        copiedCommand: "Команда повышения скопирована",
        insertedCommand: "Команда повышения вставлена в поле ввода",

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
        template: "Шаблон аудита. Плейсхолдеры: {promoterId} {promoterName} {promoterStatic} {targetId} {targetUsername} {targetName} {targetStatic} {oldRank} {newRank} {reportLink}",
        commandTemplate: "Шаблон команды бота. Плейсхолдеры те же; аргумент «пользователь» заполняется из упоминания <@{targetId}>",
        showAuditItem: "Показывать пункт «Скопировать кадровый аудит»",
        showCommandItem: "Показывать пункт «Скопировать команду повышения»",
        language: "Язык интерфейса плагина",

        menuLabelPromote: "Провести повышение",
        showPromoteItem: "Показывать пункт «Провести повышение». Он меняет роли и ник, публикует аудит и ставит реакцию — всё сразу",
        stepRoles: "Шаг повышения: менять роли Discord",
        stepNickname: "Шаг повышения: менять никнейм на сервере",
        stepAudit: "Шаг повышения: публиковать текст аудита",
        stepReaction: "Шаг повышения: ставить реакцию на сообщение-отчёт",
        stepCopyCommand: "Шаг повышения: копировать команду /повышение в буфер обмена. Отправить slash-команду плагин не может, поэтому последний шаг остаётся ручным: выбрать команду в канале аудита и вставить аргументы",
        roleThreshold: "Первый ранг среднего состава — 4, а не 3. Роли и отдел в нике меняются, только если повышение входит в состав: 3 → 4 меняет, 5 → 6 нет",
        rolesToAdd: "ID ролей, которые выдаются при переходе в средний состав (через запятую)",
        rolesToRemove: "ID ролей, которые снимаются при переходе в средний состав (через запятую)",
        department: "Отдел для никнейма — первый сегмент «Отдел | Имя Фамилия | Static ID»",
        auditChannelId: "ID канала, куда публикуется текст аудита",
        reactionEmoji: "Эмодзи, которым отмечается обработанное сообщение. Серверная пишется как имя:id",

        confirmTitle: "Провести повышение?",
        confirmButton: "Провести",
        cancelButton: "Отмена",
        summaryTarget: "Сотрудник",
        summaryRanks: "Ранги",
        summaryRolesAdd: "Выдать роли",
        summaryRolesRemove: "Снять роли",
        summaryNickname: "Никнейм",
        summaryAudit: "Аудит в канал",
        summaryReaction: "Реакция",
        summaryCommand: "Скопировать команду",

        stepNameRoles: "роли",
        stepNameNickname: "ник",
        stepNameAudit: "аудит",
        stepNameReaction: "галочка",
        stepNameCommand: "команда",
        promotionDone: "Повышение проведено",
        promotionDoneCommand: "Готово, команда в буфере обмена",

        menuLabelDismiss: "Провести увольнение",
        showDismissItem: "Показывать пункт «Провести увольнение». Он снимает все роли, оставляет роль гражданина, меняет отдел в нике и копирует команду /увольнение",
        stepDismissalRoles: "Шаг увольнения: снять все роли и выдать роль гражданина",
        stepDismissalNickname: "Шаг увольнения: менять отдел в никнейме",
        stepDismissalReaction: "Шаг увольнения: ставить реакцию на заявление",
        stepDismissalCommand: "Шаг увольнения: копировать команду /увольнение в буфер обмена",
        citizenRoleId: "ID роли, которая остаётся у уволенного",
        dismissalDepartment: "Отдел в нике уволенного — первый сегмент, «Гр.» от «Гражданин»",
        dismissalCommandTemplate: "Шаблон команды увольнения. Плейсхолдеры: {targetId} {targetName} {targetStatic} {department} {rank} {reason} {reportLink} {inventoryLink}",

        confirmDismissalTitle: "Провести увольнение?",
        summaryRank: "Ранг",
        summaryDepartment: "Отдел",
        summaryReason: "Причина",
        summaryRolesLeft: "Останутся роли",
        summaryMember: "На сервере",
        summaryMemberGone: "уже вышел — роли и ник пропускаются",
        promotionFailedAt: "Ошибка на шаге",
        promotionCompleted: "Выполнено"
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
                return "This message is neither a promotion report nor a promotion request";
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
            case "promoter-not-configured":
                return "Fill in your name and Static ID in the plugin settings first";
            case "unknown-username":
                return "Discord has no handle cached for the promoted user — open their profile and try again";
            case "no-report-link":
                return "The request has no report link — «Причина повышения» would be empty";
            case "no-name-in-source":
                return "This request has no name or Static ID: they only come from the bot's report embed";
            case "no-guild":
                return "This message is not in a server, so there is nobody to change roles for";
            case "no-manage-roles":
                return "You have no «Manage Roles» permission in this server";
            case "no-manage-nicknames":
                return "You have no «Manage Nicknames» permission in this server";
            case "roles-not-configured":
                return "Fill in the roles to grant and to take away in the plugin settings first";
            case "department-not-set":
                return "Fill in the department for the nickname in the plugin settings first";
            case "no-current-nick":
                return "The employee has no server nickname — there is no «Отдел» to replace";
            case "unparsable-nick":
                return `Nickname «${issue.value}» is not in the «Отдел | Имя Фамилия | Static ID» format`;
            case "nickname-too-long":
                return `The new nickname is longer than 32 characters: «${issue.value}»`;
            case "audit-channel-not-set":
                return "Fill in the audit channel ID in the plugin settings first";
            case "reaction-not-set":
                return "Fill in the checkmark emoji in the plugin settings first";
            case "empty-command":
                return "The bot command came out empty — check its template in the settings";
            case "no-dismissal-embed":
                return "This message is not a dismissal request";
            case "citizen-role-not-set":
                return "Fill in the citizen role ID in the plugin settings first";
            case "member-lookup-failed":
                return "Could not check whether the employee is still on the server — try again";
            case "unknown-role":
                return `This server has no role with ID ${issue.value} — check the role IDs in the settings`;
            case "role-too-high":
                return `The «${issue.value}» role is not below your highest one, so Discord will not let you touch it`;
            case "nothing-to-do":
                return "Every promotion step is turned off — there is nothing to do";
        }
    },
    ru: issue => {
        switch (issue.code) {
            case "no-report-embed":
                return "Сообщение не похоже ни на отчёт на повышение, ни на заявку";
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
            case "promoter-not-configured":
                return "Сначала заполните своё имя и Static ID в настройках плагина";
            case "unknown-username":
                return "Discord не знает никнейм повышаемого — откройте его профиль и повторите";
            case "no-report-link":
                return "В заявке нет ссылки на отчёт — «Причина повышения» осталась бы пустой";
            case "no-name-in-source":
                return "В заявке нет имени и статика: они берутся только из embed'а отчёта";
            case "no-guild":
                return "Сообщение не на сервере — некому менять роли";
            case "no-manage-roles":
                return "На этом сервере у вас нет права «Управлять ролями»";
            case "no-manage-nicknames":
                return "На этом сервере у вас нет права «Управлять никнеймами»";
            case "roles-not-configured":
                return "Сначала укажите в настройках плагина, какие роли выдавать и снимать";
            case "department-not-set":
                return "Сначала укажите в настройках плагина отдел для никнейма";
            case "no-current-nick":
                return "У сотрудника нет ника на сервере — нечему менять отдел";
            case "unparsable-nick":
                return `Ник «${issue.value}» не в формате «Отдел | Имя Фамилия | Static ID»`;
            case "nickname-too-long":
                return `Новый ник длиннее 32 символов: «${issue.value}»`;
            case "audit-channel-not-set":
                return "Сначала укажите в настройках плагина ID канала для аудита";
            case "reaction-not-set":
                return "Сначала укажите в настройках плагина эмодзи для отметки";
            case "empty-command":
                return "Команда бота вышла пустой — проверьте её шаблон в настройках";
            case "no-dismissal-embed":
                return "Сообщение не похоже на заявление на увольнение";
            case "citizen-role-not-set":
                return "Сначала укажите в настройках плагина ID роли гражданина";
            case "member-lookup-failed":
                return "Не удалось проверить, остался ли сотрудник на сервере — попробуйте ещё раз";
            case "unknown-role":
                return `На сервере нет роли с ID ${issue.value} — проверьте ID ролей в настройках`;
            case "role-too-high":
                return `Роль «${issue.value}» не ниже вашей высшей, Discord не даст её тронуть`;
            case "nothing-to-do":
                return "Все шаги повышения выключены — делать нечего";
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
