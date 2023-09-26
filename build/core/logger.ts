export const createLogger = (name: string) => {
  // todo - proper logger leveling
  const args = process.argv
  const showVerbose = args.includes('--verbose')

  const colours = {
    Bright: '\x1b[1m',
    Dim: '\x1b[2m',
    Underscore: '\x1b[4m',
    Blink: '\x1b[5m',
    Reverse: '\x1b[7m',
    Hidden: '\x1b[8m',
    FgBlack: '\x1b[30m',
    FgRed: '\x1b[31m',
    FgGreen: '\x1b[32m',
    FgYellow: '\x1b[33m',
    FgBlue: '\x1b[34m',
    FgMagenta: '\x1b[35m',
    FgCyan: '\x1b[36m',
    FgWhite: '\x1b[37m',
    FgGray: '\x1b[90m',
    BgBlack: '\x1b[40m',
    BgRed: '\x1b[41m',
    BgGreen: '\x1b[42m',
    BgYellow: '\x1b[43m',
    BgBlue: '\x1b[44m',
    BgMagenta: '\x1b[45m',
    BgCyan: '\x1b[46m',
    BgWhite: '\x1b[47m',
    BgGray: '\x1b[100m',
  } as const

  type Colour = keyof typeof colours

  const colourise = (colour: Colour, content: string) => `${colours[colour]}${content}\x1b[0m`

  const log = (prefix: string, text: string, colour: Colour) =>
    console.log(`${colourise('Dim', name.padEnd(10))} ${colourise(colour, prefix.padEnd(7).toUpperCase())} ${text}`)

  const success = (text: string) => log('success', text, 'FgGreen')
  const info = (text: string) => log('info', text, 'FgBlue')
  const warn = (text: string) => log('warn', text, 'FgYellow')
  const error = (text: string) => log('error', text, 'FgRed')
  const verbose = (text: string) => showVerbose && log('verbose', text, 'FgCyan')

  return { info, warn, error, verbose, success }
}
