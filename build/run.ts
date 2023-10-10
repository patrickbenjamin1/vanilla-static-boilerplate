import * as path from 'path'
import { BuildPaths } from './paths'
import { Build } from './core'
import { Paths } from '../source/paths'
import { HomeRepository, ThingRepository } from './repositories/prismic'
import * as prismic from '@prismicio/client'

const registerPages: Build.BuildConfig['registerPages'] = async (registerPage) => {
  // retrieve data for pages from cache
  const home = HomeRepository.getOne()
  const things = ThingRepository.getAll()

  // register pages with data

  registerPage({
    template: path.resolve(BuildPaths.viewsDirectory, 'index.pchtml'),
    templateContext: { content: { home, things } },
    outputPath: Paths.index,
  })

  things.map((thing) => {
    registerPage({
      template: path.resolve(BuildPaths.viewsDirectory, 'thing.pchtml'),
      templateContext: { content: { thing } },
      outputPath: Paths.thing({ uid: thing.uid || thing.id }),
    })
  })

  registerPage({ template: path.resolve(BuildPaths.viewsDirectory, '404.pchtml'), templateContext: {}, outputPath: '404.html' })
}

const onStartBuild: Build.BuildConfig['onStartBuild'] = async () => {
  // fetch new data for pages
  await Promise.all([HomeRepository.update(), ThingRepository.update()])
}

const build = async () => {
  // get arguments for node script
  const args = process.argv
  const watch = args.includes('--watch')

  await Build.run({
    onStartBuild,
    watch,
    registerPages,
    publicDirectory: BuildPaths.publicDirectory,
    outputDirectory: BuildPaths.outputDirectory,
    partialsDirectory: BuildPaths.partialsDirectory,
    globalTemplateContext: { prismic, Paths },
  })
}

build()
