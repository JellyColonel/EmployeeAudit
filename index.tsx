/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { NotesIcon } from "@components/Icons";
import { copyWithToast, insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, showToast, Toasts, UserStore } from "@webpack/common";

import { isChannelAllowed } from "./channels";
import { type AuditIssue, formatIssue, t } from "./i18n";
import { isPromotionReport, MessageLike, parseReport } from "./parser";
import { currentLang, settings } from "./settings";
import { AuditData, messageLink, renderAudit } from "./template";

type BuildResult =
    | { ok: true; text: string; warnings: AuditIssue[]; }
    | { ok: false; issue: AuditIssue; };

function buildAudit(message: Message): BuildResult {
    const result = parseReport(message as unknown as MessageLike);
    if (!result.ok) return result;

    const { report } = result;
    if (!report.targetUserId) {
        return { ok: false, issue: { code: "no-user-mention" } };
    }

    const { promoterId, promoterName, promoterStatic, template } = settings.store;
    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;

    const data: AuditData = {
        promoterId: promoterId || UserStore.getCurrentUser()?.id || "",
        promoterName,
        promoterStatic,
        targetId: report.targetUserId,
        targetName: report.name,
        targetStatic: report.staticId,
        oldRank: report.oldRank,
        newRank: report.newRank,
        reportLink: messageLink(guildId, message.channel_id, message.id)
    };

    return { ok: true, text: renderAudit(template, data), warnings: result.warnings };
}

async function handleClick(message: Message) {
    const built = buildAudit(message);
    const lang = currentLang();
    if (!built.ok) {
        showToast(formatIssue(built.issue, lang), Toasts.Type.FAILURE);
        return;
    }

    const { action } = settings.store;
    const shouldInsert = action === "insert" || action === "both";
    const shouldCopy = action === "copy" || action === "both";

    if (shouldInsert) insertTextIntoChatInputBox(built.text);

    if (shouldCopy) await copyWithToast(built.text, t("copied", lang));
    else if (shouldInsert) showToast(t("inserted", lang), Toasts.Type.SUCCESS);

    // Предупреждения не мешают работе: аудит уже собран, но отчёт выглядит странно.
    for (const warning of built.warnings) showToast(`⚠️ ${formatIssue(warning, lang)}`, Toasts.Type.MESSAGE);
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message) return;
    if (!isChannelAllowed(message.channel_id, settings.store.channelIds)) return;
    if (!isPromotionReport(message as unknown as MessageLike)) return;

    const item = (
        <Menu.MenuItem
            id="vc-employee-audit"
            label={t("menuLabel", currentLang())}
            icon={NotesIcon}
            leadingAccessory={{ type: "icon", icon: NotesIcon }}
            action={() => handleClick(message)}
        />
    );

    const group = findGroupChildrenByChildId("copy-text", children);
    if (group) {
        group.splice(group.findIndex(c => c?.props?.id === "copy-text") + 1, 0, item);
    } else {
        children.push(item);
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
