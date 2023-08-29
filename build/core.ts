import * as Handlebars from 'handlebars'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import { Paths } from './paths'
import { Helpers } from './helpers'

export namespace HTMLBuilder {
  export type CoreConfig = {
    watch?: boolean
  }

  export type Page<T> = {
    template: string
    outputPath: string
    context?: T
  }

  export type BuildPage = <T>(page: Page<T>) => void

  export type BuildConfig = CoreConfig & {
    registerPages: (registerPage: <T>(page: Page<T>) => void) => Promise<void>
  }

  // create directories
  if (!fs.existsSync(Paths.outputDirectory)) {
    fs.mkdirSync(Paths.outputDirectory)
  }

  // build a partial and add it to Handlebars
  const registerPartial = (filename: string) => {
    // read partial file to string
    const file = fs.readFileSync(path.resolve(Paths.partialsDirectory, filename))

    // register partial
    Handlebars.registerPartial(filename, file.toString())

    console.log(`registered partial ${filename}`)
  }

  // register all partials
  const registerPartials = () => {
    // get partials
    const partialsFilenames = fs.readdirSync(Paths.partialsDirectory)

    partialsFilenames.forEach((filename) => {
      // ignore if not html
      const extension = filename.split('.')[1]

      if (extension !== 'html' && extension !== 'hbs') {
        return
      }

      // register
      registerPartial(filename)
    })

    console.log('built partials\n')
  }

  // build a view
  const buildPage = <T>(page: Page<T>, config: CoreConfig) => {
    // read view file to string
    const file = fs.readFileSync(page.template)

    // compile handlebar template
    const template = Handlebars.compile(file.toString())

    // generate file
    const outputFile = template(page.context)

    const directories = page.outputPath.split('/').slice(0, -1)

    // ensure directories exist if output not at root of dist
    if (directories.length) {
      directories.reduce((parentPath, directory) => {
        const fullPath = path.resolve(Paths.outputDirectory, parentPath, directory)

        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath)
        }

        return path.resolve(parentPath, directory)
      }, '')
    }

    // write file
    fs.writeFileSync(path.resolve(Paths.outputDirectory, page.outputPath), outputFile)

    // watch if param given
    if (config.watch) {
      // rebuild if page template changes or any partial changes (todo - store partials used and only update if they're used)
      chokidar.watch(page.template).on('change', () => buildPage(page, config))
    }

    console.log(`built view ${page.outputPath}`)
  }

  const buildPages = (pages: Page<any>[], config: CoreConfig) => {
    pages.forEach((page) => {
      buildPage(page, config)
    })
  }

  // copy public directory
  const copyPublic = () => {
    if (fs.existsSync(Paths.publicDirectory)) {
      // copy public directory to root of output
      fs.cpSync(Paths.publicDirectory, Paths.outputDirectory, { recursive: true })

      console.log('copied public\n')
    }
  }

  export const build = async ({ registerPages, watch }: BuildConfig) => {
    Helpers.register()

    // run initial builds
    registerPartials()
    copyPublic()

    const pages: Page<any>[] = []
    await registerPages((page) => pages.push(page))

    buildPages(pages, { watch })

    // set up watchers
    if (watch) {
      console.log('watching for changes...\n')

      // add watchers for partials
      chokidar.watch([path.resolve(Paths.partialsDirectory, '**/*.html'), path.resolve(Paths.partialsDirectory, '**/*.hbs')]).on('all', () => {
        registerPartials()
        buildPages(pages, { watch: false })
      })

      // copy from public directory
      chokidar.watch(Paths.publicDirectory).on('all', copyPublic)
    }
  }
}
