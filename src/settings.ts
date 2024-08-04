import { SettingSchemaDesc } from '@logseq/libs/dist/LSPlugin.user'
import { t } from 'logseq-l10n'

/* user setting */
// https://logseq.github.io/plugins/types/SettingSchemaDesc.html
export const settingsTemplate = (): SettingSchemaDesc[] => [

    {//Table of Contents、削除する単語リスト 改行区切り
        key: "tocRemoveWordList",
        title: t("Remove words from table of contents"),
        type: "string",
        inputAs: "textarea",
        default: "",
        // 改行区切り
        // 記入例:
        // #tagのような文字列
        //正規表現に対応
        description: `
        ${t("Separate with line breaks")}
        ${t("Example:")}
        ${t("Remove the string")} >> #tag
        ${t("Regular expression is supported")} >> #\.side(-[a-z])?
        `,
    },
    {//目次にサブページを表示するかどうか
        key: "tocShowSubPage",
        title: t("Show sub-pages in table of contents"),
        type: "boolean",
        default: true,
        description: "",
    },
    {//ページ名に階層が含まれている場合、その最後の階層をもとにクエリーを取得する
        key: "queryLastHierarchy",
        title: t("Query the last hierarchy if the page name contains a hierarchy"),
        type: "boolean",
        default: true,
        description: "",
    },
]
