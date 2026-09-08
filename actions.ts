/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { copyToClipboard } from "@utils/clipboard";
import { sendMessage } from "@utils/discord";
import { RestAPI } from "@webpack/common";

import { type PromotionPlan } from "./plan";

/**
 * Запросы идут по публичным маршрутам REST API, а не через `Constants.Endpoints`:
 * маршруты стабильны и видны прямо здесь, тогда как состав `Endpoints` — деталь
 * сборки клиента, которая молча меняется.
 */
function memberUrl(guildId: string, userId: string): string {
    return `/guilds/${guildId}/members/${userId}`;
}

export function addRole(guildId: string, userId: string, roleId: string): Promise<unknown> {
    return RestAPI.put({ url: `${memberUrl(guildId, userId)}/roles/${roleId}` });
}

export function removeRole(guildId: string, userId: string, roleId: string): Promise<unknown> {
    return RestAPI.del({ url: `${memberUrl(guildId, userId)}/roles/${roleId}` });
}

/**
 * Роли меняются по одной, а не заменой всего массива через PATCH: массив пришлось
 * бы собирать из кеша, и параллельная правка ролей кем-то ещё оказалась бы затёрта.
 */
export function setNickname(guildId: string, userId: string, nick: string): Promise<unknown> {
    return RestAPI.patch({ url: memberUrl(guildId, userId), body: { nick } });
}

/** Реакция от своего имени; `emoji` — либо unicode, либо `имя:id` для серверной. */
export function addReaction(channelId: string, messageId: string, emoji: string): Promise<unknown> {
    const key = encodeURIComponent(emoji);
    return RestAPI.put({ url: `/channels/${channelId}/messages/${messageId}/reactions/${key}/@me` });
}

/** Шаги плана в порядке выполнения — они же ключи для сообщений. */
export type PromotionStep = "roles" | "nickname" | "audit" | "reaction" | "command";

export interface ExecutionResult {
    /** Шаги, выполненные успешно, в порядке выполнения. */
    done: PromotionStep[];
    /** Шаг, на котором всё остановилось; undefined — прошло полностью. */
    failed?: PromotionStep;
    error?: unknown;
}

export interface ExecutionTarget {
    guildId: string;
    userId: string;
    channelId: string;
    messageId: string;
}

/**
 * Выполняет план по шагам и останавливается на первой ошибке: дальше идти нельзя,
 * потому что каждый следующий шаг заявляет о результате предыдущего.
 *
 * Порядок не случаен: роли и ник — то, ради чего всё делается; аудит фиксирует
 * уже сделанное; галочка означает «сообщение отработано целиком». Если что-то
 * упало, галочки не будет, и это видно в списке сообщений.
 *
 * Команда бота копируется в самом конце: буфер обмена стоит занимать только
 * тогда, когда остальное действительно прошло.
 */
export async function executePlan(plan: PromotionPlan, target: ExecutionTarget): Promise<ExecutionResult> {
    const done: PromotionStep[] = [];
    const { guildId, userId, channelId, messageId } = target;

    try {
        if (plan.roles) {
            for (const roleId of plan.roles.add) await addRole(guildId, userId, roleId);
            for (const roleId of plan.roles.remove) await removeRole(guildId, userId, roleId);
            done.push("roles");
        }

        if (plan.nickname) {
            await setNickname(guildId, userId, plan.nickname.to);
            done.push("nickname");
        }

        if (plan.audit) {
            await sendMessage(plan.audit.channelId, { content: plan.audit.text });
            done.push("audit");
        }

        if (plan.reaction) {
            await addReaction(channelId, messageId, plan.reaction);
            done.push("reaction");
        }

        if (plan.command) {
            await copyToClipboard(plan.command);
            done.push("command");
        }
    } catch (error) {
        const failed = nextStep(plan, done);
        return { done, failed, error };
    }

    return { done };
}

/** Какой шаг плана шёл следующим после уже выполненных — на нём и упало. */
function nextStep(plan: PromotionPlan, done: PromotionStep[]): PromotionStep {
    const order: PromotionStep[] = ["roles", "nickname", "audit", "reaction", "command"];
    const planned = order.filter(step => plan[step] != null);
    return planned.find(step => !done.includes(step)) ?? "roles";
}
