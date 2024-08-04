import { currentPageName, currentPageOriginalName } from "."
import { queryItemShort } from "./type"


export const removeProvideStyle = (className: string) => {
  const doc = parent.document.head.querySelector(
    `style[data-injected-style^="${className}"]`
  ) as HTMLStyleElement | null
  if (doc) doc.remove()
}
export const getPageHierarchyOrNameRelatedFromQuery = async (pageName: string): Promise<queryItemShort> => {

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
  // クエリーでは、ページ名を小文字にする必要がある (ここでは、originalNameではなく、nameを使う)
  let result = (await logseq.DB.datascriptQuery(query, `"${pageName.toLowerCase()}"`) as any | null)?.flat() as {
    "original-name": string
    "uuid": string
  }[] | null
  if (!result) {
    logseq.UI.showMsg("Cannot get the page name", "error")
    return []
  }

  //resultの中に、nullが含まれている場合があるので、nullを除外する
  result = result.filter((item) => item !== null && item['original-name'] !== currentPageOriginalName)

  //ページ名の先頭に「${currentPageOriginalName}/」もしくは「${currentPageName}/}」が含まれる場合はその部分を削除する
  result = result.map((item) => {
    item['original-name-before'] = item['original-name']
    item['original-name'] = item['original-name']
      .replace(new RegExp(`^${currentPageOriginalName}/`), "")
      .replace(new RegExp(`^${currentPageName}/`), "")
    // 改変される前のページ名を保存する
    return item
  })


  if (result.length === 0) return []


  // ページ名を、名称順に並び替える
  // result = result.sort((a, b) => {
  //   return a["original-name"] > b["original-name"] ? 1 : -1
  // })
  return result
}
