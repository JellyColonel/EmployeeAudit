/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Канал, в котором бот «Ева Повышаловна» публикует отчёты. */
export const DEFAULT_REPORT_CHANNEL_ID = "1538690946156462094";

/** Канал, где повышения оформляют короткой заявкой, без бота. */
export const DEFAULT_REQUEST_CHANNEL_ID = "1541899893780516924";

/** Канал, где бот принимает заявления на увольнение. */
export const DEFAULT_DISMISSAL_CHANNEL_ID = "1540668018894438440";

/** Все три канала — значение настройки `channelIds` по умолчанию. */
export const DEFAULT_CHANNEL_IDS = [
    DEFAULT_REPORT_CHANNEL_ID,
    DEFAULT_REQUEST_CHANNEL_ID,
    DEFAULT_DISMISSAL_CHANNEL_ID
].join(",");

/** Заголовок embed'а отчёта. Сравнение нечувствительно к регистру и «е/ё». */
export const REPORT_TITLE = "Отчет на повышение";

/** Поле с именем и статиком повышаемого. */
export const FIELD_NAME_STATIC = /имя\s+фамилия/;

/** Поле «С какого на какой ранг повышаетесь?». */
export const FIELD_RANKS = /с\s+какого\s+на\s+какой\s+ранг/;

/** Канал, куда публикуется кадровый аудит. */
export const DEFAULT_AUDIT_CHANNEL_ID = "1538690944336142497";

/** Роли, которые меняются на входе в средний состав (3 → 4): «Интерн» → «Отдел СМП». */
export const DEFAULT_ROLES_TO_ADD = "1538690943107072086";
export const DEFAULT_ROLES_TO_REMOVE = "1538690943107072085";

/** Отдел в никнейме: `Отдел | Имя Фамилия | Static ID`. */
export const DEFAULT_DEPARTMENT = "СМП";

/**
 * Роль, которая остаётся у уволенного вместо всех прочих, — «Гражданин».
 */
export const DEFAULT_CITIZEN_ROLE_ID = "1538718995811672175";

/** Отдел в нике уволенного: «Гр.» от «Гражданин», как называется и роль. */
export const DEFAULT_DISMISSAL_DEPARTMENT = "Гр.";

/** Отметка обработанного сообщения. */
export const DEFAULT_REACTION_EMOJI = "✅";

/**
 * Заявление на увольнение приходит от другого бота (MajesticStateBot) и без
 * заголовка embed'а вовсе, поэтому опознаётся по набору полей. Имена полей у
 * него заканчиваются пробелом и двоеточием: «Имя Фамилия :».
 */
export const FIELD_DISMISSAL_REASON = /причина\s+увольнения/;

/** Поле «Запрашивает увольнение :» — упоминание увольняемого. */
export const FIELD_DISMISSAL_REQUEST = /запрашивает\s+увольнение/;

/** Поле «Discord ID :» — ID увольняемого, в обратных кавычках. */
export const FIELD_DISCORD_ID = /discord\s*id/;

/** Поле «Имя Фамилия :» — здесь это ник целиком: «Отдел | Имя Фамилия | Static». */
export const FIELD_DISMISSAL_NAME = /имя\s+фамилия/;

/**
 * Поле «Ранг :» — текущий ранг увольняемого, в обратных кавычках.
 *
 * Отрицательный просмотр вместо `\b`: граница слова в JS определяется по
 * латинскому `\w`, поэтому после кириллического «ранг» её нет вовсе и `\b`
 * не совпадает никогда. Просмотр же честно отсекает «ранговый» и подобное.
 */
export const FIELD_DISMISSAL_RANK = /^ранг(?![а-яе])/;

/** Поле «Скриншоты инвентаря :» — ссылка на скриншоты. */
export const FIELD_DISMISSAL_INVENTORY = /скриншоты\s+инвентаря/;
