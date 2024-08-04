import '@logseq/libs' //https://plugins-doc.logseq.com/
import { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin.user'
import { generateHierarchyList } from './hierarchy'
import { clickRefreshButton, generatePageButton, generateSelectForQuickAccess, openPopupFromToolbar, removePopup, toggleHeaderVisibility } from './popup'
import { settingsTemplate } from "./settings"
import { generateHeaderList, noHeadersFound } from './toc'
import cssToc from "./toc.css?inline"
import { pageEntityShort } from './type'
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
export const pluginName = "Table of contents with sub-pages"
const keyToolbar = "twsToolbar"
export const icon = "🪧"
export const keyToolbarPopup = "twsToolbarPopup"
export const keyToolbarSelectPage = "twsToolbarSelectPage"
export const keyToolbarHeaderSpace = "twsToolbarHeaderSpace"
export const keyToggleTableId = "tws--toggleHeader"
export const keySettingsButton = "twsSettingsButton"
const twsToggle = "twsToggle"
export const keyToggleH1 = `${twsToggle}H1`
export const keyToggleH2 = `${twsToggle}H2`
export const keyToggleH3 = `${twsToggle}H3`
export const keyToggleH4 = `${twsToggle}H4`
export const keyToggleH5 = `${twsToggle}H5`
export const keyToggleH6 = `${twsToggle}H6`
export const keyToolbarHierarchy = "twsToolbarHierarchy"
export const keyToolbarContent = "twsToolbarContent"
export const keyRefreshButton = "twsRefreshButton"
export const keyToggleStyleForHideBlock = "twsToggleStyleForHideBlock"

//現在のページ名とuuidの保持
export let currentPageOriginalName: PageEntity["originalName"] = ""
export let currentPageName: PageEntity["name"] = ""
export let currentPageUuid: PageEntity["uuid"] = ""
export let currentBlockUuid: BlockEntity["uuid"] = ""

export const updateBlockUuid = (uuid: BlockEntity["uuid"]) => {
  currentBlockUuid = uuid
}


export const updateCurrentPage = async (pageName: string, pageOriginalName: string, pageUuid: PageEntity["uuid"]) => {
  currentPageOriginalName = pageOriginalName
  currentPageName = pageName
  currentPageUuid = pageUuid
  currentBlockUuid = "" //ページが変わったら、ブロックのuuidをリセットする

  // logseq.settings!.historyに、配列をつくって、ページ名を履歴にいれる (重複させない)
  const history = logseq.settings!.history as string[] || []
  if (history.length === 0) {
    history.push(pageOriginalName)
    logseq.updateSettings({ history })
  } else {
    if (!history.includes(pageOriginalName)) {
      //お気に入りと重複させないようにするオプションは不要かも。
      history.unshift(pageOriginalName)
      logseq.updateSettings({ history: history.slice(0, 16) })
    }
  }
}


let processingBlockChanged: boolean = false//処理中 TOC更新中にブロック更新が発生した場合に処理を中断する

let onBlockChangedOnce: boolean = false//一度のみ
const onBlockChanged = () => {

  if (onBlockChangedOnce === true)
    return
  onBlockChangedOnce = true //index.tsの値を書き換える
  logseq.DB.onChanged(async ({ blocks }) => {

    if (processingBlockChanged === true
      || currentPageOriginalName === ""
      || logseq.settings!.booleanTableOfContents === false)
      return
    //headingがあるブロックが更新されたら
    const findBlock = blocks.find((block) => block.properties?.heading) as { uuid: BlockEntity["uuid"] } | null //uuidを得るためsomeではなくfindをつかう
    if (!findBlock) return
    const uuid = findBlock ? findBlock!.uuid : null
    updateToc()

    setTimeout(() => {
      //ブロック更新のコールバックを登録する
      if (uuid)
        logseq.DB.onBlockChanged(uuid, async () => updateToc())
    }, 200)

  })
}


const updateToc = () => {
  if (processingBlockChanged === true)
    return
  processingBlockChanged = true //index.tsの値を書き換える
  setTimeout(async () => {
    //#keyRefreshButtonをクリックする
    clickRefreshButton()
    processingBlockChanged = false
  }, 100)
}


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
  logseq.provideStyle(cssToc)


  //ツールバーにポップアップ画面を開くボタンを追加
  logseq.App.registerUIItem('toolbar', {
    key: keyToolbar,
    template: `<div><a class="button icon" id="${keyToolbar}" data-on-click="${keyToolbar}" style="font-size: 16px">${icon}</a></div>`,
  })


  //クリックイベント
  logseq.provideModel({
    [keyToolbar]: () => openPopupFromToolbar(),//ツールバーのボタンをクリックしたら、ポップアップを表示
    [keyRefreshButton]: () => displayHeadersList(),//リフレッシュボタンを押したらポップアップの本文をリフレッシュ
    [keySettingsButton]: () => logseq.showSettingsUI(),//設定ボタンを押したら設定画面を表示
    [keyToggleStyleForHideBlock]: () => toggleStyleForHideBlock(),// サブブロックを非表示にするスタイルをトグル
    [keyToggleH1]: () => hideHeaderFromList("H1"),//h1の表示・非表示
    [keyToggleH2]: () => hideHeaderFromList("H2"),//h2の表示・非表示
    [keyToggleH3]: () => hideHeaderFromList("H3"),//h3の表示・非表示
    [keyToggleH4]: () => hideHeaderFromList("H4"),//h4の表示・非表示
    [keyToggleH5]: () => hideHeaderFromList("H5"),//h5の表示・非表示
    [keyToggleH6]: () => hideHeaderFromList("H6"),//h6の表示・非表示
  })


  logseq.beforeunload(async () => {
    //ポップアップを削除
    removePopup()
  })/* end_beforeunload */


  onBlockChanged() //ブロック変更時の処理


  //ページ読み込み時に実行コールバック
  logseq.App.onRouteChanged(({ path, template }) => {
    if (template === "/page/:name"
      && decodeURI(path.substring(6)) !== currentPageName)
      routeCheck()
  })
  // logseq.App.onPageHeadActionsSlotted(() => {//動作保証のため、2つとも必要
  //   routeCheck()
  // })

  // 初回実行
  if (logseq.settings!.hideBlockChildren)
    parent.document.body.classList.add(keyToggleStyleForHideBlock)


}/* end_main */



let flagToggleStyleForHideBlock: boolean = false

const toggleStyleForHideBlock = () => {
  if (flagToggleStyleForHideBlock) return
  flagToggleStyleForHideBlock = true

  let state = false

  //body.classに「tws--hide-block」がある場合は削除する
  if (parent.document.body.classList.contains(keyToggleStyleForHideBlock))
    parent.document.body.classList.remove(keyToggleStyleForHideBlock)
  else {
    parent.document.body.classList.add(keyToggleStyleForHideBlock)
    state = true //非表示の状態であることを示す
  }
  setTimeout(() => {
    flagToggleStyleForHideBlock = false
    //#keyToggleStyleForHideBlockのトグルをマッチさせる
    const button = parent.document.getElementById(keyToggleStyleForHideBlock) as HTMLInputElement | null
    if (button)
      button.checked = state
    logseq.updateSettings({ hideBlockChildren: state })
  }, 300)
}


let processingRouteCheck = false
const routeCheck = () => {
  if (processingRouteCheck) return
  processingRouteCheck = true
  setTimeout(() => processingRouteCheck = false, 300)
  clickRefreshButton()
}


let processingButton = false
const hideHeaderFromList = (headerName: string) => {
  if (processingButton) return
  processingButton = true
  setTimeout(() => processingButton = false, 300)
  //リストから該当のヘッダーを削除
  toggleHeaderVisibility(headerName)
  const checkButton = parent.document.getElementById(`${twsToggle}${headerName.toUpperCase()}`) as HTMLInputElement | null
  if (checkButton)
    logseq.updateSettings({ [`hide${headerName}`]: checkButton.checked })  //設定を更新
}


//処理中フラグ
let processing = false

//ポップアップの本文を作成・リフレッシュ
export const displayHeadersList = async (pageUuid?: PageEntity["uuid"]) => {
  if (processing) return
  processing = true
  setTimeout(async () => {
    setTimeout(() => processing = false, 300)

    // ポップアップの本文を取得
    const popupMain = parent.document.getElementById(keyToolbarContent) as HTMLElement | null
    if (popupMain) {
      popupMain.innerHTML = ""//リフレッシュ

      if (pageUuid) {

        const pageEntity = await logseq.Editor.getPage(pageUuid, { includeChildren: false }) as pageEntityShort | null
        if (pageEntity) {
          updateCurrentPage(
            pageEntity.name,
            pageEntity.originalName,
            pageEntity.uuid,
          )
        }
      } else {

        const currentPageOrBlockEntity = await logseq.Editor.getCurrentPage() as PageEntity | BlockEntity | null
        if (currentPageOrBlockEntity) {
          // console.log("currentPageEntity is not null")
          // console.log(currentPageOrBlockEntity)
          if (currentPageOrBlockEntity.originalName) {
            if (currentPageOrBlockEntity.originalName !== currentPageOriginalName)
              updateCurrentPage(
                currentPageOrBlockEntity.name as PageEntity["name"],
                currentPageOrBlockEntity.originalName as PageEntity["originalName"],
                currentPageOrBlockEntity.uuid as PageEntity["uuid"],
              )
          } else
            if ((currentPageOrBlockEntity as BlockEntity).page) {
              const pageEntity = await logseq.Editor.getPage((currentPageOrBlockEntity as BlockEntity).page.id, { includeChildren: false }) as pageEntityShort | null
              if (pageEntity) {
                // console.log("pageEntity is not null")
                // console.log(pageEntity)
                if (pageEntity.originalName
                  && pageEntity.originalName !== currentPageOriginalName)
                  updateCurrentPage(
                    pageEntity.name,
                    pageEntity.originalName,
                    pageEntity.uuid,
                  )
                currentBlockUuid = (currentPageOrBlockEntity as BlockEntity).uuid
              }
            }
        }
      }

      if (currentPageOriginalName === "") {
        // ページでもなく、ズームページでもない場合 または、ページ名が取得できない場合

        // メッセージを表示して、ポップアップを閉じる
        noHeadersFound(popupMain)
        setTimeout(() =>
          removePopup()
          , 2000)
        return
      } else {
        generatePageButton()// ページ名を表示
        await generateHeaderList(popupMain)// ヘッダー一覧を生成
        generateHierarchyList()// 階層構造を表示
      }
      // ページセレクトボックスを表示
      generateSelectForQuickAccess(currentPageOriginalName)
    }
    //end if popupMain

  }, 10)
}


logseq.ready(main).catch(console.error)
