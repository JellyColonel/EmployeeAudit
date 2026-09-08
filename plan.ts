/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parseIdList } from "./channels";
import { type AuditIssue } from "./i18n";
import { NICK_MAX_LENGTH, renameDepartment } from "./nickname";
import { type ParsedReport } from "./parser";

/**
 * Ранг, начиная с которого сотрудник считается средним составом.
 *
 * Роли Discord и отдел в нике отражают не ранг, а состав: внутри среднего
 * состава повышение их не трогает, они меняются только на входе в него
 * (3 → 4, «Интерн» → «СМП»). Поэтому граница — настройка, а не таблица рангов:
 * повышения бывают и не на один ранг.
 */
export const DEFAULT_ROLE_THRESHOLD = 4;

/** Пересекает ли повышение границу состава: меняются ли роли и отдел в нике. */
export function crossesRoleBoundary(oldRank: number, newRank: number, threshold: number): boolean {
    return oldRank < threshold && newRank >= threshold;
}

/** Шаги, которые выполняет пункт меню; null — шаг не нужен или выключен. */
export interface PromotionPlan {
    roles: { add: string[]; remove: string[]; } | null;
    nickname: { from: string; to: string; } | null;
    audit: { channelId: string; text: string; } | null;
    reaction: string | null;
    /** Текст команды бота, который кладётся в буфер обмена. */
    command: string | null;
}

export interface PlanSettings {
    stepRoles: boolean;
    stepNickname: boolean;
    stepAudit: boolean;
    stepReaction: boolean;
    stepCopyCommand: boolean;
    roleThreshold: number;
    rolesToAdd: string;
    rolesToRemove: string;
    department: string;
    auditChannelId: string;
    reactionEmoji: string;
}

export interface PlanInput {
    report: ParsedReport;
    settings: PlanSettings;
    /** Текст аудита, уже собранный по шаблону. */
    auditText: string;
    /** Вызов команды бота, уже собранный по шаблону. */
    commandText: string;
    /** Текущий ник повышаемого на сервере; null — ника нет. */
    currentNick: string | null;
}

export type PlanResult =
    | { ok: true; plan: PromotionPlan; }
    | { ok: false; issue: AuditIssue; };

/**
 * Собирает план из отчёта и настроек, ничего не выполняя. Один и тот же план
 * идёт и в окно подтверждения, и в исполнитель, поэтому показанное и сделанное
 * разойтись не могут.
 */
export function buildPlan({ report, settings, auditText, commandText, currentNick }: PlanInput): PlanResult {
    const plan: PromotionPlan = { roles: null, nickname: null, audit: null, reaction: null, command: null };
    const crosses = crossesRoleBoundary(report.oldRank, report.newRank, settings.roleThreshold);

    if (settings.stepRoles && crosses) {
        const add = parseIdList(settings.rolesToAdd);
        const remove = parseIdList(settings.rolesToRemove);
        if (!add.length && !remove.length) return { ok: false, issue: { code: "roles-not-configured" } };
        plan.roles = { add, remove };
    }

    if (settings.stepNickname && crosses) {
        const department = settings.department.trim();
        if (!department) return { ok: false, issue: { code: "department-not-set" } };
        if (!currentNick) return { ok: false, issue: { code: "no-current-nick" } };

        const next = renameDepartment(currentNick, department);
        if (!next) return { ok: false, issue: { code: "unparsable-nick", value: currentNick } };
        if (next.length > NICK_MAX_LENGTH) return { ok: false, issue: { code: "nickname-too-long", value: next } };

        // Ник уже правильный — шага нет, а не «поменяли на то же самое».
        if (next !== currentNick) plan.nickname = { from: currentNick, to: next };
    }

    if (settings.stepAudit) {
        const channelId = parseIdList(settings.auditChannelId)[0];
        if (!channelId) return { ok: false, issue: { code: "audit-channel-not-set" } };
        plan.audit = { channelId, text: auditText };
    }

    if (settings.stepReaction) {
        const emoji = settings.reactionEmoji.trim();
        if (!emoji) return { ok: false, issue: { code: "reaction-not-set" } };
        plan.reaction = emoji;
    }

    if (settings.stepCopyCommand) {
        if (!commandText.trim()) return { ok: false, issue: { code: "empty-command" } };
        plan.command = commandText;
    }

    return { ok: true, plan };
}

/** Есть ли в плане хоть что-то, что нужно выполнять. */
export function isPlanEmpty(plan: PromotionPlan): boolean {
    return !plan.roles && !plan.nickname && !plan.audit && !plan.reaction && !plan.command;
}
