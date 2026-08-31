export interface AuditData {
    promoterId: string;
    promoterName: string;
    promoterStatic: string;
    targetId: string;
    targetName: string;
    targetStatic: string;
    oldRank: number | string;
    newRank: number | string;
    reportLink: string;
}

export const DEFAULT_TEMPLATE = [
    "Повышение",
    "Повышает: <@{promoterId}> {promoterName} | {promoterStatic}",
    "Повышен(а): <@{targetId}> {targetName} | {targetStatic}",
    "Прежний ранг: {oldRank}",
    "Новый ранг: {newRank}",
    "Причина повышения: {reportLink}"
].join("\n");

/** Ссылка на сообщение-отчёт, идущая в строку «Причина повышения». */
export function messageLink(guildId: string | null | undefined, channelId: string, messageId: string): string {
    return `https://discord.com/channels/${guildId ?? "@me"}/${channelId}/${messageId}`;
}

/** Подстановка `{ключ}` из данных; неизвестные плейсхолдеры остаются как есть. */
export function renderAudit(template: string, data: AuditData): string {
    return template.replace(/\{(\w+)\}/g, (whole, key: string) =>
        key in data ? String(data[key as keyof AuditData]) : whole);
}
