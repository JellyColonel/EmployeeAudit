/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { DEFAULT_REPORT_CHANNEL_ID } from "./constants";
import { DEFAULT_TEMPLATE } from "./template";

export const settings = definePluginSettings({
    promoterName: {
        type: OptionType.STRING,
        description: "Your in-game first and last name — the «Повышает» line",
        default: "Виктор Громов",
        placeholder: "Имя Фамилия"
    },
    promoterStatic: {
        type: OptionType.STRING,
        description: "Your static ID",
        default: "500",
        placeholder: "500"
    },
    promoterId: {
        type: OptionType.STRING,
        description: "Your Discord ID. Leave empty to use the current account",
        default: "",
        placeholder: "automatic"
    },
    channelIds: {
        type: OptionType.STRING,
        description: "Channel IDs where the menu item is shown, comma-separated. Empty — every channel",
        default: DEFAULT_REPORT_CHANNEL_ID,
        placeholder: "every channel"
    },
    action: {
        type: OptionType.SELECT,
        description: "What clicking the item does",
        options: [
            { label: "Copy to clipboard", value: "copy", default: true },
            { label: "Insert into the chat box", value: "insert" },
            { label: "Both", value: "both" }
        ]
    },
    template: {
        type: OptionType.STRING,
        description: "Audit template. Placeholders: {promoterId} {promoterName} {promoterStatic} {targetId} {targetName} {targetStatic} {oldRank} {newRank} {reportLink}",
        default: DEFAULT_TEMPLATE,
        multiline: true
    }
});
