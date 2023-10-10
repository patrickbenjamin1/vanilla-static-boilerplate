import { Repository } from '../core'
import * as prismic from '@prismicio/client'
import { BuildPaths } from '../paths'

const client = prismic.createClient('vanilla-boilerplate')

interface ICreatePrismicRepositoryConfig {
  documentTypeName: string
  client: prismic.Client
}

const createPrismicRepository = (config: ICreatePrismicRepositoryConfig) =>
  Repository.create({
    documentTypeName: config.documentTypeName,
    getNew: async (lastUpdated) => {
      const result = await config.client.getAllByType(config.documentTypeName, {
        filters: lastUpdated && [prismic.filter.dateAfter('document.last_publication_date', new Date(lastUpdated))],
      })

      return result.map((document) => ({
        identifier: document.uid || document.id,
        ...document,
      }))
    },
    getPublishedIdentifiers: async () => {
      const result = await config.client.getAllByType(config.documentTypeName, {
        graphQuery: `{
                thing {
                    uid
                }
            }`,
      })

      return result.map((document) => document.uid || document.id)
    },
    outputDirectory: BuildPaths.outputDirectory,
  })

export const HomeRepository = createPrismicRepository({ documentTypeName: 'home', client })
export const ThingRepository = createPrismicRepository({ documentTypeName: 'thing', client })
