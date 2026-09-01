/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

// Сам факт успешного импорта — половина проверки: сломанная версия падала
// именно здесь, на этапе загрузки модуля, и уносила с собой весь Vencord.
import { currentLang, settings } from "../settings";
import { setLocale } from "./stubs/vencord.mjs";

const KEYS = ["language", "promoterName", "promoterStatic", "promoterId", "channelIds", "action", "template"] as const;

test("модуль настроек грузится и отдаёт store с умолчаниями", () => {
    assert.equal(settings.store.language, "auto");
    assert.equal(settings.store.channelIds, "1538690946156462094");

    // Личные данные не зашиты в дефолты: каждый заполняет свои
    assert.equal(settings.store.promoterName, "");
    assert.equal(settings.store.promoterStatic, "");
    assert.equal(settings.store.promoterId, "");
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
