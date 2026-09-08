/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

// Заголовки секций — JSX, а Node умеет снимать типы, но не разбирать разметку.
// Дымовому тесту сам компонент и не нужен: он проверяет, что модуль настроек
// грузится и что `hidden` у настроек считается правильно.
export const sectionSetting = () => () => null;
