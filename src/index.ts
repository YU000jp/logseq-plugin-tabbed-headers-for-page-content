import '@logseq/libs' //https://plugins-doc.logseq.com/
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { settingsTemplate } from "./settings"
// import af from "./translations/af.json"
// import de from "./translations/de.json"
// import es from "./translations/es.json"
// import fr from "./translations/fr.json"
// import id from "./translations/id.json"
// import it from "./translations/it.json"
// import ja from "./translations/ja.json"
// import ko from "./translations/ko.json"
// import nbNO from "./translations/nb-NO.json"
// import nl from "./translations/nl.json"
// import pl from "./translations/pl.json"
// import ptBR from "./translations/pt-BR.json"
// import ptPT from "./translations/pt-PT.json"
// import ru from "./translations/ru.json"
// import sk from "./translations/sk.json"
// import tr from "./translations/tr.json"
// import uk from "./translations/uk.json"
// import zhCN from "./translations/zh-CN.json"
// import zhHant from "./translations/zh-Hant.json"
const keyToolbar = "tabbedHeadersToolbar"
const icon = "🛢️"


/* main */
const main = async () => {

  // //多言語化 L10N
  // await l10nSetup({
  //   builtinTranslations: {//Full translations
  //     ja, af, de, es, fr, id, it, ko, "nb-NO": nbNO, nl, pl, "pt-BR": ptBR, "pt-PT": ptPT, ru, sk, tr, uk, "zh-CN": zhCN, "zh-Hant": zhHant
  //   }
  // })
  
  // 設定の読み込み
  logseq.useSettingsSchema(settingsTemplate())

  //CSS
  // logseq.provideStyle(`

  // `)


  //ツールバーにトグルボタンを追加
  logseq.App.registerUIItem('toolbar', {
    key: keyToolbar,
    template: `<div><a class="button icon" id="${keyToolbar}" data-on-click="${keyToolbar}" style="font-size: 16px">${icon}</a></div>`,
  })


  //クリックイベント
  logseq.provideModel({



  })


  // logseq.beforeunload(async () => {

  // })/* end_beforeunload */


}/* end_main */


logseq.ready(main).catch(console.error)