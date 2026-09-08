/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Guild, Message } from "@vencord/discord-types";
import { Alerts, ChannelStore, GuildMemberStore, GuildRoleStore, GuildStore, PermissionStore, showToast, Toasts, UserStore } from "@webpack/common";

import { executePlan, type ExecutionResult, type PromotionStep } from "./actions";
import { type AuditIssue, formatIssue, type Lang, t } from "./i18n";
import { type ParsedReport } from "./parser";
import { buildPlan, isPlanEmpty, type PromotionPlan } from "./plan";
import { settings } from "./settings";

/** Название роли для сводки; неизвестная роль показывается своим ID. */
function roleName(guildId: string, roleId: string): string {
    try {
        return GuildRoleStore.getRole(guildId, roleId)?.name ?? roleId;
    } catch {
        return roleId;
    }
}

/**
 * Одного «Управлять ролями» мало: Discord не даёт трогать роли, которые не ниже
 * твоей высшей. Без этой проверки отказ пришёл бы уже посреди выполнения — после
 * того, как часть ролей сменилась.
 */
function checkRoleHierarchy(guild: Guild, roleIds: string[]): AuditIssue | null {
    // Владельцу сервера иерархия не мешает
    if (PermissionStore.getGuildPermissionProps(guild).isOwner) return null;

    const highest = PermissionStore.getHighestRole(guild);

    for (const roleId of roleIds) {
        const role = GuildRoleStore.getRole(guild.id, roleId);
        // Неизвестная роль — почти всегда опечатка в ID: молчать о ней хуже,
        // чем остановиться, потому что иначе выдалась бы только вторая из пары.
        if (!role) return { code: "unknown-role", value: roleId };
        if (!PermissionStore.isRoleHigher(guild, highest, role)) {
            return { code: "role-too-high", value: role.name };
        }
    }

    return null;
}

/**
 * Права проверяются заранее, а не по отказу сервера: узнать «нельзя» до того,
 * как часть шагов уже выполнена, гораздо полезнее, чем после.
 */
function checkPermissions(guildId: string, plan: PromotionPlan): AuditIssue | null {
    const guild = GuildStore.getGuild(guildId);
    if (!guild) return { code: "no-guild" };

    const props = PermissionStore.getGuildPermissionProps(guild);
    if (plan.roles && !props.canManageRoles) return { code: "no-manage-roles" };
    if (plan.nickname && !props.canManageNicknames) return { code: "no-manage-nicknames" };

    if (plan.roles) {
        const denied = checkRoleHierarchy(guild, [...plan.roles.add, ...plan.roles.remove]);
        if (denied) return denied;
    }

    return null;
}

/** Строки сводки: ровно то, что произойдёт по подтверждению. */
function summaryRows(plan: PromotionPlan, report: ParsedReport, guildId: string, lang: Lang): [string, string][] {
    const rows: [string, string][] = [];
    const who = report.name
        ? `${report.name} | ${report.staticId}`
        : UserStore.getUser(report.targetUserId!)?.username ?? report.targetUserId!;

    rows.push([t("summaryTarget", lang), who]);
    rows.push([t("summaryRanks", lang), `${report.oldRank} → ${report.newRank}`]);

    if (plan.roles?.add.length) {
        rows.push([t("summaryRolesAdd", lang), plan.roles.add.map(id => roleName(guildId, id)).join(", ")]);
    }
    if (plan.roles?.remove.length) {
        rows.push([t("summaryRolesRemove", lang), plan.roles.remove.map(id => roleName(guildId, id)).join(", ")]);
    }
    if (plan.nickname) {
        rows.push([t("summaryNickname", lang), `${plan.nickname.from} → ${plan.nickname.to}`]);
    }
    if (plan.audit) {
        const name = ChannelStore.getChannel(plan.audit.channelId)?.name;
        rows.push([t("summaryAudit", lang), name ? `#${name}` : plan.audit.channelId]);
    }
    if (plan.reaction) {
        rows.push([t("summaryReaction", lang), plan.reaction]);
    }
    if (plan.command) {
        rows.push([t("summaryCommand", lang), plan.command]);
    }

    return rows;
}

function confirm(plan: PromotionPlan, report: ParsedReport, guildId: string, lang: Lang): Promise<boolean> {
    const rows = summaryRows(plan, report, guildId, lang);
    return Alerts.confirm({
        title: t("confirmTitle", lang),
        confirmText: t("confirmButton", lang),
        cancelText: t("cancelButton", lang),
        body: (
            <div>
                {rows.map(([label, value]) => (
                    <div key={label} style={{ marginBottom: 4 }}>
                        <strong>{label}:</strong> {value}
                    </div>
                ))}
            </div>
        )
    });
}

/** Итог показывается тостом: что прошло и, если не всё, на чём остановилось. */
function reportResult(result: ExecutionResult, lang: Lang): void {
    const names: Record<PromotionStep, string> = {
        roles: t("stepNameRoles", lang),
        nickname: t("stepNameNickname", lang),
        audit: t("stepNameAudit", lang),
        reaction: t("stepNameReaction", lang),
        command: t("stepNameCommand", lang)
    };

    if (!result.failed) {
        // Про буфер обмена стоит сказать явно: иначе неясно, что там уже лежит
        const key = result.done.includes("command") ? "promotionDoneCommand" : "promotionDone";
        showToast(t(key, lang), Toasts.Type.SUCCESS);
        return;
    }

    const done = result.done.map(step => names[step]).join(", ");
    const message = `${t("promotionFailedAt", lang)}: ${names[result.failed]}`
        + (done ? `. ${t("promotionCompleted", lang)}: ${done}` : "");

    console.error("[EmployeeAudit] промежуточная ошибка повышения", result.error);
    showToast(message, Toasts.Type.FAILURE);
}

export interface PromoteContext {
    message: Message;
    report: ParsedReport;
    /** Текст аудита; пустой, если шаг публикации выключен. */
    auditText: string;
    /** Вызов команды бота; пустой, если шаг копирования выключен. */
    commandText: string;
    lang: Lang;
}

/**
 * Полный цикл повышения: план → подтверждение → выполнение → итог. Всё, что
 * можно проверить заранее, проверяется до окна подтверждения, чтобы отказ не
 * приходил уже после согласия.
 */
export async function runPromotion({ message, report, auditText, commandText, lang }: PromoteContext): Promise<void> {
    const fail = (issue: AuditIssue) => showToast(formatIssue(issue, lang), Toasts.Type.FAILURE);

    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    if (!guildId) return fail({ code: "no-guild" });

    const { targetUserId } = report;
    if (!targetUserId) return fail({ code: "no-user-mention" });

    const built = buildPlan({
        report,
        settings: settings.store,
        auditText,
        commandText,
        currentNick: GuildMemberStore.getNick(guildId, targetUserId)
    });
    if (!built.ok) return fail(built.issue);

    const { plan } = built;
    if (isPlanEmpty(plan)) return fail({ code: "nothing-to-do" });

    const denied = checkPermissions(guildId, plan);
    if (denied) return fail(denied);

    if (!await confirm(plan, report, guildId, lang)) return;

    const result = await executePlan(plan, {
        guildId,
        userId: targetUserId,
        channelId: message.channel_id,
        messageId: message.id
    });
    reportResult(result, lang);
}
