import * as prettier from 'prettier'
import { createLogger } from './logger'

/**
 * HTML Templater
 *
 * Uses a templating language based on the syntax of JSX. Works by taking a string of html but supports injecting javascript by wrapping it in
 * braces (unless escaped with \) and the use of partials prefixed by underscores.
 *
 * Works under the hood by reformatting the input strings into js template strings using smart recursive traversal then evaluating the contents
 * of it with given context defined in frontmatter.
 *
 * i.e.
 *
 * const output = await Templater.run(
 *  "<div>{things.map(thing => <p>{thing}</p>).join('')} <_myPartial>hello</_myPartial></div>",
 *  { things: ['thing1', 'thing2'] },
 *  { myPartial: <p>{contents}</p> }
 * )
 *
 * above would return:
 *
 * <div>
 *    <p>thing1</p>
 *    <p>thing2</p>
 *    <p>hello</p>
 * </div>
 */

export namespace Templater {
  const logger = createLogger('Templater')

  /** get the frontmatter for the Template which defines the context as variables so they're accessible to the template string */
  const getFunctionTemplateWithContext = (toExec, context) => {
    return `
    return function (context) {
      Object.assign(globalThis, context)
      return ${toExec};
    }                                                                                                                   
    `
  }

  /** wrap html with backticks */
  const sanitiseHtmlInJs = (input: string, context: {}): string => {
    return `\`${prepareHtml(input, context)}\``
  }

  /** gets all html blocks and wraps them in backticks */
  const sanitiseAllHtmlInJs = (input: string, context: {}) => {
    const htmlSections = getHtml(input)

    const evaluatedInput = htmlSections.reduce((output, html) => output.replace(html, sanitiseHtmlInJs(html, context)), input)

    return evaluatedInput
  }

  /** evaluates a piece of javascript stored in a string with the given context object defined as variables and returns the output */
  const evaluateJsWithContext = (input: string, context: {}): string => {
    const result = Function(getFunctionTemplateWithContext(input, context))
    const output = result()
    return output(context)
  }

  /** traverses through a given string and returns an array of strings representing the contents of each root set of braces */
  const getBraces = (input: string, openingBracket: string, closingBracket: string) => {
    /**
     * traverses through a string using a for loop, keeps track of a depth which steps up as the traversal encounters an opening
     * brace, and steps down when it encounters a closing brace and returns the entire thing when the depth returns to 0
     */

    // is currently inside some braces
    let matching = false

    // used to keep track of brace depth
    let depth = 0

    // output array
    const output: string[] = []

    for (let index = 0; index < input.length; index++) {
      const char = input[index]

      // ignore if previous charagter is \
      const lastChar = index !== 0 ? input[index - 1] : undefined
      const escaped = lastChar === '\\'

      // if bracket is closed and depth is 0, return contents
      if (depth === 0 && char === closingBracket && !escaped) {
        matching = false
      }

      if (matching) {
        // add character to output string
        output[output.length - 1] += char

        // increase depth if bracket opens
        if (char === openingBracket && !escaped) {
          depth += 1
        }

        // decrease depth if bracket opens
        if (char === closingBracket && !escaped) {
          if (depth > 0) {
            depth -= 1
          }
        }
      }

      if (char === openingBracket && !matching && !escaped) {
        // if opening bracket, start matching and add new string to output array
        matching = true
        output.push('')
      }
    }

    return output
  }

  /** traverses through a given string and returns an array of strings representing any root level valid HTML */
  const getHtml = (
    input: string,
    /** only get HTML if the root tag is of a given tag name */
    tagname?: string
  ) => {
    /**
     * traverses through a string using a for loop, keeps track of a depth which steps up as the traversal encounters a complete opening
     * HTML tag, and steps down when it encounters a complete closing tag and returns the entire thing when the depth returns to 0
     *
     * todo - better handling for error states (i.e. unclosed tags)
     */

    // is currently inside some braces
    let matching = false

    // used to keep track of brace depth
    let depth = 0

    // output array
    const output: string[] = []

    // keep track of if inside a tag
    let openedTag = false
    // keep track of if inside a closing tag
    let isClosingTag = false

    for (let index = 0; index < input.length; index++) {
      const char = input[index]

      // ignore if previous charagter is \
      const lastChar = index !== 0 ? input[index - 1] : undefined
      const escaped = lastChar === '\\'

      if (char === '<' && !escaped) {
        // value of the string from this opening bracket - todo use a regex for this so we're not storing almost the entire string again in memory
        let fromOpenBracket = input.slice(index + 1)

        if (!tagname || fromOpenBracket.startsWith(tagname) || fromOpenBracket.startsWith(`/${tagname}`)) {
          openedTag = true
          matching = true

          // if at root, start a new string in output
          if (depth === 0) {
            output.push('')
          }

          // detect if is a closing tag
          if (input[index + 1] === '/') {
            isClosingTag = true
          }
        }
      }

      if (matching) {
        // add character to output string
        output[output.length - 1] += char

        // is the end of a tag
        if (char === '>' && !escaped) {
          openedTag = false

          // if the tag is a closing tag, reduce depth
          if (isClosingTag) {
            depth -= 1
            isClosingTag = false
            // if the tag is an opening tag, increase depth
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

  /** get the contents of an HTML tag with a regex */
  const getRootTagContents = (input: string) => input.match(/>(.*)</)?.[1]

  /** return an array of html attributes from within an opening tag as strings formatted [name]=[value] */
  const getAttributeKeyValuePairs = (input: string) => input.match(/ (\w*="[^>"]*")/g)

  /** attempt to prase an html attribute */
  const getAttributeAsTypeOrString = (value: string) => {
    try {
      return JSON.parse(value)
    } catch {
      return value
    }
  }

  /** get attributes from a tag */
  const getAttributes = (input: string) => {
    const attributes = getAttributeKeyValuePairs(input)

    if (!attributes) {
      return {}
    }

    return attributes.reduce((output, current) => {
      const parts = current.trim().split('=')

      return {
        ...output,
        [parts[0]]: getAttributeAsTypeOrString(parts[1]),
      }
    }, {})
  }

  /** remove duplicate values in an array of strings */
  const arrayRemoveDuplicates = (array: string[]) => array.reduce<string[]>((output, val) => (output.includes(val) ? output : [...output, val]), [])

  /** takes an HTML string and replaces any root level braces with evaluatable template string injections */
  const prepareHtml = (input: string, context: {}) => {
    const brackets = arrayRemoveDuplicates(getBraces(input, '{', '}'))

    // replace {} with ${} to prepare for evaluations
    const fixedBrackets = brackets.reduce(
      (output, bracketContents) => output.replaceAll(`{${bracketContents}}`, `\${${sanitiseAllHtmlInJs(bracketContents, context)}}`),
      input
    )

    return fixedBrackets
  }

  /** take a partial, finds every instance of it, and replaces it with the contents of that partial */
  const replacePartial = (input: string, name: string, partial: string, context: {}, partials: { [name: string]: string }) => {
    logger.verbose(`Replacing partial ${name}...`)

    // get all instances of given partial
    const partialHtmls = getHtml(input, `_${name}`)

    logger.verbose(`Found ${partialHtmls.length} ${name}s`)

    const evaluatedInput = partialHtmls.reduce((output, html) => {
      // get contents of partial tag
      const contents = getRootTagContents(html)

      // get attributes from partial tag
      const attributes = getAttributes(html)

      // evaluate partial with outer context and attributes
      const evaluatedPartial = processHtml(partial, { ...context, ...attributes, contents }, partials)

      // replace in input
      return output.replace(html, evaluatedPartial)
    }, input)

    return evaluatedInput
  }

  /** process HTML and evaluate all js parts and partials */
  function processHtml(input: string, context: {}, partials: { [name: string]: string }): string {
    try {
      const preparedHtml = prepareHtml(input, context)

      // evaluate html content as js template string
      let evaluatedInput = evaluateJsWithContext(`\`${preparedHtml}\``, context)

      Object.keys(partials).forEach((partial) => {
        evaluatedInput = replacePartial(evaluatedInput, partial, partials[partial], context, partials)
      })

      return evaluatedInput
    } catch {
      logger.error('failed to process HTML')

      return ''
    }
  }

  export async function run(input: string, context: {}, partials: { [name: string]: string }): Promise<string> {
    logger.verbose('Start')

    const output = processHtml(input, context, partials)

    // const prettiedInput = await prettier.format(output, { parser: 'html' })
    const prettiedInput = output

    logger.verbose('Complete')

    return prettiedInput
  }
}
