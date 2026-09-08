/*
 * Vencord, a Discord client mod
 * Copyright (c) 2026 JellyColonel
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import { type PluginSettingComponentProps } from "@utils/types";
import { Text } from "@webpack/common";

import { type UiKey } from "./i18n";

/**
 * Заголовок сворачиваемой секции настроек.
 *
 * Своих секций у Vencord нет, но есть два кирпича, которых хватает: настройка
 * типа COMPONENT рисует что угодно, а `hidden` у остальных настроек может быть
 * функцией и проверяется на каждом рендере. Панель плагина подписана на свои
 * настройки через `useSettings`, поэтому переключение раскрывает и сворачивает
 * группу сразу, без перезапуска.
 */
export function SectionHeader({ open, label, onToggle }: { open: boolean; label: string; onToggle(): void; }) {
    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onToggle}
            onKeyDown={e => {
                if (e.key === "Enter" || e.key === " ") onToggle();
            }}
            style={{
                cursor: "pointer",
                userSelect: "none",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: 8
            }}
        >
            <Text variant="text-md/semibold">{open ? "▾" : "▸"} {label}</Text>
        </div>
    );
}

/** Настройка-заголовок: хранит состояние секции там же, где остальные настройки. */
export function sectionSetting(isOpen: () => boolean, label: () => string) {
    return function SectionSetting({ setValue }: PluginSettingComponentProps) {
        const open = isOpen();
        return <SectionHeader open={open} label={label()} onToggle={() => setValue(!open)} />;
    };
}

export type SectionLabel = UiKey;
