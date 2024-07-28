import '@logseq/libs' //https://plugins-doc.logseq.com/
import { setup as l10nSetup, t } from "logseq-l10n" //https://github.com/sethyuan/logseq-l10n
import { settingsTemplate } from "./settings"
import { BlockEntity, PageEntity } from '@logseq/libs/dist/LSPlugin.user'
import removeMd from "remove-markdown"
import { removeListWords, removeMarkdownAliasLink, removeMarkdownImage, removeMarkdownLink, removeProperties, replaceOverCharacters } from './markdown'
import cssToc from "./toc.css?inline"
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
const pluginName = "Tabbed Headers for Page Content"
const keyToolbar = "tabbedHeadersToolbar"
const icon = "🪧"
const keyToolbarPopup = "tabbedHeadersToolbarPopup"
const keyToolbarHeaderSpace = "tabbedHeadersToolbarHeaderSpace"
const keyToggleTableId = "thfpc--toggleHeader"
const tabbedHeadersToggle = "tabbedHeadersToggle"
const keyToggleH1 = `${tabbedHeadersToggle}H1`
const keyToggleH2 = `${tabbedHeadersToggle}H2`
const keyToggleH3 = `${tabbedHeadersToggle}H3`
const keyToggleH4 = `${tabbedHeadersToggle}H4`
const keyToggleH5 = `${tabbedHeadersToggle}H5`
const keyToggleH6 = `${tabbedHeadersToggle}H6`
const keyToolbarContent = "tabbedHeadersToolbarContent"
const keyHeaderListUlId = "thfpc--toc-content"
const keyRefreshButton = "tabbedHeadersRefreshButton"

//現在のページ名とuuidの保持
let currentPageOriginalName: PageEntity["originalName"] = ""
let currentPageUuid: PageEntity["uuid"] = ""


const updateCurrentPage = async (pageName: string, pageUuid: PageEntity["uuid"]) => {
  currentPageOriginalName = pageName
  currentPageUuid = pageUuid
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
  logseq.provideStyle(`
  body>div#tabbed-headers-for-page-content--${keyToolbarPopup} {
    & table#${keyToggleTableId} th {
      padding: 0.5em;
    }
    & ul#${keyHeaderListUlId} {
      min-height: 300px;
      font-size: 0.88em;
      & li {
        height: 2.2em;
        overflow: hidden;
        text-overflow: ellipsis;
        padding-top: 0.5em;
        padding-bottom: 0.5em;
      }
    }
    & #${keyToggleTableId} {
      font-size: 0.85em;
    }
    & button {
      opacity: 0.7;
      &:hover {
        opacity: 1;
        text-decoration: underline;
      }
    }
    & hr {
      margin-top: 1em;
      margin-bottom: 1em;
    }
  }
  ${cssToc}
  `)


  //ツールバーにポップアップ画面を開くボタンを追加
  logseq.App.registerUIItem('toolbar', {
    key: keyToolbar,
    template: `<div><a class="button icon" id="${keyToolbar}" data-on-click="${keyToolbar}" style="font-size: 16px">${icon}</a></div>`,
  })


  //クリックイベント
  logseq.provideModel({

    //ツールバーのボタンをクリックしたら、ポップアップを表示
    [keyToolbar]: () => openPopupFromToolbar(),

    //リフレッシュボタンを押したらポップアップの本文をリフレッシュ
    [keyRefreshButton]: () => displayHeadersList(),

    //h1の表示・非表示
    [keyToggleH1]: () => hideHeaderFromList("H1"),
    //h2の表示・非表示
    [keyToggleH2]: () => hideHeaderFromList("H2"),
    //h3の表示・非表示
    [keyToggleH3]: () => hideHeaderFromList("H3"),
    //h4の表示・非表示
    [keyToggleH4]: () => hideHeaderFromList("H4"),
    //h5の表示・非表示
    [keyToggleH5]: () => hideHeaderFromList("H5"),
    //h6の表示・非表示
    [keyToggleH6]: () => hideHeaderFromList("H6"),

  })


  logseq.beforeunload(async () => {
    //ポップアップを削除
    removePopup()
  })/* end_beforeunload */


}/* end_main */



let processingButton = false
const hideHeaderFromList = (headerName: string) => {
  if (processingButton) return
  processingButton = true
  setTimeout(() => processingButton = false, 300)
  //リストから該当のヘッダーを削除
  toggleHeaderVisibility(headerName)
  //keyToggleの色を赤にする
  const button = parent.document.getElementById(`${tabbedHeadersToggle}${headerName.toUpperCase()}`) as HTMLElement | null
  if (button)
    button.style.color = button.style.color === "red" ?
      "unset"
      : "red"
}


const removePopup = () => {
  parent.document.getElementById(logseq.baseInfo.id + "--" + keyToolbarPopup)?.remove()
}


const openPopupFromToolbar = () => {

  //ポップアップを表示
  logseq.provideUI({
    attrs: {
      title: `${icon}${pluginName} ${t("Plugin")}`,
    },
    key: keyToolbarPopup,
    reset: true,
    style: {
      width: "370px",
      height: "600px",
      overflowY: "auto",
      left: "unset",
      bottom: "unset",
      right: "1em",
      top: "4em",
      paddingLeft: "2em",
      paddingTop: "2em",
      backgroundColor: 'var(--ls-primary-background-color)',
      color: 'var(--ls-primary-text-color)',
      boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
    },
    template: `
        <div title="">
        <p id="${keyToolbarHeaderSpace}"></p>
        <table style="margin-left: auto; margin-right: auto;" id="${keyToggleTableId}">
        <tr>
        <th><button id="${keyToggleH1}" data-on-click="${keyToggleH1}" title="${t("Toggle for hide")}">h1</button></th>
        <th><button id="${keyToggleH2}" data-on-click="${keyToggleH2}" title="${t("Toggle for hide")}">h2</button></th>
        <th><button id="${keyToggleH3}" data-on-click="${keyToggleH3}" title="${t("Toggle for hide")}">h3</button></th>
        <th><button id="${keyToggleH4}" data-on-click="${keyToggleH4}" title="${t("Toggle for hide")}">h4</button></th>
        <th><button id="${keyToggleH5}" data-on-click="${keyToggleH5}" title="${t("Toggle for hide")}">h5</button></th>
        <th><button id="${keyToggleH6}" data-on-click="${keyToggleH6}" title="${t("Toggle for hide")}">h6</button></th>
        </tr>
        </table>
        <hr/>
        <div id="${keyToolbarContent}"></div>
        </div>
        <style>
        /* h1,h2,h3,h4,h5,h6を持つブロックの子要素を非表示にする ブロックズームを除く */
          div.page:has(.page-title) div[haschild="true"].ls-block:has(h1,h2,h3,h4,h5,h6) {
            &>div.block-children-container {
              display: none;
            }
          }
        </style>
        `,
  })
  setTimeout(() =>
    displayHeadersList()//ポップアップの本文を作成・リフレッシュ
    , 50)
}



//処理中フラグ
let processing = false

//ポップアップの本文を作成・リフレッシュ
const displayHeadersList = async () => {
  if (processing) return
  processing = true
  setTimeout(() => processing = false, 1000)

  // ポップアップの本文を取得
  const popupMain = parent.document.getElementById(keyToolbarContent) as HTMLElement | null
  if (popupMain) {
    popupMain.innerHTML = ""//リフレッシュ


    const currentPageOrBlockEntity = await logseq.Editor.getCurrentPage() as PageEntity | BlockEntity | null
    if (currentPageOrBlockEntity) {
      // console.log("currentPageEntity is not null")
      // console.log(currentPageOrBlockEntity)
      if (currentPageOrBlockEntity.originalName) {
        if (currentPageOrBlockEntity.originalName !== currentPageOriginalName)
          updateCurrentPage(currentPageOrBlockEntity.originalName as PageEntity["originalName"], currentPageOrBlockEntity.uuid as PageEntity["uuid"])
      } else
        if ((currentPageOrBlockEntity as BlockEntity).page) {
          const pageEntity = await logseq.Editor.getPage((currentPageOrBlockEntity as BlockEntity).page.id) as { uuid: PageEntity["uuid"], originalName: PageEntity["originalName"] }
          if (pageEntity) {
            // console.log("pageEntity is not null")
            // console.log(pageEntity)
            if (pageEntity.originalName
              && pageEntity.originalName !== currentPageOriginalName)
              updateCurrentPage(pageEntity.originalName, pageEntity.uuid)
          }
        }
    }

    if (currentPageOriginalName === "") {
      // ズームページでもない場合
      noHeadersFound(popupMain)
      setTimeout(() =>
        removePopup()
        , 2000)
      return
    } else {

      // ページ名を表示
      generatePageButton()

      // ヘッダー一覧を生成
      await generateHeaderList(popupMain)
    }


    setTimeout(() => {
      //hr
      popupMain.appendChild(document.createElement("hr"))
      // タイムスタンプを反映
      popupMain.appendChild(createTimestampAndUpdateButton())
    }, 1000)
  }
}


const getHeaderLevel = (header: string): number => {
  const match = header.match(/^(#+)\s/)
  if (match)
    return match[1].length
  else
    return 0
}


const noHeadersFound = (popupMain: HTMLElement) => {
  popupMain.appendChild(document.createElement("p")).textContent = t("No headers found.")
}


const createTimestampAndUpdateButton = () => {
  const timestamp = document.createElement("p")
  timestamp.textContent = new Date().toLocaleString()
  timestamp.className = "flex justify-between text-sm"
  // リフレッシュボタン
  const refreshButton = document.createElement("button")
  refreshButton.className = "button"
  refreshButton.textContent = "🔄"
  refreshButton.title = t("Refresh")
  refreshButton.dataset.onClick = keyRefreshButton
  timestamp.appendChild(refreshButton)
  return timestamp
}


const generateHeaderList = async (popupMain: HTMLElement) => {
  const headerListArray = await logseq.Editor.getPageBlocksTree(currentPageUuid) as {
    content: BlockEntity["content"]
    uuid: BlockEntity["uuid"]
    properties: BlockEntity["properties"]
  }[]
  // console.log(headerListArray);
  if (headerListArray) {
    // 「# 」や「## 」「### 」「#### 」「##### 」「###### 」のいずれかで始まるヘッダーをもつcontentのみを抽出する
    const filteredHeaders = headerListArray
      .filter((block) => {
        const headerLevel = getHeaderLevel(block.content)
        return headerLevel > 0 && headerLevel <= 6
      })
      .map((block) => ({
        content: block.content,
        uuid: block.uuid,
        properties: block.properties,
        headerLevel: `h${getHeaderLevel(block.content)}`
      })) as {
        content: BlockEntity["content"]
        uuid: BlockEntity["uuid"]
        properties: BlockEntity["properties"],
        headerLevel: string
      }[]
    //console.log(filteredHeaders)

    if (filteredHeaders) // ページコンテンツにヘッダーがある場合
      createHeaderList(filteredHeaders, headerListArray, popupMain)
    else
      noHeadersFound(popupMain)
  } else
    noHeadersFound(popupMain)
}


const generatePageButton = () => {
  const headerSpace = parent.document.getElementById(keyToolbarHeaderSpace) as HTMLElement | null
  if (headerSpace) {
    headerSpace.innerHTML = ""//リフレッシュ

    // ページを開くボタン
    const openButton = document.createElement("button")
    openButton.title = currentPageOriginalName
    openButton.textContent = currentPageOriginalName
    openButton.className = "button"
    openButton.style.whiteSpace = "nowrap"
    openButton.addEventListener("click", ({ shiftKey }) => {
      if (shiftKey === true)
        logseq.Editor.openInRightSidebar(currentPageUuid)

      else
        logseq.App.pushState('page', { name: currentPageOriginalName })
    })
    headerSpace.appendChild(openButton)
  }
}


const createHeaderList = async (filteredHeaders: {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
  properties: BlockEntity["properties"]
  headerLevel: string // h1, h2, h3, h4, h5, h6
}[], headerListArray: {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
}[], popupMain: HTMLElement) => {
  // ulを作成
  const divElement = document.createElement("div")
  divElement.id = keyHeaderListUlId

  for (const header of filteredHeaders) {
    // ヘッダー名のセルを作成
    const headerCell = document.createElement(header.headerLevel) as HTMLElement

    const content = await generateContent(header.content, header.properties)
    headerCell.textContent = removeMd(
      `${(content.includes("collapsed:: true")
        && content.substring(2, content.length - 16))
        || content.substring(2)}`.trim()
    )
    headerCell.addEventListener("click", openPageForHeaderAsZoom(headerListArray, header))
    divElement.appendChild(headerCell)
  }

  // ヘッダー一覧を反映
  popupMain.appendChild(divElement)
}


const generateContent = async (
  content: string,
  properties: BlockEntity["properties"]
): Promise<string> => {

  if (content.includes("((")
    && content.includes("))")) {
    // Get content if it's q block reference
    const blockIdArray = /\(([^(())]+)\)/.exec(content)
    if (blockIdArray)
      for (const blockId of blockIdArray) {
        const block = await logseq.Editor.getBlock(blockId, { includeChildren: false, })
        if (block)
          content = content.replace(`((${blockId}))`, block.content.substring(0, block.content.indexOf("id::")))
      }
  }
  //プロパティを取り除く
  content = await removeProperties(properties, content)

  //「id:: ：」以降の文字列を削除する
  if (content.includes("id:: "))
    content = content.substring(0, content.indexOf("id:: "))

  //文字列のどこかで「[[」と「]]」で囲まれているもいのがある場合は、[[と]]を削除する
  content = removeMarkdownLink(content)

  //文字列のどこかで[]()形式のリンクがある場合は、[と]を削除する
  content = removeMarkdownAliasLink(content)

  //文字数が200文字を超える場合は、200文字以降を「...」に置き換える
  content = replaceOverCharacters(content)

  //マークダウンの画像記法を全体削除する
  content = removeMarkdownImage(content)

  //リストにマッチする文字列を正規表現で取り除く
  content = removeListWords(content, logseq.settings!.tocRemoveWordList as string)

  return content
}


const toggleHeaderVisibility = (headerName: string) => {
  for (const element of (parent.document.querySelectorAll(`#${keyToolbarContent} ${headerName}`) as NodeListOf<HTMLElement>))
    element.style.display = element.style.display === "none" ?
      "block"
      : "none"
}

export function openPageForHeaderAsZoom(headerListArray: {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
}[], header: {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
}): (this: HTMLElement, ev: MouseEvent) => any {

  return ({ shiftKey }) => {
    // header.uuidをもつblockEntityを取得
    const blockEntity = headerListArray.find((block) => block.content === header.content) as { uuid: BlockEntity["uuid"] }
    if (shiftKey === true)
      logseq.Editor.openInRightSidebar(blockEntity.uuid)
    else
      logseq.App.pushState('page', { name: blockEntity.uuid }) // ズームページを開く
    logseq.Editor.setBlockCollapsed(blockEntity.uuid, false)
  }
}


logseq.ready(main).catch(console.error)
