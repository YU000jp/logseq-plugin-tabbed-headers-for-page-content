import { currentPageName, currentPageOriginalName, displayHeadersList, keyToolbarHierarchy, updateBlockUuid } from "."
import { queryItemShort } from "./type"

export const generateHierarchyList = () => {

  if (logseq.settings!.tocShowSubPage as boolean === true)
    setTimeout(() => {
      //階層構造を表示
      const hierarchy = parent.document.getElementById(keyToolbarHierarchy) as HTMLElement | null
      if (hierarchy) {
        hierarchy.innerHTML = "" //リフレッシュ
        createHierarchyList(hierarchy)
      }
    }, 10)
}
const createHierarchyList = async (hierarchyElement: HTMLElement) => {
  if (currentPageName === "") return

  const getArrayFromQuery = await getPageHierarchyFromQuery(currentPageName) as queryItemShort
  if (getArrayFromQuery.length === 0) return

  //console.log(getArrayFromQuery)
  // リストに反映
  for (const item of getArrayFromQuery) {
    const openButton = document.createElement("button")
    openButton.textContent = item["original-name"]
    openButton.title = item["original-name"]
    openButton.className = "button"
    openButton.style.whiteSpace = "nowrap"
    openButton.addEventListener("click", async ({ shiftKey }) => {
      updateBlockUuid("")//ブロックuuidをリセットする
      if (shiftKey === true)
        logseq.Editor.openInRightSidebar(item.uuid)

      else
        // 目次の更新だけおこなう
        displayHeadersList(item.uuid)
    })
    hierarchyElement.appendChild(openButton)
  }
}
const getPageHierarchyFromQuery = async (pageName: string): Promise<queryItemShort> => {
  const queryPageName = pageName.toLowerCase() // クエリーでは、ページ名を小文字にする必要がある

  //同じ名前をもつページ名を取得するクエリー
  const query = `
      [:find (pull ?p [:block/original-name,:block/uuid])
              :in $ ?pattern
              :where
              [?p :block/name ?c]
              [(re-pattern ?pattern) ?q]
              [(re-find ?q ?c)]
      ]
      `
  let result = (await logseq.DB.datascriptQuery(query, `"${queryPageName}"`) as any | null)?.flat() as {
    "original-name": string
    "uuid": string
  }[] | null
  if (!result) {
    logseq.UI.showMsg("Cannot get the page name", "error")
    return []
  }

  //resultの中に、nullが含まれている場合があるので、nullを除外する
  result = result.filter((item) => item !== null && item['original-name'] !== currentPageOriginalName)


  if (result.length === 0) return []


  // ページ名を、名称順に並び替える
  result = result.sort((a, b) => {
    return a["original-name"] > b["original-name"] ? 1 : -1
  })
  return result
}
