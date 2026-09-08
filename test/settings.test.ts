/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

// Сам факт успешного импорта «../settings» — половина проверки: сломанная версия
// падала именно здесь, на этапе загрузки модуля, и уносила с собой весь Vencord.
import { parseChannelList } from "../channels";
import { DEFAULT_CHANNEL_IDS, DEFAULT_REPORT_CHANNEL_ID, DEFAULT_REQUEST_CHANNEL_ID } from "../constants";
import { currentLang, settings } from "../settings";
import { DEFAULT_COMMAND_TEMPLATE } from "../template";
import { setLocale } from "./stubs/vencord.mjs";

const KEYS = ["language", "promoterName", "promoterStatic", "promoterId", "channelIds", "action",
    "showAuditItem", "showCommandItem", "template", "commandTemplate"] as const;

test("модуль настроек грузится и отдаёт store с умолчаниями", () => {
    assert.equal(settings.store.language, "auto");
    // Оба канала: отчёты бота и заявки, написанные руками
    assert.equal(settings.store.channelIds, DEFAULT_CHANNEL_IDS);
    assert.deepEqual(parseChannelList(DEFAULT_CHANNEL_IDS), [DEFAULT_REPORT_CHANNEL_ID, DEFAULT_REQUEST_CHANNEL_ID]);

    // Личные данные не зашиты в дефолты: каждый заполняет свои
    assert.equal(settings.store.promoterName, "");
    assert.equal(settings.store.promoterStatic, "");
    assert.equal(settings.store.promoterId, "");

    // Оба пункта меню показываются, пока их не выключили
    assert.equal(settings.store.showAuditItem, true);
    assert.equal(settings.store.showCommandItem, true);
    assert.equal(settings.store.commandTemplate, DEFAULT_COMMAND_TEMPLATE);
});

test("описания читаются лениво и не пустые", () => {
    for (const key of KEYS) {
        const { description } = settings.def[key];
        assert.equal(typeof description, "string", `${key}: описание не строка`);
        assert.ok(description.length > 3, `${key}: описание пустое`);
    }
});

test("описания следуют за языком без перезагрузки", () => {
    settings.store.language = "ru";
    assert.equal(settings.def.promoterStatic.description, "Ваш Static ID");

    settings.store.language = "en";
    assert.equal(settings.def.promoterStatic.description, "Your Static ID");

    settings.store.language = "auto";
    setLocale("ru-RU");
    assert.equal(currentLang(), "ru");
    assert.equal(settings.def.promoterStatic.description, "Ваш Static ID");

    setLocale("en-US");
    assert.equal(currentLang(), "en");
});

test("подписи вариантов выбора тоже локализуются", () => {
    settings.store.language = "ru";
    assert.deepEqual(settings.def.action.options.map((o: any) => o.label),
        ["Скопировать в буфер обмена", "Вставить в поле ввода", "И то, и другое"]);

    settings.store.language = "en";
    assert.deepEqual(settings.def.action.options.map((o: any) => o.label),
        ["Copy to clipboard", "Insert into the chat box", "Both"]);
});
