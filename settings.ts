import { definePluginSettings } from "@api/Settings";
import { OptionType } from "@utils/types";

import { DEFAULT_TEMPLATE } from "./template";

export const settings = definePluginSettings({
    promoterName: {
        type: OptionType.STRING,
        description: "Ваше имя и фамилия — строка «Повышает»",
        default: "Виктор Громов",
        placeholder: "Имя Фамилия"
    },
    promoterStatic: {
        type: OptionType.STRING,
        description: "Ваш статик",
        default: "500",
        placeholder: "500"
    },
    promoterId: {
        type: OptionType.STRING,
        description: "Ваш Discord ID. Пусто — берётся текущий аккаунт",
        default: "",
        placeholder: "автоматически"
    },
    action: {
        type: OptionType.SELECT,
        description: "Что делать по клику",
        options: [
            { label: "Скопировать в буфер обмена", value: "copy", default: true },
            { label: "Вставить в поле ввода", value: "insert" },
            { label: "И то, и другое", value: "both" }
        ]
    },
    template: {
        type: OptionType.STRING,
        description: "Шаблон аудита. Плейсхолдеры: {promoterId} {promoterName} {promoterStatic} {targetId} {targetName} {targetStatic} {oldRank} {newRank} {reportLink}",
        default: DEFAULT_TEMPLATE,
        multiline: true
    }
});
