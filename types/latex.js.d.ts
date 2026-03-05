declare module 'latex.js' {
  export interface HtmlGenerator {
    document?: { documentElement?: { outerHTML?: string } }
    htmlDocument?: () => { documentElement?: { outerHTML?: string } }
  }
  export class HtmlGenerator {
    constructor(opts: { hyphenate: boolean })
  }
  export function parse(
    tex: string,
    opts: { generator: HtmlGenerator }
  ): void
}
