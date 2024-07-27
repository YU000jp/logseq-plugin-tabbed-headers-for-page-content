import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user';
import { t } from 'logseq-l10n';

/* user setting */
// https://logseq.github.io/plugins/types/SettingSchemaDesc.html
export const settingsTemplate = (): SettingSchemaDesc[] => [
    {
        key: "heading000",
        type: "heading",
        // 設定項目はありません
        title: t("No settings"),
        default: "",
        description: "",
    },
];
