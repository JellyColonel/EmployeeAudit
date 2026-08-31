import { findGroupChildrenByChildId, NavContextMenuPatchCallback } from "@api/ContextMenu";
import { CopyIcon } from "@components/Icons";
import { copyWithToast, insertTextIntoChatInputBox } from "@utils/discord";
import definePlugin from "@utils/types";
import { Message } from "@vencord/discord-types";
import { ChannelStore, Menu, Toasts, UserStore } from "@webpack/common";

import { isPromotionReport, MessageLike, parseReport } from "./parser";
import { settings } from "./settings";
import { AuditData, messageLink, renderAudit } from "./template";

type BuildResult =
    | { ok: true; text: string; warnings: string[]; }
    | { ok: false; error: string; };

function toast(message: string, type: number) {
    Toasts.show({ message, id: Toasts.genId(), type });
}

function buildAudit(message: Message): BuildResult {
    const result = parseReport(message as unknown as MessageLike);
    if (!result.ok) return result;

    const { report } = result;
    if (!report.targetUserId) {
        return { ok: false, error: "В отчёте нет упоминания повышаемого — некого подставить в «Повышен(а)»" };
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
    if (!built.ok) {
        toast(built.error, Toasts.Type.FAILURE);
        return;
    }

    const { action } = settings.store;
    const shouldInsert = action === "insert" || action === "both";
    const shouldCopy = action === "copy" || action === "both";

    if (shouldInsert) insertTextIntoChatInputBox(built.text);

    if (shouldCopy) await copyWithToast(built.text, "Кадровый аудит скопирован");
    else if (shouldInsert) toast("Кадровый аудит вставлен в поле ввода", Toasts.Type.SUCCESS);

    // Предупреждения не мешают работе: аудит уже собран, но отчёт выглядит странно.
    for (const warning of built.warnings) toast(`⚠️ ${warning}`, Toasts.Type.MESSAGE);
}

const messageContextMenuPatch: NavContextMenuPatchCallback = (children, { message }: { message: Message; }) => {
    if (!message || !isPromotionReport(message as unknown as MessageLike)) return;

    const item = (
        <Menu.MenuItem
            id="vc-employee-audit"
            label="Скопировать кадровый аудит"
            icon={CopyIcon}
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
    description: "Собирает текст кадрового аудита из отчёта на повышение (фракция «Больница», Russia Online)",
    authors: [{ name: "JellyColonel", id: 178560714821206016n }],
    settings,

    contextMenus: {
        "message": messageContextMenuPatch
    }
});
