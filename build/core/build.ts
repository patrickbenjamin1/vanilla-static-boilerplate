import * as path from 'path'
import * as fs from 'fs'
import * as chokidar from 'chokidar'
import { Templater } from './templater'
import { createLogger } from './logger'

export namespace Build {
  const logger = createLogger('Build')

  let partials: { [key: string]: string } = {}

  export type CoreConfig = {
    watch?: boolean
    publicDirectory?: string
    partialsDirectory: string
    outputDirectory: string
    globalTemplateContext?: any
  }

  export type Page<T> = {
    template: string
    outputPath: string
    templateContext?: T
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

    logger.info(`registered partial ${filename}`)
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

    logger.info('built partials\n')
  }

  const getOutputPath = (outputPath: string) => {
    if (outputPath.endsWith('.html')) {
      return outputPath
    } else {
      return path.resolve(outputPath, 'index.html')
    }
  }

  const ensureDirectoryExists = (outputPath: string, { outputDirectory }: CoreConfig) => {
    const directories = outputPath.endsWith('.html') ? outputPath.split('/').slice(0, -1) : outputPath.split('/')

    // ensure directories exist if output not at root of dist
    if (directories.length) {
      directories.reduce((parentPath, directory) => {
        if (directory) {
          const fullPath = path.join(outputDirectory, parentPath, directory)

          if (!fs.existsSync(fullPath)) {
            fs.mkdirSync(fullPath)
          }
        }

        return path.join(parentPath, directory)
      }, '')
    }
  }

  // build a view
  const buildPage = async <T>(page: Page<T>, config: CoreConfig) => {
    // read view file to string
    const file = fs.readFileSync(page.template)

    // generate file
    const outputFile = await Templater.run(file.toString(), { ...(page.templateContext || {}), ...(config.globalTemplateContext || {}) }, partials)

    ensureDirectoryExists(page.outputPath, config)

    // write file
    console.log(path.join(config.outputDirectory, getOutputPath(page.outputPath)))
    fs.writeFileSync(path.join(config.outputDirectory, getOutputPath(page.outputPath)), outputFile)

    // watch if param given
    if (config.watch) {
      // rebuild if page template changes or any partial changes (todo - store partials used and only update if they're used)
      chokidar.watch(page.template).on('change', () => buildPage(page, { ...config, watch: false }))
    }

    logger.info(`built view ${page.outputPath}`)
  }

  // build a set of pages
  const buildPages = async (pages: Page<any>[], config: CoreConfig) => {
    for (const page of pages) {
      await buildPage(page, config)
    }
  }

  // copy public directory
  const copyPublic = (config: CoreConfig) => {
    if (config.publicDirectory && fs.existsSync(config.publicDirectory)) {
      // copy public directory to root of output
      fs.cpSync(config.publicDirectory, config.outputDirectory, { recursive: true })

      logger.info('copied public\n')
    }
  }

  export const run = async (config: BuildConfig) => {
    if (config.onStartBuild) {
      logger.info('on start build...')
      // run onStartBuild hook (use for registering handlebars helpers and such)
      await config.onStartBuild?.()
    }

    // create directories
    if (!fs.existsSync(config.outputDirectory)) {
      logger.info('creating output directory...')
      fs.mkdirSync(config.outputDirectory)
    }

    registerPartials(config)
    copyPublic(config)

    // register pages from given registerPages hook
    const pages: Page<any>[] = []
    await config.registerPages((page) => {
      logger.info(`registered page at ${page.outputPath}`)
      pages.push(page)
    })

    // build registered pages
    await buildPages(pages, config)

    logger.info('complete...\n')

    // set up watchers
    if (config.watch) {
      logger.info('watching for changes...\n')

      // add watchers for partials - TODO on this: create dependency tree and only rebuild pages up that dependency tree from this filename
      chokidar.watch([path.resolve(config.partialsDirectory, '**/*.pchtml')]).on('all', (_, filePath) => {
        // get filename from path
        const filename = path.basename(filePath)

        // reregister partials
        registerPartial(filename, config)

        // rebuild pages on changes to partials
        buildPages(pages, { ...config, watch: false })
      })

      if (config.publicDirectory) {
        // copy from public directory
        chokidar.watch(config.publicDirectory).on('all', copyPublic)
      }
    }
  }
}
