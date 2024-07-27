import { BlockUUID } from "@logseq/libs/dist/LSPlugin.user"

export const removeProvideStyle = (className: string) => {
    const doc = parent.document.head.querySelector(
        `style[data-injected-style^="${className}"]`
    ) as HTMLStyleElement | null
    if (doc) doc.remove()
}
