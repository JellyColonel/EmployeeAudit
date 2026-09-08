/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CopyIcon, NoEntrySignIcon, NotesIcon, TopRightArrow } from "@components/Icons";
import { copyWithToast, insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts, UserStore } from "@webpack/common";
import type { ReactElement } from "react";

import { isChannelAllowed } from "./channels";
import { runDismissal } from "./dismiss";
import { isDismissalRequest, parseDismissal } from "./dismissal";
import { type AuditIssue, formatIssue, type Lang, t, type UiKey } from "./i18n";
import { isPromotionReport, isShortPromotion, MessageLike, type ParsedReport, parseReport } from "./parser";
import { runPromotion } from "./promote";
import { currentLang, settings } from "./settings";
import { AuditData, type DismissalData, messageLink, renderAudit, usesPlaceholder } from "./template";

type BuildResult =
    | { ok: true; text: string; }
    | { ok: false; issue: AuditIssue; };

/**
 * Собирает текст по шаблону. Требования к данным выводятся из самого шаблона:
 * командному не нужны имя и статик повышающего, текстовому — Discord-хендл,
 * и ругаться на незаполненное там, где оно не понадобится, незачем.
 */
function buildAudit(message: Message, report: ParsedReport, template: string): BuildResult {
    if (!report.targetUserId) {
        return { ok: false, issue: { code: "no-user-mention" } };
    }

    const { promoterId, promoterName, promoterStatic } = settings.store;
    if (usesPlaceholder(template, "promoterName", "promoterStatic")
        && (!promoterName.trim() || !promoterStatic.trim())) {
        return { ok: false, issue: { code: "promoter-not-configured" } };
    }

    // Имя и статик приходят только из embed-отчёта; в короткой заявке их нет.
    if (usesPlaceholder(template, "targetName", "targetStatic") && !report.name) {
        return { ok: false, issue: { code: "no-name-in-source" } };
    }

    // Хендла в отчёте нет — он берётся из кеша Discord по упоминанию.
    const targetUsername = UserStore.getUser(report.targetUserId)?.username ?? "";
    if (!targetUsername && usesPlaceholder(template, "targetUsername")) {
        return { ok: false, issue: { code: "unknown-username" } };
    }

    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;

    const data: AuditData = {
        promoterId: promoterId || UserStore.getCurrentUser()?.id || "",
        promoterName,
        promoterStatic,
        targetId: report.targetUserId,
        targetUsername,
        targetName: report.name,
        targetStatic: report.staticId,
        oldRank: report.oldRank,
        newRank: report.newRank,
        // У заявки причина написана в ней самой, у отчёта ею служит сам отчёт.
        reportLink: report.reportLink ?? messageLink(guildId, message.channel_id, message.id)
    };

    return { ok: true, text: renderAudit(template, data) };
}

/** Разбор с показом проблемы: одно место, где ошибка превращается в тост. */
function parseOrToast(message: Message, lang: Lang): ParsedReport | null {
    const result = parseReport(message as unknown as MessageLike);
    if (result.ok) return result.report;

    showToast(formatIssue(result.issue, lang), Toasts.Type.FAILURE);
    return null;
}

async function handleCopy(message: Message, template: string, toasts: { copied: UiKey; inserted: UiKey; }) {
    const lang = currentLang();
    const report = parseOrToast(message, lang);
    if (!report) return;

    const built = buildAudit(message, report, template);
    if (!built.ok) {
        showToast(formatIssue(built.issue, lang), Toasts.Type.FAILURE);
        return;
    }

    const { action } = settings.store;
    const shouldInsert = action === "insert" || action === "both";
    const shouldCopy = action === "copy" || action === "both";

    if (shouldInsert) insertTextIntoChatInputBox(built.text);

    if (shouldCopy) await copyWithToast(built.text, t(toasts.copied, lang));
    else if (shouldInsert) showToast(t(toasts.inserted, lang), Toasts.Type.SUCCESS);
}

/**
 * Повышение целиком: роли, ник, аудит, галочка и команда в буфере. Тексты
 * собираются здесь и только для включённых шагов — иначе незаполненные данные
 * о самом повышающем блокировали бы смену ролей, к которой они отношения не
 * имеют.
 */
async function handlePromote(message: Message) {
    const lang = currentLang();
    const report = parseOrToast(message, lang);
    if (!report) return;

    const texts = { auditText: "", commandText: "" };
    const steps = [
        { enabled: settings.store.stepAudit, template: settings.store.template, key: "auditText" },
        { enabled: settings.store.stepCopyCommand, template: settings.store.commandTemplate, key: "commandText" }
    ] as const;

    for (const { enabled, template, key } of steps) {
        if (!enabled) continue;

        const built = buildAudit(message, report, template);
        if (!built.ok) {
            showToast(formatIssue(built.issue, lang), Toasts.Type.FAILURE);
            return;
        }
        texts[key] = built.text;
    }

    await runPromotion({ message, report, ...texts, lang });
}

/**
 * Увольнение: разбор заявления и вызов общего цикла. Текстового аудита здесь
 * нет — его оформляет бот по команде, поэтому собирается только она.
 */
async function handleDismiss(message: Message) {
    const lang = currentLang();
    const parsed = parseDismissal(message as unknown as MessageLike);
    if (!parsed.ok) {
        showToast(formatIssue(parsed.issue, lang), Toasts.Type.FAILURE);
        return;
    }

    const { dismissal } = parsed;
    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    const data: DismissalData = {
        targetId: dismissal.targetUserId,
        targetName: dismissal.name,
        targetStatic: dismissal.staticId,
        department: dismissal.department,
        rank: dismissal.rank,
        reason: dismissal.reason,
        // Причиной для бота служит ссылка на само заявление, а не текст из него
        reportLink: messageLink(guildId, message.channel_id, message.id),
        inventoryLink: dismissal.inventoryLink
    };

    // Какая из команд нужна, известно только после проверки, остался ли человек
    // на сервере, поэтому сюда уходят обе.
    await runDismissal({
        message,
        dismissal,
        data,
        templates: {
            present: settings.store.dismissalCommandTemplate,
            gone: settings.store.dismissalNoDiscordCommandTemplate
        },
        lang
    });
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message) return;
    if (!isChannelAllowed(message.channel_id, settings.store.channelIds)) return;
    const source = message as unknown as MessageLike;
    const isReport = isPromotionReport(source);
    const isDismissal = isDismissalRequest(source);
    if (!isReport && !isShortPromotion(source) && !isDismissal) return;

    const { showAuditItem, showCommandItem, showPromoteItem, showDismissItem, template, commandTemplate } = settings.store;
    const lang = currentLang();
    const items: ReactElement<any>[] = [];

    // Из короткой заявки текстовый аудит собрать нечем, пока шаблон просит имя и
    // статик, — тогда пункт не показывается вовсе, а не падает по клику.
    const auditPossible = isReport || !usesPlaceholder(template, "targetName", "targetStatic");

    if (showAuditItem && auditPossible && !isDismissal) {
        items.push(
            <Menu.MenuItem
                id="vc-employee-audit"
                label={t("menuLabel", lang)}
                icon={NotesIcon}
                leadingAccessory={{ type: "icon", icon: NotesIcon }}
                action={() => handleCopy(message, template, { copied: "copied", inserted: "inserted" })}
            />
        );
    }

    if (showCommandItem && !isDismissal) {
        items.push(
            <Menu.MenuItem
                id="vc-employee-audit-command"
                label={t("menuLabelCommand", lang)}
                icon={CopyIcon}
                leadingAccessory={{ type: "icon", icon: CopyIcon }}
                action={() => handleCopy(message, commandTemplate, { copied: "copiedCommand", inserted: "insertedCommand" })}
            />
        );
    }

    // Пункт остаётся видимым, даже если аудит из этого сообщения не собрать:
    // роли, ник и галочка от имени и статика не зависят, а публикацию аудита
    // можно выключить отдельным шагом.
    if (showPromoteItem && !isDismissal) {
        items.push(
            <Menu.MenuItem
                id="vc-employee-audit-promote"
                label={t("menuLabelPromote", lang)}
                color="danger"
                icon={TopRightArrow}
                leadingAccessory={{ type: "icon", icon: TopRightArrow }}
                action={() => handlePromote(message)}
            />
        );
    }

    if (showDismissItem && isDismissal) {
        items.push(
            <Menu.MenuItem
                id="vc-employee-audit-dismiss"
                label={t("menuLabelDismiss", lang)}
                color="danger"
                icon={NoEntrySignIcon}
                leadingAccessory={{ type: "icon", icon: NoEntrySignIcon }}
                action={() => handleDismiss(message)}
            />
        );
    }

    if (!items.length) return;

    const group = findGroupChildrenByChildId("copy-text", children);
    if (group) {
        group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, ...items);
    } else {
        children.push(...items);
    }
};

export default definePlugin({
    name: "EmployeeAudit",
    get description() { return t("pluginDescription", currentLang()); },
    authors: [{ name: "JellyColonel", id: 178560714821206016n }],
    settings,

    contextMenus: {
        "message": messageContextMenuPatch
    }
});
