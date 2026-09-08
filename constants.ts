/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

/** Канал, в котором бот «Ева Повышаловна» публикует отчёты. */
export const DEFAULT_REPORT_CHANNEL_ID = "1538690946156462094";

/** Канал, где повышения оформляют короткой заявкой, без бота. */
export const DEFAULT_REQUEST_CHANNEL_ID = "1541899893780516924";

/** Оба канала — значение настройки `channelIds` по умолчанию. */
export const DEFAULT_CHANNEL_IDS = [DEFAULT_REPORT_CHANNEL_ID, DEFAULT_REQUEST_CHANNEL_ID].join(",");

/** Заголовок embed'а отчёта. Сравнение нечувствительно к регистру и «е/ё». */
export const REPORT_TITLE = "Отчет на повышение";

/** Поле с именем и статиком повышаемого. */
export const FIELD_NAME_STATIC = /имя\s+фамилия/;

/** Поле «С какого на какой ранг повышаетесь?». */
export const FIELD_RANKS = /с\s+какого\s+на\s+какой\s+ранг/;
