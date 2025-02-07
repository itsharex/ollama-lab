import DOMPurify from "isomorphic-dompurify"
import { marked } from "marked"
import hljs from "highlight.js"
import { markedHighlight } from "marked-highlight"
import markedKatex from "marked-katex-extension"

marked.use(
  markedHighlight({
    emptyLangClass: "hljs",
    langPrefix: "hljs language-",
    highlight(code, lang, _info) {
      return hljs.highlight(code, {
        language: hljs.getLanguage(lang)?.name ?? "plaintext",
        ignoreIllegals: true,
      }).value
    },
  }),
  markedKatex({
    throwOnError: false,
  }),
)

const renderer = new marked.Renderer({
  silent: true,
  async: true,
  gfm: true,
})

renderer.code = ({ text, lang }) => {
  const codeClass = lang ? `hljs language-${lang}` : "hljs"

  return `
    <div class="codeblock">
      <div class="header">
        <span class="code-lang">${lang}</span>
        <div class="toolbar">
        </div>
      </div>
      <pre class="code-container"><code class="${codeClass}">${text}</code></pre>
    </div>
  `
}

export async function parseMarkdown(markdown: string): Promise<string> {
  return DOMPurify.sanitize(await marked.parse(markdown, { renderer }))
}
