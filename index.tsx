/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CopyIcon, NotesIcon } from "@components/Icons";
import { copyWithToast, insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts, UserStore } from "@webpack/common";
import type { ReactElement } from "react";

import { isChannelAllowed } from "./channels";
import { type AuditIssue, formatIssue, t, type UiKey } from "./i18n";
import { isPromotionReport, MessageLike, parseReport } from "./parser";
import { currentLang, settings } from "./settings";
import { AuditData, messageLink, renderAudit, usesPlaceholder } from "./template";

type BuildResult =
    | { ok: true; text: string; warnings: AuditIssue[]; }
    | { ok: false; issue: AuditIssue; };

/**
 * Собирает текст по шаблону. Требования к данным выводятся из самого шаблона:
 * командному не нужны имя и статик повышающего, текстовому — Discord-хендл,
 * и ругаться на незаполненное там, где оно не понадобится, незачем.
 */
function buildAudit(message: Message, template: string): BuildResult {
    const result = parseReport(message as unknown as MessageLike);
    if (!result.ok) return result;

    const { report } = result;
    if (!report.targetUserId) {
        return { ok: false, issue: { code: "no-user-mention" } };
    }

    const { promoterId, promoterName, promoterStatic } = settings.store;
    if (usesPlaceholder(template, "promoterName", "promoterStatic")
        && (!promoterName.trim() || !promoterStatic.trim())) {
        return { ok: false, issue: { code: "promoter-not-configured" } };
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
        reportLink: messageLink(guildId, message.channel_id, message.id)
    };

    return { ok: true, text: renderAudit(template, data), warnings: result.warnings };
}

async function handleClick(message: Message, template: string, toasts: { copied: UiKey; inserted: UiKey; }) {
    const built = buildAudit(message, template);
    const lang = currentLang();
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

    // Предупреждения не мешают работе: аудит уже собран, но отчёт выглядит странно.
    for (const warning of built.warnings) showToast(`⚠️ ${formatIssue(warning, lang)}`, Toasts.Type.MESSAGE);
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message) return;
    if (!isChannelAllowed(message.channel_id, settings.store.channelIds)) return;
    if (!isPromotionReport(message as unknown as MessageLike)) return;

    const { showAuditItem, showCommandItem, template, commandTemplate } = settings.store;
    const lang = currentLang();
    const items: ReactElement<any>[] = [];

    if (showAuditItem) {
        items.push(
            <Menu.MenuItem
                id="vc-employee-audit"
                label={t("menuLabel", lang)}
                icon={NotesIcon}
                leadingAccessory={{ type: "icon", icon: NotesIcon }}
                action={() => handleClick(message, template, { copied: "copied", inserted: "inserted" })}
            />
        );
    }

    if (showCommandItem) {
        items.push(
            <Menu.MenuItem
                id="vc-employee-audit-command"
                label={t("menuLabelCommand", lang)}
                icon={CopyIcon}
                leadingAccessory={{ type: "icon", icon: CopyIcon }}
                action={() => handleClick(message, commandTemplate, { copied: "copiedCommand", inserted: "insertedCommand" })}
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
