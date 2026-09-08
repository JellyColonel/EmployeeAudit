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
import { isPromotionReport, isShortPromotion, looksLikePromotion, parseMessageLink, parseNameStatic, parseRanks, parseReport, parseShortRanks, parseTargetUserId } from "../parser";
import { validateRanks } from "../ranks";
import { DEFAULT_COMMAND_TEMPLATE, DEFAULT_TEMPLATE, messageLink, renderAudit, usesPlaceholder } from "../template";

const SAMPLES = join(import.meta.dirname, "..", "samples");

function report(file: string) {
    return JSON.parse(readFileSync(join(SAMPLES, "reports", file), "utf8"));
}

/** Эталон под номером `index` из файла с примерами (блоки разделены «---»). */
function expected(file: string, index: number): string {
    const text = readFileSync(join(SAMPLES, file), "utf8");
    const body = text.split("\n").filter(line => !line.startsWith("#")).join("\n");
    return body.split("---").map(block => block.trim()).filter(Boolean)[index];
}

const PROMOTER = {
    promoterId: "100000000000000000",
    promoterName: "Виктор Громов",
    promoterStatic: "500"
};

/** Хендл в отчёте не приходит: плагин берёт его из UserStore по упоминанию. */
const TARGET_USERNAME = "arthur_belov";

test("сквозной тест: отчёт 01 → эталонный аудит", () => {
    const result = parseReport(report("01-ordinator-to-senior.json"));
    assert.ok(result.ok, result.ok ? "" : formatIssue(result.issue, "ru"));

    const data = {
        ...PROMOTER,
        targetId: result.report.targetUserId!,
        targetUsername: TARGET_USERNAME,
        targetName: result.report.name,
        targetStatic: result.report.staticId,
        oldRank: result.report.oldRank,
        newRank: result.report.newRank,
        reportLink: messageLink("1538690942738112634", "1538690946156462094", "200000000000000001")
    };

    assert.equal(renderAudit(DEFAULT_TEMPLATE, data), expected("audits.txt", 0));
    assert.equal(renderAudit(DEFAULT_COMMAND_TEMPLATE, data), expected("commands.txt", 0));
});

test("шаблон команды не требует данных повышающего, текстовый — требует", () => {
    assert.ok(usesPlaceholder(DEFAULT_TEMPLATE, "promoterName", "promoterStatic"));
    assert.ok(!usesPlaceholder(DEFAULT_COMMAND_TEMPLATE, "promoterName", "promoterStatic"));

    // Оба шаблона обходятся упоминанием: хендл нужен, только если его вписали сами.
    assert.ok(usesPlaceholder(DEFAULT_COMMAND_TEMPLATE, "targetId"));
    assert.ok(!usesPlaceholder(DEFAULT_COMMAND_TEMPLATE, "targetUsername"));
    assert.ok(!usesPlaceholder(DEFAULT_TEMPLATE, "targetUsername"));
});

test("хендл остаётся доступным плейсхолдером для своего шаблона", () => {
    const custom = "/повышение пользователь:@{targetUsername} был:{oldRank}";
    assert.ok(usesPlaceholder(custom, "targetUsername"));
    assert.equal(
        renderAudit(custom, { targetUsername: TARGET_USERNAME, oldRank: 5 } as never),
        "/повышение пользователь:@arthur_belov был:5");
});

test("сквозной тест: короткая заявка → команда", () => {
    const result = parseReport(report("05-short-form.json"));
    assert.ok(result.ok, result.ok ? "" : formatIssue(result.issue, "ru"));

    assert.equal(result.report.source, "short");
    assert.equal(result.report.targetUserId, "100000000000000008");
    assert.equal(result.report.oldRank, 3);
    assert.equal(result.report.newRank, 4);
    // Имени и статика в заявке нет — остаются пустыми
    assert.equal(result.report.name, "");
    assert.equal(result.report.staticId, "");

    const audit = renderAudit(DEFAULT_COMMAND_TEMPLATE, {
        ...PROMOTER,
        targetId: result.report.targetUserId!,
        targetUsername: TARGET_USERNAME,
        targetName: result.report.name,
        targetStatic: result.report.staticId,
        oldRank: result.report.oldRank,
        newRank: result.report.newRank,
        // Причина берётся из самой заявки, а не строится по сообщению
        reportLink: result.report.reportLink!
    });

    assert.equal(audit, expected("commands.txt", 4));
});

test("заявка: ранг вне таблицы предупреждает, но названия не сверяются", () => {
    const result = parseReport(report("05-short-form.json"));
    assert.ok(result.ok);

    // Ранг 3 ниже среднего состава — одно предупреждение и никаких «mismatch»
    assert.deepEqual(result.warnings, [{ code: "rank-out-of-table", rank: 3, name: "" }]);
    assert.equal(formatIssue(result.warnings[0], "ru"), "Ранг 3 вне диапазона среднего состава (4–11)");
});

test("повышаемый в заявке — первое упоминание, роли в конце не в счёт", () => {
    const content = "<@111> \n3-4\nhttps://discord.com/channels/1/2/3\n<@&444> <@&555>";
    assert.equal(parseTargetUserId(content, "first"), "111");
    // В отчёте бота порядок обратный: там повышаемый идёт последним
    assert.equal(parseTargetUserId("<@&444> | <@111>"), "111");
});

test("ранги заявки: только отдельной строкой и разными разделителями", () => {
    assert.deepEqual(parseShortRanks("<@1>\n3-4\nhttps://x"), { oldRank: 3, newRank: 4 });
    assert.deepEqual(parseShortRanks("10 → 11"), { oldRank: 10, newRank: 11 });
    assert.deepEqual(parseShortRanks("5 -> 6"), { oldRank: 5, newRank: 6 });

    // Числа внутри фразы заявкой не считаются — иначе пункт лез бы в чужие сообщения
    assert.equal(parseShortRanks("получилось с 3-4 попытки"), null);
    assert.equal(parseShortRanks("<@1>\nбез рангов"), null);
});

test("ссылка-причина: первая ссылка на сообщение Discord", () => {
    const content = "<@1>\n3-4\nhttps://discord.com/channels/10/20/30\nhttps://discord.com/channels/40/50/60";
    assert.equal(parseMessageLink(content), "https://discord.com/channels/10/20/30");
    assert.equal(parseMessageLink("https://canary.discord.com/channels/10/20/30"), "https://canary.discord.com/channels/10/20/30");

    // Ссылка на канал, без сообщения — не причина
    assert.equal(parseMessageLink("https://discord.com/channels/10/20"), null);
});

test("заявка без ссылки не собирается: причина осталась бы пустой", () => {
    const result = parseReport({ content: "<@111>\n3-4", embeds: [] });
    assert.ok(!result.ok);
    assert.equal(result.issue.code, "no-report-link");
});

test("распознавание формата: отчёт, заявка и постороннее сообщение", () => {
    const short = report("05-short-form.json");
    const embed = report("01-ordinator-to-senior.json");

    assert.ok(isShortPromotion(short) && !isPromotionReport(short));
    assert.ok(isPromotionReport(embed) && !isShortPromotion(embed));
    assert.ok(looksLikePromotion(short) && looksLikePromotion(embed));

    assert.ok(!looksLikePromotion({ content: "привет <@111>", embeds: [] }));
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
        newRankName: "Зам. зав. отделением",
        source: "embed"
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
        { code: "rank-jump", from: 5, to: 7 },
        // Дописывать новые коды только в конец: ниже к списку обращаются по индексу.
        { code: "promoter-not-configured" },
        { code: "unknown-username" }
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
