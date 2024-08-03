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
const keyToolbarSelectPage = "tabbedHeadersToolbarSelectPage"
const keyToolbarHeaderSpace = "tabbedHeadersToolbarHeaderSpace"
const keyToggleTableId = "thfpc--toggleHeader"
const tabbedHeadersToggle = "tabbedHeadersToggle"
const keySettingsButton = "tabbedHeadersSettingsButton"
const keyToggleH1 = `${tabbedHeadersToggle}H1`
const keyToggleH2 = `${tabbedHeadersToggle}H2`
const keyToggleH3 = `${tabbedHeadersToggle}H3`
const keyToggleH4 = `${tabbedHeadersToggle}H4`
const keyToggleH5 = `${tabbedHeadersToggle}H5`
const keyToggleH6 = `${tabbedHeadersToggle}H6`
const keyToolbarContent = "tabbedHeadersToolbarContent"
const keyRefreshButton = "tabbedHeadersRefreshButton"
const keyToggleStyleForHideBlock = "tabbedHeadersToggleStyleForHideBlock"

//現在のページ名とuuidの保持
let currentPageOriginalName: PageEntity["originalName"] = ""
let currentPageName: PageEntity["name"] = ""
let currentPageUuid: PageEntity["uuid"] = ""
let currentBlockUuid: BlockEntity["uuid"] = ""


const updateCurrentPage = async (pageName: string, originalName: string, pageUuid: PageEntity["uuid"]) => {
  currentPageOriginalName = originalName
  currentPageName = pageName
  currentPageUuid = pageUuid
  currentBlockUuid = "" //ページが変わったら、ブロックのuuidをリセットする

  // logseq.settings!.historyに、配列をつくって、ページ名を履歴にいれる (重複させない)
  const history = logseq.settings!.history as string[] || []
  if (history.length === 0) {
    history.push(pageName)
    logseq.updateSettings({ history })
  } else {
    if (!history.includes(pageName)) {
      //TODO: お気に入りと重複させないようにするオプション
      history.unshift(pageName)
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
  logseq.provideStyle(`
  body>div#tabbed-headers-for-page-content--${keyToolbarPopup} {
    & #${keyToggleTableId} {
      font-size: 0.85em;
      opacity: 0.7;
      margin-left: auto;
      margin-right: auto;
      & th {
        padding: 0.5em;
      }
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



  let flagToggleStyleForHideBlock: boolean = false

  //クリックイベント
  logseq.provideModel({

    //ツールバーのボタンをクリックしたら、ポップアップを表示
    [keyToolbar]: () => openPopupFromToolbar(),

    //リフレッシュボタンを押したらポップアップの本文をリフレッシュ
    [keyRefreshButton]: () => displayHeadersList(),

    //設定ボタンを押したら設定画面を表示
    [keySettingsButton]: () => logseq.showSettingsUI(),

    [keyToggleStyleForHideBlock]: () => { // サブブロックを非表示にするスタイルをトグル
      if (flagToggleStyleForHideBlock) return
      flagToggleStyleForHideBlock = true

      let state = false

      //body.classに「thfpc--hide-block」がある場合は削除する
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
    },

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
  const checkButton = parent.document.getElementById(`${tabbedHeadersToggle}${headerName.toUpperCase()}`) as HTMLInputElement | null
  if (checkButton)
    logseq.updateSettings({ [`hide${headerName}`]: checkButton.checked })  //設定を更新
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
      width: "380px",
      height: "93vh",
      overflowY: "auto",
      left: "unset",
      bottom: "unset",
      right: "1em",
      top: "4em",
      paddingLeft: "0.2em",
      paddingTop: "0.2em",
      backgroundColor: 'var(--ls-primary-background-color)',
      color: 'var(--ls-primary-text-color)',
      boxShadow: '1px 2px 5px var(--ls-secondary-background-color)',
    },
    template: `
        <div title="">
        <div id="${keyToolbarSelectPage}"></div>
        
        <table id="${keyToggleTableId}">
        <tr>
        <th title="${t("Toggle for hide")}">h1<input type="checkbox" id="${keyToggleH1}" data-on-click="${keyToggleH1}"${logseq.settings!.hideH1 ? `checked="true"` : ""}/></th>
        <th title="${t("Toggle for hide")}">h2<input type="checkbox" id="${keyToggleH2}" data-on-click="${keyToggleH2}" ${logseq.settings!.hideH2 ? `checked="true"` : ""}/></th>
        <th title="${t("Toggle for hide")}">h3<input type="checkbox" id="${keyToggleH3}" data-on-click="${keyToggleH3}" ${logseq.settings!.hideH3 ? `checked="true"` : ""}/></th>
        <th title="${t("Toggle for hide")}">h4<input type="checkbox" id="${keyToggleH4}" data-on-click="${keyToggleH4}" ${logseq.settings!.hideH4 ? `checked="true"` : ""}/></th>
        <th title="${t("Toggle for hide")}">h5<input type="checkbox" id="${keyToggleH5}" data-on-click="${keyToggleH5}" ${logseq.settings!.hideH5 ? `checked="true"` : ""}/></th>
        <th title="${t("Toggle for hide")}">h6<input type="checkbox" id="${keyToggleH6}" data-on-click="${keyToggleH6}" ${logseq.settings!.hideH6 ? `checked="true"` : ""}/></th>
        <th title="${t("Toggle for hide")}\n${t("Black out header sub-blocks when the page is open.")}"> 👀<input type="checkbox" id="${keyToggleStyleForHideBlock}" data-on-click="${keyToggleStyleForHideBlock}" ${logseq.settings!.hideBlockChildren ? `checked="true"` : ""}/></th>
        <th title="${t("Refresh")}"><button id="${keyRefreshButton}" data-on-click="${keyRefreshButton}">🔄</button></th>
        <th title="${t("Plugin Settings")}"><button data-on-click="${keySettingsButton}">⚙️</button></th>
        </tr>
        </table>

        <hr/>
        <p id="${keyToolbarHeaderSpace}"></p>
        <div id="${keyToolbarContent}"></div>
        </div>
        <style>
          /* h1,h2,h3,h4,h5,h6を持つブロックの子要素を非表示にする ブロックズームを除く */
          body.${keyToggleStyleForHideBlock} div.page:has(.page-title) div[haschild="true"].ls-block:has(h1,h2,h3,h4,h5,h6)>div.block-children-container:not(:focus-within) {
              opacity: 0.2;
              max-height: 200px;
              overflow-y: auto;
          } 
        </style>
        `,
  })
  setTimeout(() => {
    displayHeadersList()//ポップアップの本文を作成・リフレッシュ
  }, 50)
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
          updateCurrentPage(
            currentPageOrBlockEntity.name as PageEntity["name"],
            currentPageOrBlockEntity.originalName as PageEntity["originalName"],
            currentPageOrBlockEntity.uuid as PageEntity["uuid"])
      } else
        if ((currentPageOrBlockEntity as BlockEntity).page) {
          const pageEntity = await logseq.Editor.getPage((currentPageOrBlockEntity as BlockEntity).page.id) as { uuid: PageEntity["uuid"], originalName: PageEntity["originalName"], name: PageEntity["name"] } | null
          if (pageEntity) {
            // console.log("pageEntity is not null")
            // console.log(pageEntity)
            if (pageEntity.originalName
              && pageEntity.originalName !== currentPageOriginalName)
              updateCurrentPage(
                pageEntity.name,
                pageEntity.originalName,
                pageEntity.uuid)
            currentBlockUuid = (currentPageOrBlockEntity as BlockEntity).uuid
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

    // ページセレクトボックスを表示
    generateSelectForQuickAccess(currentPageOriginalName)

  } else
    // ページセレクトボックスを表示
    generateSelectForQuickAccess()
}


const getHeaderLevel = (header: string): number => {
  // 「# 」や「## 」「### 」「#### 」「##### 」「###### 」のいずれかで始まる
  const match = header.match(/^(#{1,6})\s/) as RegExpMatchArray | null
  if (match)
    return match[1].length
  else
    return 0
}


const noHeadersFound = (popupMain: HTMLElement) => {
  popupMain.appendChild(document.createElement("p")).textContent = t("No headers found.")
}


type blockContentWithChildren = {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
  properties: BlockEntity["properties"]
  children: BlockEntity["children"]
}

type HeaderEntity = {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
  properties: BlockEntity["properties"]
  children: BlockEntity["children"]
  headerLevel: string // h1, h2, h3, h4, h5, h6
}


const generateHeaderList = async (popupMain: HTMLElement) => {
  const blocksArray = await logseq.Editor.getPageBlocksTree(currentPageUuid) as blockContentWithChildren[]
  if (blocksArray) {
    //console.log(headerListArray)
    // 「# 」や「## 」「### 」「#### 」「##### 」「###### 」のいずれかで始まるヘッダーをもつcontentのみを抽出する
    const filteredHeaders = blocksArray
      .filter(isValidHeader)
      .map((block) => ({
        content: block.content,
        uuid: block.uuid,
        properties: block.properties,
        children: block.children,
        headerLevel: `h${getHeaderLevel(block.content)}`
      })) as HeaderEntity[] || []
    //console.log(filteredHeaders)

    if (filteredHeaders
      && filteredHeaders.length > 0) // ページコンテンツにヘッダーがある場合
      createHeaderList(filteredHeaders, blocksArray, popupMain)
    else
      noHeadersFound(popupMain)
  } else
    noHeadersFound(popupMain)
}




const isValidHeader = (child: blockContentWithChildren): boolean => {
  const headerLevel = getHeaderLevel(child.content.split("\n")[0] || child.content)
  return headerLevel > 0 && headerLevel < 7
}


const createHeaderList = async (
  filteredHeaders: HeaderEntity[],
  headerListArray: { content: BlockEntity["content"]; uuid: BlockEntity["uuid"] }[],
  popupMain: HTMLElement
) => {
  const divContainer = document.createElement("div")

  for (const header of filteredHeaders) {
    const innerDiv = document.createElement("div")

    const headerCell = document.createElement(header.headerLevel) as HTMLElement
    if ((header.headerLevel === "h1" && logseq.settings!.hideH1 as boolean === true)
      || (header.headerLevel === "h2" && logseq.settings!.hideH2 as boolean === true)
      || (header.headerLevel === "h3" && logseq.settings!.hideH3 as boolean === true)
      || (header.headerLevel === "h4" && logseq.settings!.hideH4 as boolean === true)
      || (header.headerLevel === "h5" && logseq.settings!.hideH5 as boolean === true)
      || (header.headerLevel === "h6" && logseq.settings!.hideH6 as boolean === true))
      headerCell.style.display = "none"
    const content = await generateContent(header.content, header.properties)
    headerCell.textContent = removeMd(
      `${(content.includes("collapsed:: true")
        && content.substring(2, content.length - 16)) ||
        content.substring(2)}`.trim()
    )
    //headerCell.dataset.blockid = header.uuid
    if (currentBlockUuid !== ""
      && currentBlockUuid === header.uuid)
      innerDiv.style.backgroundColor = "var(--ls-secondary-background-color)" // ブロックズームで開いていて一致する場合は、背景色を変更
    headerCell.addEventListener("click", openPageForHeaderAsZoom(header.uuid))
    // マウスオーバーで一致するuuidブロックの・に丸を付ける
    let mouseOverFlag = false
    headerCell.addEventListener("mouseover", () => {
      if (mouseOverFlag) return
      mouseOverFlag = true
      // 丸を付ける
      const block = parent.document.getElementById("dot-" + header.uuid) as HTMLElement | null
      if (block)
        block.style.border = "3px double var(--lx-gray-09,var(--ls-border-color,var(--rx-gray-09)))"
      // ブロック全体に背景色をつける
      const blockElement = parent.document.querySelector(`div.ls-block[blockid="${header.uuid}"]`) as HTMLElement | null
      if (blockElement)
        blockElement.style.backgroundColor = "var(--ls-block-highlight-color,var(--rx-gray-04))"
    })
    headerCell.addEventListener("mouseout", () => {
      if (!mouseOverFlag) return
      mouseOverFlag = false
      const block = parent.document.getElementById("dot-" + header.uuid) as HTMLElement | null
      if (block)
        block.style.border = "unset"
      const blockElement = parent.document.querySelector(`div.ls-block[blockid="${header.uuid}"]`) as HTMLElement | null
      if (blockElement)
        blockElement.style.backgroundColor = "unset"
    })
    headerCell.className = "cursor"
    headerCell.title = header.headerLevel

    if (header.children
      && header.children.length > 0) {
      const children = (header.children as blockContentWithChildren[])
        .filter(isValidHeader)
        .map((child) => ({
          content: child.content,
          uuid: child.uuid, // ブロックのuuid TODO: オプション追加予定
          properties: child.properties,
          children: child.children,
          headerLevel: `h${getHeaderLevel(child.content)}`
        })) as HeaderEntity[] || []
      if (children.length > 0)
        createHeaderList(children, headerListArray, innerDiv)
    }
    innerDiv.appendChild(headerCell)
    divContainer.appendChild(innerDiv)
  }

  popupMain.appendChild(divContainer)
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
        const block = await logseq.Editor.getBlock(blockId, { includeChildren: false, }) as { content: BlockEntity["content"] } | null
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

const generateSelectForQuickAccess = (removePageName?: string) => {
  const selectPage = parent.document.getElementById(keyToolbarSelectPage) as HTMLElement | null
  if (selectPage) {
    selectPage.innerHTML = ""
    const select = document.createElement("select")
    // logseq.settings!.historyにあるページ名をセレクトボックスに追加
    const history = logseq.settings!.history as string[] || []
    // 先頭の空白オプション
    const option = document.createElement("option")
    option.value = ""
    // ページ選択の初期値 クイックアクセス
    option.textContent = t("Quick access")
    select.appendChild(option)
    for (const pageName of history) {
      if (removePageName
        && pageName === removePageName) continue // 現在のページ名は除外
      const option = document.createElement("option")
      option.value = pageName
      option.textContent = pageName
      select.appendChild(option)
    }
    select.addEventListener("change", async (ev) => {
      const pageName = (ev.target as HTMLSelectElement).value
      if (pageName === "") return
      const pageEntity = await logseq.Editor.getPage(pageName) as { uuid: PageEntity["uuid"]; name: PageEntity["name"], originalName: PageEntity["originalName"] } | null
      if (pageEntity) {
        logseq.App.pushState('page', { name: pageEntity.name })
        updateCurrentPage(
          pageEntity.name,
          pageEntity.originalName,
          pageEntity.uuid)
        setTimeout(() =>
          displayHeadersList()
          , 20)
      }
    })
    selectPage.appendChild(select)
  }
}


const clickRefreshButton = () => {
  const refreshButton = parent.document.getElementById(keyRefreshButton) as HTMLElement | null
  if (refreshButton)
    refreshButton.click()
}


export function openPageForHeaderAsZoom(uuid: BlockEntity["uuid"]): (this: HTMLElement, ev: MouseEvent) => any {

  return ({ shiftKey }) => {
    if (shiftKey === true)
      logseq.Editor.openInRightSidebar(uuid)
    else
      logseq.App.pushState('page', { name: uuid }) // ズームページを開く
    logseq.Editor.setBlockCollapsed(uuid, false)
  }
}



const generatePageButton = () => {
  const headerSpace = parent.document.getElementById(keyToolbarHeaderSpace) as HTMLElement | null
  if (headerSpace) {
    headerSpace.innerHTML = ""//リフレッシュ

    //currentPageOriginalNameに 「/」が含まれている場合は、分割する
    if (currentPageOriginalName.includes("/")) {
      //「Logseq/プラグイン/A」のような場合は、「Logseq」「プラグイン」「A」 それぞれにリンクを持たせる。ただし、リンクは「Logseq/プラグイン」のように親の階層を含める必要がある
      const pageNames = currentPageOriginalName.split("/")
      let parentPageName = ""
      for (const pageName of pageNames) {
        // ページを開くボタン
        const openButton = document.createElement("button")
        openButton.textContent = parentPageName === "" ?
          pageName
          : "/" + pageName
        parentPageName += parentPageName === "" ?
          pageName
          : `/${pageName}`
        const thisButtonPageName = parentPageName
        openButton.title = thisButtonPageName
        openButton.className = "button"
        openButton.style.whiteSpace = "nowrap"
        openButton.style.backgroundColor = "var(--ls-secondary-background-color)"
        openButton.addEventListener("click", async ({ shiftKey }) => {
          currentBlockUuid = "" //ブロックuuidをリセットする
          const pageEntity = await logseq.Editor.getPage(thisButtonPageName, { includeChildren: false }) as { uuid: PageEntity["uuid"], name: PageEntity["name"] } | null
          if (pageEntity) {
            if (shiftKey === true)
              logseq.Editor.openInRightSidebar(pageEntity.uuid)
            else
              logseq.App.pushState('page', { name: pageEntity.name })
          }
        })
        headerSpace.appendChild(openButton)
      }
      headerSpace.classList.add("flex")
      headerSpace.style.flexWrap = "nowrap"
      if (currentBlockUuid !== "") // ブロックズームで開いている場合は、戻るボタンを追加
        headerSpace.appendChild(createOpenButton(" 🔙 🔎",
          //ズーム・ブロックを解除する
          t("This zoom block will be lifted."),))
    } else
      if (currentBlockUuid !== "")
        headerSpace.appendChild(createOpenButton(currentPageOriginalName + " 🔙 🔎",
          t("This zoom block will be lifted.")))

  }
}


const createOpenButton = (buttonText: string, title: string) => {
  const openButton = document.createElement("button")
  openButton.title = title
  openButton.textContent = buttonText
  openButton.className = "button"
  openButton.style.whiteSpace = "nowrap"
  openButton.addEventListener("click", ({ shiftKey }) => {
    currentBlockUuid = "" //ブロックuuidをリセットする
    if (shiftKey === true)
      logseq.Editor.openInRightSidebar(currentPageUuid)
    else
      logseq.App.pushState('page', { name: currentPageOriginalName })
  })
  return openButton
}


logseq.ready(main).catch(console.error)
