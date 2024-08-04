import { BlockEntity } from "@logseq/libs/dist/LSPlugin.user"
import { t } from "logseq-l10n"
import removeMd from "remove-markdown"
import { currentBlockUuid, currentPageOriginalName, currentPageUuid, displayHeadersList, updateCurrentPage } from "."
import { removeListWords, removeMarkdownAliasLink, removeMarkdownImage, removeMarkdownLink, removeProperties, replaceOverCharacters } from "./markdown"
import { HeaderEntity, blockContentWithChildren, pageEntityShort } from './type'


export const generateContent = async (
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


export const createHeaderList = async (
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
      && currentBlockUuid === header.uuid) {
      innerDiv.style.backgroundColor = "var(--ls-secondary-background-color)" // ブロックズームで開いていて一致する場合は、背景色を変更

      // 🔎マークをつける
      const zoomIcon = document.createElement("span")
      zoomIcon.textContent = "🔎"
      zoomIcon.style.marginLeft = "0.2em"
      headerCell.appendChild(zoomIcon)
    }
    headerCell.addEventListener("click", openPageForHeaderAsZoom(header.uuid, header.content))
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


export const getHeaderLevel = (header: string): number => {
  // 「# 」や「## 」「### 」「#### 」「##### 」「###### 」のいずれかで始まる
  const match = header.match(/^(#{1,6})\s/) as RegExpMatchArray | null
  return match ? match[1].length : 0
}


export const noHeadersFound = (popupMain: HTMLElement) => {
  popupMain.appendChild(document.createElement("p")).textContent = t("No headers found.")
}


export const isValidHeader = (child: blockContentWithChildren): boolean => {
  const headerLevel = getHeaderLevel(child.content.split("\n")[0] || child.content)
  return headerLevel > 0 && headerLevel < 7
}


export const generateHeaderList = async (popupMain: HTMLElement) => {
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


export function openPageForHeaderAsZoom(uuid: BlockEntity["uuid"], content: BlockEntity["content"]): (ev: MouseEvent) => any {
  return async ({ shiftKey, ctrlKey }) => {
    if (shiftKey === true) {
      logseq.UI.showMsg("🔎 " + t("Opening in the right sidebar..."), "info", { timeout: 2200 })
      logseq.Editor.openInRightSidebar(uuid)
    }
    else if (ctrlKey === true) {
      //TODO: 選択されたブロックを、サブページに移動させる
      const msg = await logseq.UI.showMsg("🔎 " + t("Moving the selected block to a sub-page..."), "info", { timeout: 4000 })
      const newPageName = `${currentPageOriginalName}/${content}`
      // ここにconfirm実装




      //作成する場合
      const newSubPageEntity = await logseq.Editor.createPage(newPageName, currentPageUuid, { redirect: false, createFirstBlock: false }) as pageEntityShort | null
      if (newSubPageEntity) {
        logseq.Editor.moveBlock(uuid, newSubPageEntity.uuid)
        logseq.UI.closeMsg(msg)
        logseq.UI.showMsg("🔎 " + t("The selected block has been moved to a sub-page."), "success", { timeout: 4000 })
        setTimeout(async () => {
          logseq.App.pushState('page', { name: newSubPageEntity.name })
          await updateCurrentPage(
            newSubPageEntity.name,
            newSubPageEntity.originalName,
            newSubPageEntity.uuid
          )
          displayHeadersList()
        }, 1000)
      }

    } else {
      logseq.UI.showMsg("🔎 " + t("Zooming in on the block..."), "info", { timeout: 1000 })
      logseq.App.pushState('page', { name: uuid }) // ズームページを開く
    }
    logseq.Editor.setBlockCollapsed(uuid, false)
  }
}

