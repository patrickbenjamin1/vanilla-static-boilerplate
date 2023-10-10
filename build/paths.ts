import * as path from 'path'

export namespace BuildPaths {
  // define directories
  export const rootDirectory = path.resolve(__dirname, '..')
  export const sourceDirectory = path.resolve(rootDirectory, 'source')
  export const viewsDirectory = path.resolve(sourceDirectory, 'views')
  export const partialsDirectory = path.resolve(sourceDirectory, 'partials')
  export const publicDirectory = path.resolve(sourceDirectory, 'public')
  export const outputDirectory = path.resolve(rootDirectory, 'dist')
  export const cacheDirectory = path.resolve(rootDirectory, 'cache')
}
