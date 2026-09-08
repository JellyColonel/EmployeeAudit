/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { isDismissalRequest, parseDismissal, parseNickParts, parseUserId } from "../dismissal";
import { isPromotionReport, isShortPromotion } from "../parser";

const SAMPLES = join(import.meta.dirname, "..", "samples", "reports");

function sample(file: string) {
    return JSON.parse(readFileSync(join(SAMPLES, file), "utf8"));
}

test("заявление на увольнение разбирается целиком", () => {
    const result = parseDismissal(sample("06-dismissal.json"));
    assert.ok(result.ok);

    assert.deepEqual(result.dismissal, {
        targetUserId: "100000000000000002",
        department: "ПСЭС",
        name: "Ольга Юрьева",
        staticId: "66242",
        rank: 6,
        reason: "Ухожу по личным обстоятельствам",
        inventoryLink: "https://example.com/inventory/12345"
    });
});

test("опознаётся по полям, а не по заголовку: его у embed'а нет", () => {
    const message = sample("06-dismissal.json");
    assert.equal(message.embeds[0].rawTitle, undefined);
    assert.equal(isDismissalRequest(message), true);

    // И не путается с отчётом на повышение — у того другой набор полей
    assert.equal(isDismissalRequest(sample("01-ordinator-to-senior.json")), false);
    assert.equal(isPromotionReport(message), false);
    assert.equal(isShortPromotion(message), false);
});

test("ID берётся из поля, а не из упоминания", () => {
    // Поле «Discord ID» приходит в обратных кавычках, упоминание — в угловых
    assert.equal(parseUserId("`100000000000000002`"), "100000000000000002");
    assert.equal(parseUserId("<@100000000000000002>"), "100000000000000002");
    assert.equal(parseUserId("нет тут никакого id"), null);
});

test("ник разбирается вместе с отделом, в отличие от отчёта", () => {
    assert.deepEqual(parseNickParts("ПСЭС | Ольга Юрьева | 66242"),
        { department: "ПСЭС", name: "Ольга Юрьева", staticId: "66242" });

    // Сокращённые имена людям приходится писать самим — они тоже должны пройти
    assert.deepEqual(parseNickParts("СМП | Е. Куртасов | 39018"),
        { department: "СМП", name: "Е. Куртасов", staticId: "39018" });

    // Без отдела остаются те же две части, что и в отчёте на повышение
    assert.deepEqual(parseNickParts("Артур Белов | 10001"),
        { department: "", name: "Артур Белов", staticId: "10001" });

    assert.equal(parseNickParts("Артур Белов"), null);
});

test("чужое сообщение заявлением не считается", () => {
    assert.equal(isDismissalRequest({ content: "увольнение", embeds: [] }), false);
    assert.equal(parseDismissal({ content: "", embeds: [] }).ok, false);
});
