import * as fs from 'fs'
import * as path from 'path'
import * as prettier from 'prettier'

export namespace Templater {
  export const getContextDefinitions = (context: {}) =>
    Object.keys(context)
      .map((name) => `const ${name} = ${JSON.stringify(context[name])};`)
      .join('')

  export const sanitiseHtmlInJs = (input: string, context: {}): string => {
    return `\`${processHtml(input, context)}\``
  }

  const sanitiseAllHtmlInJs = (input: string, context: {}) => {
    const htmlSections = getHtml(input)

    const evaluatedInput = htmlSections.reduce((output, html) => output.replace(html, sanitiseHtmlInJs(html, context)), input)

    return evaluatedInput
  }

  export const evaluateJsWithContext = (input: string, context: {}): string => {
    return eval(getContextDefinitions(context) + input)
  }

  export const getBracketContents = (input: string, openingBracket: string, closingBracket: string) => {
    let matching = false
    let depth = 0
    let output: string[] = []

    for (let index = 0; index < input.length; index++) {
      const char = input[index]

      if (depth === 0 && char === closingBracket) {
        matching = false
      }

      if (matching) {
        if (char === openingBracket) {
          depth += 1
        }
        if (char === closingBracket) {
          if (depth > 0) {
            depth -= 1
          }
        }

        output[output.length - 1] += char
      }

      if (char === openingBracket && depth === 0) {
        matching = true
        output.push('')
      }
    }

    return output
  }

  /** takes a string and returns an array of the parts that look like HTML */
  export const getHtml = (input: string, tagname?: string) => {
    let matching = false
    let depth = 0
    let output: string[] = []

    let openedTag = false
    let isClosingTag = false

    for (let index = 0; index < input.length; index++) {
      const char = input[index]

      let fromOpenBracket = input.slice(index + 1)

      if (char === '<' && (!tagname || fromOpenBracket.startsWith(tagname) || fromOpenBracket.startsWith(`/${tagname}`))) {
        openedTag = true
        matching = true

        if (depth === 0) {
          output.push('')
        }

        if (input[index + 1] === '/') {
          isClosingTag = true
        }
      }

      if (matching) {
        output[output.length - 1] += char

        if (char === '>') {
          openedTag = false

          if (isClosingTag) {
            depth -= 1
            isClosingTag = false
          } else if (input[index - 1] !== '/') {
            depth += 1
          }

          if (depth === 0) {
            matching = false
          }
        }
      }
    }

    return output
  }

  const getRootTagContents = (input: string) => input.match(/>(.*)</)[1]

  const getAttributeKeyValuePairs = (input: string) => input.match(/ (\w*=[^> ]*)/g)

  const getAttributeAsTypeOrString = (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  const getAttributes = (input: string) => {
    const attributes = getAttributeKeyValuePairs(input)

    return attributes.reduce((output, current) => {
      const parts = current.trim().split('=')

      console.log('')
      console.log(parts[0])
      console.log(parts[1])
      console.log(parts[1], getAttributeAsTypeOrString(parts[1]))
      console.log('')

      return {
        ...output,
        [parts[0]]: getAttributeAsTypeOrString(parts[1]),
      }
    }, {})
  }

  const arrayRemoveDuplicates = (array: string[]) => array.reduce((output, val) => (output.includes(val) ? output : [...output, val]), [])

  const processHtml = (input: string, context: {}) => {
    const brackets = arrayRemoveDuplicates(getBracketContents(input, '{', '}'))

    const fixedBrackets = brackets.reduce(
      (output, bracketContents) => output.replaceAll(`{${bracketContents}}`, `\${${sanitiseAllHtmlInJs(bracketContents, context)}}`),
      input
    )

    return fixedBrackets
  }

  const replacePartial = (input: string, name: string, partial: string, context: {}, partials: { [name: string]: string }) => {
    const partialHtmls = getHtml(input, `_${name}`)

    const evaluatedInput = partialHtmls.reduce((output, html) => {
      const contents = getRootTagContents(html)

      const attributes = getAttributes(html)

      console.log(attributes)

      const evaluatedPartial = runInner(partial, { ...context, ...attributes, contents }, partials)

      return output.replace(html, evaluatedPartial)
    }, input)

    return evaluatedInput
  }

  export function runInner(input: string, context: {}, partials: { [name: string]: string }): string {
    const processedHtml = processHtml(input, context)

    let evaluatedInput = evaluateJsWithContext(`\`${processedHtml}\``, context)

    Object.keys(partials).forEach((partial) => {
      evaluatedInput = replacePartial(evaluatedInput, partial, partials[partial], context, partials)
    })

    return evaluatedInput
  }

  export async function run(input: string, context: {}, partials: { [name: string]: string }): Promise<string> {
    const output = runInner(input, context, partials)

    const prettiedInput = await prettier.format(output, { parser: 'html' })

    return prettiedInput
  }

  export const test = async () => {
    const input = fs.readFileSync(path.resolve(__dirname, './test.pchtml'))

    const partial = fs.readFileSync(path.resolve(__dirname, './partial.pchtml'))

    const output = await run(input.toString(), { person: 'aa', stuff: ['a', 'b', 'c'], pish: false }, { partial: partial.toString() })

    console.log(output)
  }
}

Templater.test()
