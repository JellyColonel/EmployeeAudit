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
import { DEFAULT_CHANNEL_IDS, DEFAULT_DEPARTMENT, DEFAULT_REACTION_EMOJI, DEFAULT_REPORT_CHANNEL_ID, DEFAULT_REQUEST_CHANNEL_ID } from "../constants";
import { DEFAULT_ROLE_THRESHOLD } from "../plan";
import { currentLang, settings } from "../settings";
import { DEFAULT_COMMAND_TEMPLATE } from "../template";
import { setLocale } from "./stubs/vencord.mjs";

const KEYS = ["language", "promoterName", "promoterStatic", "promoterId", "channelIds", "action",
    "showAuditItem", "showCommandItem", "template", "commandTemplate",
    "showPromoteItem", "stepRoles", "stepNickname", "stepAudit", "stepReaction",
    "roleThreshold", "rolesToAdd", "rolesToRemove", "department", "auditChannelId", "reactionEmoji"] as const;

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

test("повышение выключено по умолчанию, а его шаги — нет", () => {
    // Пункт меняет роли, ник и пишет в канал, поэтому включается вручную.
    assert.equal(settings.store.showPromoteItem, false);

    // Сами шаги включены: когда пункт включат, он должен делать всё, а не молчать
    assert.equal(settings.store.stepRoles, true);
    assert.equal(settings.store.stepNickname, true);
    assert.equal(settings.store.stepAudit, true);
    assert.equal(settings.store.stepReaction, true);

    assert.equal(settings.store.roleThreshold, DEFAULT_ROLE_THRESHOLD);
    assert.equal(settings.store.department, DEFAULT_DEPARTMENT);
    assert.equal(settings.store.reactionEmoji, DEFAULT_REACTION_EMOJI);

    // Канал аудита у каждого свой — дефолта нет, шаг честно откажется работать
    assert.equal(settings.store.auditChannelId, "");
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
