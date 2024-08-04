import { BlockEntity, PageEntity } from "@logseq/libs/dist/LSPlugin.user"


export type blockContentWithChildren = {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
  properties: BlockEntity["properties"]
  children: BlockEntity["children"]
}


export type HeaderEntity = {
  content: BlockEntity["content"]
  uuid: BlockEntity["uuid"]
  properties: BlockEntity["properties"]
  children: BlockEntity["children"]
  headerLevel: string // h1, h2, h3, h4, h5, h6
}


export interface pageEntityShort {
  uuid: PageEntity["uuid"]
  name: PageEntity["name"]
  originalName: PageEntity["originalName"]
}


export type queryItemShort = Array<{
  "original-name": string
  uuid: string
}>

