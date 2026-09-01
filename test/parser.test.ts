/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { isChannelAllowed, parseChannelList } from "../channels";
import { formatIssue, resolveLang } from "../i18n";
import { parseNameStatic, parseRanks, parseReport, parseTargetUserId } from "../parser";
import { validateRanks } from "../ranks";
import { DEFAULT_TEMPLATE, messageLink, renderAudit } from "../template";

const SAMPLES = join(import.meta.dirname, "..", "samples");

function report(file: string) {
    return JSON.parse(readFileSync(join(SAMPLES, "reports", file), "utf8"));
}

function expectedAudit(index: number): string {
    const text = readFileSync(join(SAMPLES, "audits.txt"), "utf8");
    const body = text.split("\n").filter(line => !line.startsWith("#")).join("\n");
    return body.split("---").map(block => block.trim()).filter(Boolean)[index];
}

const PROMOTER = {
    promoterId: "100000000000000000",
    promoterName: "Виктор Громов",
    promoterStatic: "500"
};

test("сквозной тест: отчёт 01 → эталонный аудит", () => {
    const result = parseReport(report("01-ordinator-to-senior.json"));
    assert.ok(result.ok, result.ok ? "" : formatIssue(result.issue, "ru"));

    const audit = renderAudit(DEFAULT_TEMPLATE, {
        ...PROMOTER,
        targetId: result.report.targetUserId!,
        targetName: result.report.name,
        targetStatic: result.report.staticId,
        oldRank: result.report.oldRank,
        newRank: result.report.newRank,
        reportLink: messageLink("1538690942738112634", "1538690946156462094", "200000000000000001")
    });

    assert.equal(audit, expectedAudit(0));
});

test("ранг из нескольких слов с точками: Зам. зав. отделением [10]", () => {
    const result = parseReport(report("02-surgeon-to-deputy.json"));
    assert.ok(result.ok);
    assert.deepEqual(result.report, {
        targetUserId: "100000000000000002",
        name: "Ольга Ветрова",
        staticId: "10002",
        oldRank: 9,
        newRank: 10,
        oldRankName: "Хирург",
        newRankName: "Зам. зав. отделением"
    });
    assert.deepEqual(result.warnings, []);
});

test("многострочное поле «Остальное» не мешает разбору", () => {
    const result = parseReport(report("03-senior-to-psychiatrist-ostalnoe.json"));
    assert.ok(result.ok);
    assert.equal(result.report.name, "Пётр Соколов");
    assert.equal(result.report.staticId, "10003");
    assert.deepEqual([result.report.oldRank, result.report.newRank], [6, 7]);
});

test("хвост в поле баллов не влияет на разбор", () => {
    const result = parseReport(report("04-senior-to-psychiatrist-meropriyatiya.json"));
    assert.ok(result.ok);
    assert.equal(result.report.targetUserId, "100000000000000004");
    assert.deepEqual([result.report.oldRank, result.report.newRank], [6, 7]);
});

test("упоминание роли не принимается за повышаемого", () => {
    assert.equal(parseTargetUserId("<@&1541779227018526741> | <@100000000000000001>"), "100000000000000001");
    assert.equal(parseTargetUserId("<@&1541779227018526741>"), null);
    assert.equal(parseTargetUserId("<@!100000000000000001>"), "100000000000000001");
    assert.equal(parseTargetUserId(""), null);
});

test("имя и статик: markdown и лишние пробелы срезаются", () => {
    assert.deepEqual(parseNameStatic("Артур Белов | 10001"), { name: "Артур Белов", staticId: "10001" });
    assert.deepEqual(parseNameStatic("**Илья Морозов|10004**"), { name: "Илья Морозов", staticId: "10004" });
    assert.equal(parseNameStatic("Илья Морозов"), null);
});

test("ранги: разные виды стрелки", () => {
    const expected = { oldRank: 5, newRank: 6, oldRankName: "Ординатор", newRankName: "Старший ординатор" };
    assert.deepEqual(parseRanks("Ординатор [5] → Старший ординатор [6]"), expected);
    assert.deepEqual(parseRanks("Ординатор [5] -> Старший ординатор [6]"), expected);
    assert.equal(parseRanks("Ординатор [5]"), null);
    assert.equal(parseRanks("Ординатор → Старший ординатор"), null);
});

test("проверка по таблице СМП ловит опечатку и прыжок через ранг", () => {
    assert.deepEqual(validateRanks(5, 6, "Ординатор", "Старший ординатор"), []);
    assert.deepEqual(validateRanks(10, 11, "Зам зав отделением", "Заведующий отделением"), []);

    assert.deepEqual(validateRanks(5, 6, "Ординатор", "Терапевт"),
        [{ code: "rank-name-mismatch", rank: 6, name: "Терапевт", expected: "Старший ординатор" }]);

    assert.deepEqual(validateRanks(5, 7, "Ординатор", "Психиатр"),
        [{ code: "rank-jump", from: 5, to: 7 }]);

    const outOfRange = validateRanks(2, 3, "Стажёр", "Санитар");
    assert.equal(outOfRange.length, 2);
    assert.equal(outOfRange[0].code, "rank-out-of-table");
});

test("язык: auto следует за Discord, явный выбор перекрывает", () => {
    assert.equal(resolveLang("auto", "ru"), "ru");
    assert.equal(resolveLang("auto", "ru-RU"), "ru");
    assert.equal(resolveLang("auto", "en-US"), "en");
    assert.equal(resolveLang("auto", undefined), "en");
    assert.equal(resolveLang("en", "ru"), "en");
    assert.equal(resolveLang("ru", "en-US"), "ru");
});

test("каждая проблема переводится на оба языка и подставляет данные", () => {
    const issues = [
        { code: "no-report-embed" },
        { code: "missing-name-field" },
        { code: "unparsable-name", value: "Илья Морозов" },
        { code: "missing-rank-field" },
        { code: "unparsable-ranks", value: "Ординатор [5]" },
        { code: "no-user-mention" },
        { code: "rank-out-of-table", rank: 2, name: "Стажёр" },
        { code: "rank-name-mismatch", rank: 6, name: "Терапевт", expected: "Старший ординатор" },
        { code: "rank-jump", from: 5, to: 7 }
    ] as const;

    for (const issue of issues) {
        for (const lang of ["en", "ru"] as const) {
            const text = formatIssue(issue, lang);
            assert.ok(text && text.length > 5, `${issue.code}/${lang} пустой`);
        }
    }

    assert.match(formatIssue(issues[2], "ru"), /Илья Морозов/);
    assert.match(formatIssue(issues[2], "en"), /Илья Морозов/);
    assert.equal(formatIssue(issues[8], "en"), "Promotion is not by a single rank: 5 → 7");
    assert.equal(formatIssue(issues[8], "ru"), "Повышение не на один ранг: 5 → 7");
});

test("сообщение без отчёта отклоняется с понятной ошибкой", () => {
    const result = parseReport({ content: "привет", embeds: [] });
    assert.equal(result.ok, false);
    assert.deepEqual(result.ok ? null : result.issue, { code: "no-report-embed" });
});

test("фильтр каналов: пустая настройка пропускает всё", () => {
    assert.equal(isChannelAllowed("1538690946156462094", ""), true);
    assert.equal(isChannelAllowed("123", "   "), true);
});

test("фильтр каналов: разделители и мусор в списке", () => {
    assert.deepEqual(parseChannelList("1538690946156462094"), ["1538690946156462094"]);
    assert.deepEqual(parseChannelList("111, 222\n333  444"), ["111", "222", "333", "444"]);
    assert.deepEqual(parseChannelList(" , ; "), []);

    assert.equal(isChannelAllowed("222", "111, 222"), true);
    assert.equal(isChannelAllowed("999", "111, 222"), false);
});
