/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { parseIdList } from "./channels";
import { type ParsedDismissal } from "./dismissal";
import { type AuditIssue } from "./i18n";
import { NICK_MAX_LENGTH, renameDepartment } from "./nickname";
import { type DismissalData, renderDismissal } from "./template";

/** Шаблоны команды: для оставшегося на сервере и для ушедшего. */
export interface DismissalCommandTemplates {
    present: string;
    gone: string;
}

/**
 * Команда зависит от того, есть ли человек на сервере: у бота для ушедших своя,
 * `/увольнение_без_дискорда`, где имя передаётся строкой, а Discord ID —
 * отдельным аргументом. Упоминание там не сработало бы: разрешать его не в кого.
 */
export function renderDismissalCommand(templates: DismissalCommandTemplates, data: DismissalData, gone: boolean): string {
    return renderDismissal(gone ? templates.gone : templates.present, data);
}

/** Что известно об увольняемом на сервере. `null` — его там уже нет. */
export interface MemberState {
    /** Текущие роли участника. */
    roles: string[];
    /** Ник на сервере; null — ника нет. */
    nick: string | null;
    /**
     * Роли, которые снять нельзя: выданные интеграциями (`managed`) и стоящие
     * не ниже нашей высшей. Их приходится оставить, иначе Discord отклонит весь
     * запрос целиком, а не молча пропустит лишнее.
     */
    untouchable: string[];
}

export interface DismissalPlan {
    /** Итоговый набор ролей: то, что нельзя снять, плюс роль гражданина. */
    roles: { next: string[]; removed: string[]; } | null;
    nickname: { from: string; to: string; } | null;
    reaction: string | null;
    command: string | null;
}

export interface DismissalSettings {
    stepDismissalRoles: boolean;
    stepDismissalNickname: boolean;
    stepDismissalReaction: boolean;
    stepDismissalCommand: boolean;
    citizenRoleId: string;
    dismissalDepartment: string;
    reactionEmoji: string;
}

export interface DismissalPlanInput {
    dismissal: ParsedDismissal;
    settings: DismissalSettings;
    /** null — человек уже вышел с сервера: роли и ник ему менять нечем и незачем. */
    member: MemberState | null;
    commandText: string;
}

export type DismissalPlanResult =
    | { ok: true; plan: DismissalPlan; }
    | { ok: false; issue: AuditIssue; };

/**
 * План увольнения. Роли снимаются все разом заменой набора, а не по одной:
 * цель — «остаться при одной роли», и одним `PATCH` это и честнее, и без
 * промежуточных состояний, в которых человек уже без отдела, но ещё не гражданин.
 */
export function buildDismissalPlan({ dismissal, settings, member, commandText }: DismissalPlanInput): DismissalPlanResult {
    const plan: DismissalPlan = { roles: null, nickname: null, reaction: null, command: null };

    // Ушедшему с сервера роли и ник не поменять — но заявление всё равно надо
    // отметить и оформить, поэтому это не ошибка, а просто пропуск двух шагов.
    if (member) {
        if (settings.stepDismissalRoles) {
            const citizen = parseIdList(settings.citizenRoleId)[0];
            if (!citizen) return { ok: false, issue: { code: "citizen-role-not-set" } };

            const keep = member.roles.filter(id => member.untouchable.includes(id));
            const next = [...new Set([...keep, citizen])];
            const removed = member.roles.filter(id => !next.includes(id));

            // Роль уже одна и та самая — делать нечего
            if (removed.length || !member.roles.includes(citizen)) plan.roles = { next, removed };
        }

        if (settings.stepDismissalNickname) {
            const department = settings.dismissalDepartment.trim();
            if (!department) return { ok: false, issue: { code: "department-not-set" } };

            if (member.nick) {
                const nick = renameDepartment(member.nick, department);
                if (!nick) return { ok: false, issue: { code: "unparsable-nick", value: member.nick } };
                if (nick.length > NICK_MAX_LENGTH) return { ok: false, issue: { code: "nickname-too-long", value: nick } };
                if (nick !== member.nick) plan.nickname = { from: member.nick, to: nick };
            }
            // Ника нет — менять нечего; это не повод отказывать в остальном
        }
    }

    if (settings.stepDismissalReaction) {
        const emoji = settings.reactionEmoji.trim();
        if (!emoji) return { ok: false, issue: { code: "reaction-not-set" } };
        plan.reaction = emoji;
    }

    if (settings.stepDismissalCommand) {
        if (!commandText.trim()) return { ok: false, issue: { code: "empty-command" } };
        plan.command = commandText;
    }

    return { ok: true, plan };
}

export function isDismissalPlanEmpty(plan: DismissalPlan): boolean {
    return !plan.roles && !plan.nickname && !plan.reaction && !plan.command;
}
