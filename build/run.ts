import * as path from 'path'
import { BuildPaths } from './paths'
import { Build } from './core'
import { Paths } from '../source/paths'
import { HomeRepository, ThingRepository } from './repositories/prismic'
import * as prismic from '@prismicio/client'

const registerPages: Build.BuildConfig['registerPages'] = async (registerPage) => {
  // fetch new data for pages
  await Promise.all([HomeRepository.update(), ThingRepository.update()])

  // retrieve data for pages from cache
  const home = HomeRepository.getOne()
  const things = ThingRepository.getAll()

  console.log(home)

  // register pages with data
  registerPage({
    template: path.resolve(BuildPaths.viewsDirectory, 'index.pchtml'),
    context: { content: { home, things }, prismic, Paths },
    outputPath: Paths.index,
  })

  things.map((thing) => {
    registerPage({
      template: path.resolve(BuildPaths.viewsDirectory, 'thing.pchtml'),
      context: { content: { thing }, prismic, Paths },
      outputPath: Paths.thing({ uid: thing.uid || thing.id }),
    })
  })

  registerPage({ template: path.resolve(BuildPaths.viewsDirectory, '404.pchtml'), context: {}, outputPath: '404.html' })
}

const build = async () => {
  // get arguments for node script
  const args = process.argv
  const watch = args.includes('--watch')

  await Build.run({
    watch,
    registerPages,
    publicDirectory: BuildPaths.publicDirectory,
    outputDirectory: BuildPaths.outputDirectory,
    partialsDirectory: BuildPaths.partialsDirectory,
  })
}

build()
