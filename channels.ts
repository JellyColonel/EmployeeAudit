/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/**
 * Разбор списка каналов из настроек: ID через запятую, пробел или перенос строки.
 * Всё, что не похоже на Discord ID, отбрасывается.
 */
export function parseChannelList(raw: string): string[] {
    return raw.split(/[^\d]+/).filter(Boolean);
}

/** Пустой список означает «во всех каналах». */
export function isChannelAllowed(channelId: string, raw: string): boolean {
    const allowed = parseChannelList(raw);
    return allowed.length === 0 || allowed.includes(channelId);
}
