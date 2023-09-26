import * as path from 'path'
import { Paths } from './paths'
import { Build } from './core'

const stuff = [
  { name: 'thing', slug: 'thing' },
  { name: 'other thing', slug: 'other-thing' },
]

const registerPages: Build.BuildConfig['registerPages'] = async (registerPage) => {
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

const build = async () => {
  // get arguments for node script
  const args = process.argv
  const watch = args.includes('--watch')

  await Build.run({
    watch,
    registerPages,
    publicDirectory: Paths.publicDirectory,
    outputDirectory: Paths.outputDirectory,
    partialsDirectory: Paths.partialsDirectory,
  })
}

build()
