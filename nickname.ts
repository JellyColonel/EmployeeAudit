/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Ограничение Discord на никнейм участника сервера. */
export const NICK_MAX_LENGTH = 32;

/**
 * Ник на сервере устроен как `Отдел | Имя Фамилия | Static ID`, и при переходе
 * в средний состав меняется только отдел: `Интерн | Юрий Белый | 87052` →
 * `СМП | Юрий Белый | 87052`.
 *
 * Поэтому ник правится заменой первого сегмента, а не сборкой заново по имени
 * и статику из отчёта: игровые имена бывают длинными, и люди сокращают имя или
 * фамилию до буквы прямо в нике. Собранный заново ник затёр бы это сокращение
 * — и мог бы не влезть в 32 символа.
 *
 * `null` означает «формат не распознан»: тогда ник честно не трогается.
 */
export function renameDepartment(nick: string, department: string): string | null {
    const parts = nick.split("|");
    if (parts.length < 2) return null;

    const rest = parts.slice(1).map(part => part.trim());
    return [department.trim(), ...rest].join(" | ");
}
