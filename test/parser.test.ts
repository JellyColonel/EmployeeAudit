import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { test } from "node:test";

import { isChannelAllowed, parseChannelList } from "../channels";
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
    promoterName: "Бронислав Небесный",
    promoterStatic: "597"
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
        reportLink: messageLink("1538690942738112634", "1538690946156462094", "1544107332013662338")
    });

    assert.equal(audit, expectedAudit(0));
});

test("ранг из нескольких слов с точками: Зам. зав. отделением [10]", () => {
    const result = parseReport(report("02-surgeon-to-deputy.json"));
    assert.ok(result.ok);
    assert.deepEqual(result.report, {
        targetUserId: "330020218627948545",
        name: "Эмилия Небесная",
        staticId: "9200",
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
    assert.equal(result.report.name, "Родион Араев");
    assert.equal(result.report.staticId, "10055");
    assert.deepEqual([result.report.oldRank, result.report.newRank], [6, 7]);
});

test("хвост в поле баллов не влияет на разбор", () => {
    const result = parseReport(report("04-senior-to-psychiatrist-meropriyatiya.json"));
    assert.ok(result.ok);
    assert.equal(result.report.targetUserId, "258188394239098881");
    assert.deepEqual([result.report.oldRank, result.report.newRank], [6, 7]);
});

test("упоминание роли не принимается за повышаемого", () => {
    assert.equal(parseTargetUserId("<@&1541779227018526741> | <@282179089203331073>"), "282179089203331073");
    assert.equal(parseTargetUserId("<@&1541779227018526741>"), null);
    assert.equal(parseTargetUserId("<@!282179089203331073>"), "282179089203331073");
    assert.equal(parseTargetUserId(""), null);
});

test("имя и статик: markdown и лишние пробелы срезаются", () => {
    assert.deepEqual(parseNameStatic("Евгений Курчатов | 45642"), { name: "Евгений Курчатов", staticId: "45642" });
    assert.deepEqual(parseNameStatic("**Андрей Титов|2374**"), { name: "Андрей Титов", staticId: "2374" });
    assert.equal(parseNameStatic("Андрей Титов"), null);
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
