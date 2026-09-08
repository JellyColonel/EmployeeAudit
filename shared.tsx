/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { GuildRoleStore, showToast, Toasts } from "@webpack/common";

import { type ExecutionResult, type PromotionStep } from "./actions";
import { type Lang, t } from "./i18n";

/** Название роли для сводки; неизвестная роль показывается своим ID. */
export function roleName(guildId: string, roleId: string): string {
    try {
        return GuildRoleStore.getRole(guildId, roleId)?.name ?? roleId;
    } catch {
        return roleId;
    }
}

/** Окно подтверждения: ровно то, что произойдёт, строка за строкой. */
export function summaryModal(rows: [string, string][], title: string, lang: Lang) {
    return {
        title,
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
    };
}

/** Итог показывается тостом: что прошло и, если не всё, на чём остановилось. */
export function reportResult(result: ExecutionResult, lang: Lang): void {
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

    console.error("[EmployeeAudit] промежуточная ошибка", result.error);
    showToast(message, Toasts.Type.FAILURE);
}
