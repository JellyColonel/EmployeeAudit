/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import assert from "node:assert/strict";
import { test } from "node:test";

import { NICK_MAX_LENGTH, renameDepartment } from "../nickname";
import { type ParsedReport } from "../parser";
import { buildPlan, crossesRoleBoundary, DEFAULT_ROLE_THRESHOLD, isPlanEmpty, type PlanSettings } from "../plan";

const SETTINGS: PlanSettings = {
    stepRoles: true,
    stepNickname: true,
    stepAudit: true,
    stepReaction: true,
    stepCopyCommand: true,
    roleThreshold: DEFAULT_ROLE_THRESHOLD,
    rolesToAdd: "1538690943107072086",
    rolesToRemove: "1538690943107072085",
    department: "СМП",
    auditChannelId: "1538690946156462094",
    reactionEmoji: "✅"
};

function report(over: Partial<ParsedReport> = {}): ParsedReport {
    return {
        targetUserId: "921022797029994507",
        name: "Юрий Белый",
        staticId: "87052",
        oldRank: 3,
        newRank: 4,
        oldRankName: "Интерн",
        newRankName: "Фельдшер",
        source: "embed",
        ...over
    };
}

function plan(over: Partial<ParsedReport> = {}, settings: Partial<PlanSettings> = {}, currentNick: string | null = "Интерн | Юрий Белый | 87052") {
    return buildPlan({
        report: report(over),
        settings: { ...SETTINGS, ...settings },
        auditText: "Повышение\n…",
        commandText: "/повышение пользователь:<@921022797029994507> был:3 стал:4 причина:https://example.com",
        currentNick
    });
}

test("границу состава пересекает только повышение с 3 на 4 и выше", () => {
    assert.equal(crossesRoleBoundary(3, 4, 4), true);
    assert.equal(crossesRoleBoundary(3, 5, 4), true, "повышение через ранг тоже вход в состав");
    assert.equal(crossesRoleBoundary(4, 5, 4), false);
    assert.equal(crossesRoleBoundary(5, 6, 4), false);
    assert.equal(crossesRoleBoundary(10, 11, 4), false);
});

test("вход в средний состав: роли и отдел в нике меняются", () => {
    const result = plan();
    assert.ok(result.ok);

    assert.deepEqual(result.plan.roles, {
        add: ["1538690943107072086"],
        remove: ["1538690943107072085"]
    });
    assert.deepEqual(result.plan.nickname, {
        from: "Интерн | Юрий Белый | 87052",
        to: "СМП | Юрий Белый | 87052"
    });
    assert.equal(result.plan.audit?.channelId, "1538690946156462094");
    assert.equal(result.plan.reaction, "✅");
    assert.match(result.plan.command!, /^\/повышение /);
});

test("повышение внутри состава роли и ник не трогает", () => {
    const result = plan({ oldRank: 5, newRank: 6 });
    assert.ok(result.ok);

    assert.equal(result.plan.roles, null);
    assert.equal(result.plan.nickname, null);
    // Аудит и галочка нужны при любом повышении
    assert.ok(result.plan.audit);
    assert.equal(result.plan.reaction, "✅");
});

test("выключенные шаги в план не попадают", () => {
    const result = plan({}, { stepRoles: false, stepAudit: false });
    assert.ok(result.ok);
    assert.equal(result.plan.roles, null);
    assert.equal(result.plan.audit, null);
    assert.ok(result.plan.nickname);
    assert.ok(result.plan.command, "команда не зависит от выключенного аудита");
});

test("команда копируется и при повышении внутри состава", () => {
    // Ради этого шаг и нужен: роли с ником там не меняются, а /повышение
    // вызывать всё равно надо — плагин отправить её не может.
    const result = plan({ oldRank: 5, newRank: 6 }, { stepAudit: false });
    assert.ok(result.ok);
    assert.equal(result.plan.roles, null);
    assert.equal(result.plan.nickname, null);
    assert.ok(result.plan.command);
    assert.equal(result.plan.reaction, "✅");
});

test("план без единого шага виден как пустой", () => {
    const result = plan({}, { stepRoles: false, stepNickname: false, stepAudit: false, stepReaction: false, stepCopyCommand: false });
    assert.ok(result.ok);
    assert.equal(isPlanEmpty(result.plan), true);
});

test("незаполненные настройки останавливают сборку до подтверждения", () => {
    const noRoles = plan({}, { rolesToAdd: "", rolesToRemove: "" });
    assert.equal(noRoles.ok, false);
    assert.equal(noRoles.ok === false && noRoles.issue.code, "roles-not-configured");

    const noChannel = plan({}, { auditChannelId: "" });
    assert.equal(noChannel.ok === false && noChannel.issue.code, "audit-channel-not-set");

    const noDepartment = plan({}, { department: " " });
    assert.equal(noDepartment.ok === false && noDepartment.issue.code, "department-not-set");

    const noEmoji = plan({}, { reactionEmoji: "" });
    assert.equal(noEmoji.ok === false && noEmoji.issue.code, "reaction-not-set");
});

test("ник без ожидаемого формата не трогается", () => {
    const noNick = plan({}, {}, null);
    assert.equal(noNick.ok === false && noNick.issue.code, "no-current-nick");

    const plain = plan({}, {}, "Юрий Белый");
    assert.equal(plain.ok === false && plain.issue.code, "unparsable-nick");
});

test("слишком длинный ник — отказ, а не обрезка", () => {
    const long = plan({}, { department: "Отдел скорой медицинской помощи" }, "Интерн | Юрий Белый | 87052");
    assert.equal(long.ok === false && long.issue.code, "nickname-too-long");
});

test("уже правильный отдел шагом не считается", () => {
    const result = plan({}, {}, "СМП | Юрий Белый | 87052");
    assert.ok(result.ok);
    assert.equal(result.plan.nickname, null);
});

test("замена отдела сохраняет сокращённые имена", () => {
    // Люди сами сокращают имя или фамилию, чтобы влезть в 32 символа: сборка
    // ника заново по отчёту затёрла бы это сокращение.
    assert.equal(renameDepartment("Интерн | Е. Куртасов | 39018", "СМП"), "СМП | Е. Куртасов | 39018");
    assert.equal(renameDepartment("Интерн|Юрий Белый|87052", "СМП"), "СМП | Юрий Белый | 87052");
    assert.equal(renameDepartment("Юрий Белый", "СМП"), null);
    assert.ok("СМП | Егор Куртасов | 39018".length <= NICK_MAX_LENGTH);
});
