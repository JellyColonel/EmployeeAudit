/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { Guild, Message } from "@vencord/discord-types";
import { Alerts, ChannelStore, GuildMemberStore, GuildRoleStore, GuildStore, PermissionStore, showToast, Toasts } from "@webpack/common";

import { executeDismissalPlan, fetchMember } from "./actions";
import { type ParsedDismissal } from "./dismissal";
import { buildDismissalPlan, type DismissalCommandTemplates, type DismissalPlan, isDismissalPlanEmpty, type MemberState, renderDismissalCommand } from "./dismissalPlan";
import { type AuditIssue, formatIssue, type Lang, t } from "./i18n";
import { settings } from "./settings";
import { reportResult, roleName, summaryModal } from "./shared";
import { type DismissalData } from "./template";

/**
 * Роли, которые снять всё равно не выйдет: выданные интеграциями и стоящие не
 * ниже нашей высшей. Их приходится оставить в новом наборе — иначе Discord
 * отклонит запрос целиком, а не пропустит лишнее.
 */
function untouchableRoles(guild: Guild, roles: string[]): string[] {
    const highest = PermissionStore.getHighestRole(guild);
    const { isOwner } = PermissionStore.getGuildPermissionProps(guild);

    return roles.filter(id => {
        const role = GuildRoleStore.getRole(guild.id, id);
        if (!role) return true;
        if (role.managed) return true;
        return isOwner ? false : !PermissionStore.isRoleHigher(guild, highest, role);
    });
}

/**
 * Состояние увольняемого на сервере. Кеш Discord знает не всех, поэтому пустой
 * `GuildMemberStore` — ещё не «вышел с сервера»; отличить одно от другого умеет
 * только сервер, и `null` возвращается лишь после его 404.
 */
async function resolveMember(guild: Guild, userId: string): Promise<MemberState | null> {
    const cached = GuildMemberStore.getMember(guild.id, userId);
    const member = cached
        ? { roles: cached.roles ?? [], nick: cached.nick ?? null }
        : await fetchMember(guild.id, userId);

    if (!member) return null;
    return { ...member, untouchable: untouchableRoles(guild, member.roles) };
}

function summaryRows(plan: DismissalPlan, dismissal: ParsedDismissal, guildId: string, gone: boolean, lang: Lang): [string, string][] {
    const rows: [string, string][] = [
        [t("summaryTarget", lang), `${dismissal.name} | ${dismissal.staticId}`],
        [t("summaryRank", lang), String(dismissal.rank)]
    ];

    if (dismissal.department) rows.push([t("summaryDepartment", lang), dismissal.department]);
    if (dismissal.reason) rows.push([t("summaryReason", lang), dismissal.reason]);

    // Про ушедшего с сервера нужно сказать прямо: иначе пустая сводка выглядит
    // как поломка, а не как «роли менять уже некому».
    if (gone) rows.push([t("summaryMember", lang), t("summaryMemberGone", lang)]);

    if (plan.roles) {
        rows.push([t("summaryRolesRemove", lang), plan.roles.removed.map(id => roleName(guildId, id)).join(", ")]);
        rows.push([t("summaryRolesLeft", lang), plan.roles.next.map(id => roleName(guildId, id)).join(", ")]);
    }
    if (plan.nickname) rows.push([t("summaryNickname", lang), `${plan.nickname.from} → ${plan.nickname.to}`]);
    if (plan.reaction) rows.push([t("summaryReaction", lang), plan.reaction]);
    if (plan.command) rows.push([t("summaryCommand", lang), plan.command]);

    return rows;
}

export interface DismissContext {
    message: Message;
    dismissal: ParsedDismissal;
    /** Данные для команды; какая из двух — решается после проверки членства. */
    data: DismissalData;
    templates: DismissalCommandTemplates;
    lang: Lang;
}

/**
 * Увольнение целиком: снять роли, сменить отдел в нике на «Гр.», отметить
 * заявление и положить команду в буфер. Человека, успевшего выйти с сервера,
 * это не ломает — два первых шага просто пропускаются.
 */
export async function runDismissal({ message, dismissal, data, templates, lang }: DismissContext): Promise<void> {
    const fail = (issue: AuditIssue) => showToast(formatIssue(issue, lang), Toasts.Type.FAILURE);

    const guildId = ChannelStore.getChannel(message.channel_id)?.guild_id;
    const guild = guildId ? GuildStore.getGuild(guildId) : null;
    if (!guild) return fail({ code: "no-guild" });

    let member: MemberState | null;
    try {
        member = await resolveMember(guild, dismissal.targetUserId);
    } catch {
        return fail({ code: "member-lookup-failed" });
    }

    const props = PermissionStore.getGuildPermissionProps(guild);
    if (member && settings.store.stepDismissalRoles && !props.canManageRoles) return fail({ code: "no-manage-roles" });
    if (member && settings.store.stepDismissalNickname && !props.canManageNicknames) return fail({ code: "no-manage-nicknames" });

    const commandText = settings.store.stepDismissalCommand
        ? renderDismissalCommand(templates, data, member === null)
        : "";

    const built = buildDismissalPlan({ dismissal, settings: settings.store, member, commandText });
    if (!built.ok) return fail(built.issue);

    const { plan } = built;
    if (isDismissalPlanEmpty(plan)) return fail({ code: "nothing-to-do" });

    const rows = summaryRows(plan, dismissal, guild.id, member === null, lang);
    if (!await Alerts.confirm(summaryModal(rows, t("confirmDismissalTitle", lang), lang))) return;

    reportResult(await executeDismissalPlan(plan, {
        guildId: guild.id,
        userId: dismissal.targetUserId,
        channelId: message.channel_id,
        messageId: message.id
    }), lang);
}
