import * as Handlebars from 'handlebars'

export namespace Helpers {
  const concat = (...args: string[]) => args.slice(0, -1).join('')

  export const register = () => {
    Handlebars.registerHelper('concat', (...args) => concat(...(args as any)))
  }
}
