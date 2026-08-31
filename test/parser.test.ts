import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

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
    promoterId: "178560714821206016",
    promoterName: "Виктор Громов",
    promoterStatic: "500"
};

test("сквозной тест: отчёт 01 → эталонный аудит", () => {
    const result = parseReport(report("01-ordinator-to-senior.json"));
    assert.ok(result.ok, result.ok ? "" : result.error);

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

    const typo = validateRanks(5, 6, "Ординатор", "Терапевт");
    assert.equal(typo.length, 1);
    assert.match(typo[0], /Старший ординатор/);

    const jump = validateRanks(5, 7, "Ординатор", "Психиатр");
    assert.deepEqual(jump, ["Повышение не на один ранг: 5 → 7"]);

    const outOfRange = validateRanks(2, 3, "Стажёр", "Санитар");
    assert.equal(outOfRange.length, 2);
});

test("сообщение без отчёта отклоняется с понятной ошибкой", () => {
    const result = parseReport({ content: "привет", embeds: [] });
    assert.equal(result.ok, false);
    assert.match(result.ok ? "" : result.error, /нет embed/);
});
