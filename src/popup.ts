import { PageEntity } from "@logseq/libs/dist/LSPlugin.user"
import { t } from "logseq-l10n"
import { currentBlockUuid, currentPageName, currentPageOriginalName, currentPageUuid, displayHeadersList, icon, keyRefreshButton, keySettingsButton, keyToggleH1, keyToggleH2, keyToggleH3, keyToggleH4, keyToggleH5, keyToggleH6, keyToggleStyleForHideBlock, keyToggleTableId, keyToolbarContent, keyToolbarHeaderSpace, keyToolbarHierarchy, keyToolbarPopup, keyToolbarSelectPage, pluginName, updateBlockUuid } from "."

export const removePopup = () => {
  parent.document.getElementById(logseq.baseInfo.id + "--" + keyToolbarPopup)?.remove()
}
export const openPopupFromToolbar = () => {

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
        <div id="${keyToolbarHierarchy}"></div>
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
    displayHeadersList() //ポップアップの本文を作成・リフレッシュ
  }, 50)
}

export const toggleHeaderVisibility = (headerName: string) => {
  for (const element of (parent.document.querySelectorAll(`#${keyToolbarContent} ${headerName}`) as NodeListOf<HTMLElement>))
    element.style.display = element.style.display === "none" ?
      "block"
      : "none"
}


export const clickRefreshButton = () => {
  const refreshButton = parent.document.getElementById(keyRefreshButton) as HTMLElement | null
  if (refreshButton)
    refreshButton.click()
}


export const generatePageButton = () => {
  // 時間差処理
  setTimeout(() => {
    const headerSpace = parent.document.getElementById(keyToolbarHeaderSpace) as HTMLElement | null
    if (headerSpace) {
      headerSpace.innerHTML = "" //リフレッシュ


      //currentPageOriginalNameに 「/」が含まれている場合は、分割する
      if (currentPageName.includes("/")) {
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
            updateBlockUuid("")//ブロックuuidをリセットする
            const pageEntity = await logseq.Editor.getPage(thisButtonPageName, { includeChildren: false }) as { uuid: PageEntity["uuid"] } | null
            if (pageEntity)
              if (shiftKey === true)
                logseq.Editor.openInRightSidebar(pageEntity.uuid)

              else
                // 目次の更新だけおこなう
                displayHeadersList(pageEntity.uuid)
          })
          headerSpace.appendChild(openButton)
        }
        headerSpace.classList.add("flex")
        headerSpace.style.flexWrap = "nowrap"
        if (currentBlockUuid !== "") // ブロックズームで開いている場合は、戻るボタンを追加
          headerSpace.appendChild(createOpenButton(" 🔙 🔎",
            //ズーム・ブロックを解除する
            t("This zoom block will be lifted.")))
      }
      else if (currentBlockUuid !== "")
        headerSpace.appendChild(createOpenButton(currentPageOriginalName + " 🔙 🔎",
          t("This zoom block will be lifted.")))
    }
  }, 10)
}
export const generateSelectForQuickAccess = (removePageName?: string) => {
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
      const pageEntity = await logseq.Editor.getPage(pageName, { includeChildren: false }) as { uuid: PageEntity["uuid"] } | null
      if (pageEntity)
        displayHeadersList(pageEntity.uuid)
    })
    selectPage.appendChild(select)
  }
}
export const createOpenButton = (buttonText: string, title: string) => {
  const openButton = document.createElement("button")
  openButton.title = title
  openButton.textContent = buttonText
  openButton.className = "button"
  openButton.style.whiteSpace = "nowrap"
  openButton.addEventListener("click", ({ shiftKey }) => {
    updateBlockUuid("")//ブロックuuidをリセットする
    if (shiftKey === true)
      logseq.Editor.openInRightSidebar(currentPageUuid)

    else
      logseq.App.pushState('page', { name: currentPageOriginalName })
  })
  return openButton
}

