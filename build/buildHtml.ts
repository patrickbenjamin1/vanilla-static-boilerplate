import { HTMLBuilder } from './core'
import * as path from 'path'
import { Paths } from './paths'
import { Helpers } from './helpers'

const stuff = [
  { name: 'thing', slug: 'thing' },
  { name: 'other thing', slug: 'other-thing' },
]

const registerPages: HTMLBuilder.BuildConfig['registerPages'] = async (registerPage) => {
  registerPage({ template: path.resolve(Paths.viewsDirectory, 'index.pchtml'), context: { stuff }, outputPath: 'index.html' })

  registerPage({
    template: path.resolve(Paths.viewsDirectory, 'page2.pchtml'),
    context: { content: 'This content was templated' },
    outputPath: '2.html',
  })

  stuff.forEach((thing) => {
    registerPage({
      template: path.resolve(Paths.viewsDirectory, 'thing.pchtml'),
      context: { name: thing.name },
      outputPath: `thing/${thing.slug}.html`,
    })
  })

  registerPage({ template: path.resolve(Paths.viewsDirectory, '404.pchtml'), context: {}, outputPath: '404.html' })
}

const build = () => {
  // process arguments
  const args = process.argv
  const watch = args.includes('--watch')

  HTMLBuilder.build({
    watch,
    registerPages,
    onStartBuild: () => Helpers.register(),
    publicDirectory: Paths.publicDirectory,
    outputDirectory: Paths.outputDirectory,
    partialsDirectory: Paths.partialsDirectory,
  })
}

build()
