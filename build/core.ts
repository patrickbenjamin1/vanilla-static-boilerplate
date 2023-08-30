import * as Handlebars from 'handlebars'
import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import { Templater } from './template'

export namespace HTMLBuilder {
  let partials: { [key: string]: string } = {}

  export type CoreConfig = {
    watch?: boolean
    publicDirectory?: string
    partialsDirectory: string
    outputDirectory: string
    globalContext?: any
  }

  export type Page<T> = {
    template: string
    outputPath: string
    context?: T
  }

  export type BuildPage = <T>(page: Page<T>) => void

  export type BuildConfig = CoreConfig & {
    registerPages: (registerPage: <T>(page: Page<T>) => void) => Promise<void> | void
    onStartBuild?: () => Promise<void> | void
  }

  // build a partial and add it to Handlebars
  const registerPartial = (filename: string, config: CoreConfig) => {
    // read partial file to string
    const file = fs.readFileSync(path.resolve(config.partialsDirectory, filename)).toString()

    partials = { ...partials, [filename.split('.')[0]]: file }

    console.log(`registered partial ${filename}`)
  }

  // register all partials
  const registerPartials = (config: CoreConfig) => {
    // get partials
    const partialsFilenames = fs.readdirSync(config.partialsDirectory)

    partialsFilenames.forEach((filename) => {
      // ignore if not html
      const extension = filename.split('.')[1]

      if (extension !== 'pchtml') {
        return
      }

      // register
      registerPartial(filename, config)
    })

    console.log('built partials\n')
  }

  // build a view
  const buildPage = async <T>(page: Page<T>, config: CoreConfig) => {
    // read view file to string
    const file = fs.readFileSync(page.template)

    // generate file
    const outputFile = await Templater.run(file.toString(), { ...(page.context || {}), ...(config.globalContext || {}) }, partials)

    const directories = page.outputPath.split('/').slice(0, -1)

    // ensure directories exist if output not at root of dist
    if (directories.length) {
      directories.reduce((parentPath, directory) => {
        const fullPath = path.resolve(config.outputDirectory, parentPath, directory)

        if (!fs.existsSync(fullPath)) {
          fs.mkdirSync(fullPath)
        }

        return path.resolve(parentPath, directory)
      }, '')
    }

    // write file
    fs.writeFileSync(path.resolve(config.outputDirectory, page.outputPath), outputFile)

    // watch if param given
    if (config.watch) {
      // rebuild if page template changes or any partial changes (todo - store partials used and only update if they're used)
      chokidar.watch(page.template).on('change', () => buildPage(page, { ...config, watch: false }))
    }

    console.log(`built view ${page.outputPath}`)
  }

  // build a set of pages
  const buildPages = async (pages: Page<any>[], config: CoreConfig) => {
    for (const page of pages) {
      buildPage(page, config)
    }
  }

  // copy public directory
  const copyPublic = (config: CoreConfig) => {
    if (fs.existsSync(config.publicDirectory)) {
      // copy public directory to root of output
      fs.cpSync(config.publicDirectory, config.outputDirectory, { recursive: true })

      console.log('copied public\n')
    }
  }

  export const build = async (config: BuildConfig) => {
    console.log('on start build...')
    // run onStartBuild hook (use for registering handlebars helpers and such)
    await config.onStartBuild?.()

    // create directories
    if (!fs.existsSync(config.outputDirectory)) {
      console.log('creating output directory...')
      fs.mkdirSync(config.outputDirectory)
    }

    // run initial builds
    registerPartials(config)
    copyPublic(config)

    // register pages from given registerPages hook
    const pages: Page<any>[] = []
    await config.registerPages((page) => {
      console.log(`registered page at ${page.outputPath}`)
      pages.push(page)
    })

    // build registered pages
    await buildPages(pages, config)

    // set up watchers
    if (config.watch) {
      console.log('watching for changes...\n')

      // add watchers for partials - TODO on this: create dependency tree and only rebuild pages up that dependency tree from this filename
      chokidar.watch([path.resolve(config.partialsDirectory, '**/*.pchtml')]).on('all', (_, filePath) => {
        // get filename from path
        const filename = path.basename(filePath)

        // reregister partials
        registerPartial(filename, config)

        // rebuild pages on changes to partials
        buildPages(pages, { ...config, watch: false })
      })

      // copy from public directory
      chokidar.watch(config.publicDirectory).on('all', copyPublic)
    }
  }
}
