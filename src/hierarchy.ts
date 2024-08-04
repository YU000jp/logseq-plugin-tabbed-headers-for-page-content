import { t } from "logseq-l10n"
import { currentPageName, currentPageOriginalName, currentPageUuid, displayHeadersList, keyToolbarHierarchy, updateBlockUuid } from "."
import { getPageHierarchyOrNameRelatedFromQuery } from "./lib"
import { queryItemShort } from "./type"
import { PageEntity } from "@logseq/libs/dist/LSPlugin.user"
import { access } from "fs"

const keyCssClassHierarchyGroup = "tws--hierarchy-group"
const keyCssClassHierarchyItem = "tws--hierarchy-item"


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

  const getArrayFromQuery = await getPageHierarchyOrNameRelatedFromQuery(currentPageName) as queryItemShort

  //ページ名に階層が含まれている場合、その最後の階層をもとにクエリーを取得する
  if (currentPageName.includes("/")
    && logseq.settings!.queryLastHierarchy as boolean === true) {
    const currentPageHierarchy = currentPageName.split("/")
    const lastHierarchy = currentPageHierarchy[currentPageHierarchy.length - 1] //最後の階層を取得
    if (lastHierarchy !== currentPageName) {
      const getArrayFromQueryLastHierarchy = await getPageHierarchyOrNameRelatedFromQuery(lastHierarchy) as queryItemShort
      if (getArrayFromQueryLastHierarchy.length > 0)
        getArrayFromQuery.push(...getArrayFromQueryLastHierarchy)
    }
  }
  if (getArrayFromQuery.length === 0) return

  //console.log(getArrayFromQuery)

  // logseq/ページ名/サブページ名 のような何段階かの階層構造になっているので、グループ化して表示する
  const group = getArrayFromQuery.reduce((acc, item) => {
    const key = item["original-name"].includes("/") ?
      item["original-name"].split("/")[0]
      : "No group"
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as { [key: string]: queryItemShort })



  // グループ分類後に、アイテムが2つ未満のグループは、No groupにまとめる
  for (const key in group)
    if (group[key].length < 2) {
      if (!group["No group"])
        group["No group"] = []
      group["No group"].push(group[key][0])
      delete group[key]
    }

  // No groupのうち、それ以外の各グループ名と同じものを取り除く
  if (group["No group"])
    for (const key in group)
      if (key !== "No group")
        group["No group"] = group["No group"]
          .filter(item => !item["original-name"].match(new RegExp(`^${key}`)))


  // グループ内のアイテムを並び替える
  for (const key in group)
    group[key].sort((a, b) => {
      // 並び替えの条件を指定する
      // ここではアイテムの名前で昇順に並び替える例を示しています
      const nameA = a["original-name"].toLowerCase()
      const nameB = b["original-name"].toLowerCase()
      if (nameA < nameB) return -1
      if (nameA > nameB) return 1
      return 0
    })


  //console.log(group)


  // グループごとに表示
  for (const key of Object.keys(group)) {

    const groupElement = document.createElement("details") as HTMLDetailsElement
    groupElement.className = keyCssClassHierarchyGroup

    if (key === "No group")
      groupElement.open = true

    const beforeName = key === "No group" ? currentPageOriginalName : `${currentPageOriginalName}/${key}`
    const summaryElement = document.createElement("summary")
    const button = document.createElement("button")
    button.className = "button"
    button.textContent = beforeName
    button.title = key === "No group" ? "(" + t("No group") + ")\n" + currentPageOriginalName : beforeName
    button.addEventListener("click", async ({ shiftKey, ctrlKey }) => {
      if (key === "No group")
        beforeName === currentPageOriginalName
      // ${currentPageName}/${key} に移動する
      const pageEntity = await logseq.Editor.getPage(beforeName, { includeChildren: false }) as { uuid: PageEntity["uuid"], originalName: PageEntity["originalName"] } | null
      if (pageEntity)
        accessItem({ shiftKey, ctrlKey }, pageEntity)
    })
    summaryElement.appendChild(button)
    groupElement.appendChild(summaryElement)

    hierarchyElement.appendChild(groupElement)

    for (const item of group[key]) {
      // グループ名と一致する部分を取り除く
      item["original-name"] = item["original-name"]
        .includes("/") ?
        item["original-name"]
          .replace(new RegExp(`^${key}/`), "")
        : item["original-name"]
      hierarchyItem(item, groupElement)
    }
  }
}


const hierarchyItem = (item: { "original-name": string; uuid: string }, groupElement: HTMLElement) => {
  const openButton = document.createElement("button")
  openButton.textContent = item["original-name"]
  openButton.title = item["original-name-before"] ?
    item["original-name-before"]
    : item["original-name"]
  openButton.className = "button " + keyCssClassHierarchyItem
  openButton.style.whiteSpace = "nowrap"
  openButton.addEventListener("click", async ({ shiftKey, ctrlKey }) => accessItem({ shiftKey, ctrlKey }, { uuid: item.uuid, originalName: item["original-name"] }))
  groupElement.appendChild(openButton)
}


const accessItem = (key: { shiftKey: boolean, ctrlKey: boolean }, pageEntity: { uuid: PageEntity["uuid"], originalName: PageEntity["originalName"] }) => {
  updateBlockUuid() //ブロックuuidをリセットする
  if (key.shiftKey === true)
    logseq.Editor.openInRightSidebar(pageEntity.uuid)
  else
    if (key.ctrlKey === true)
      logseq.App.pushState('page', { name: pageEntity.originalName })
    else
      // 目次の更新だけおこなう
      displayHeadersList(pageEntity.uuid)
}
