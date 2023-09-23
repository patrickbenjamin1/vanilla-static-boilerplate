import * as fs from 'fs'
import * as path from 'path'

/**
 * a limited but powerful repository layer that allows requesting of documents of a consistent type and storage in a very aggressive cache
 *
 * requires use of a backend that allows
 * 1. a quick way of retrieving just the IDs of every document (so not requesting all of them then stripping the IDs off i.e. https://prismic.io/docs/rest-api-technical-reference#graphquery)
 * 2. a way of requesting only IDs updated later than a given date (i.e. filtering by last updated)
 *
 * The update function returned from getRepository should be run at the beginning of the node build. This first calls getPublishedIdentifiers and
 * strips out any old cached values that are no longer published. Then it calls getSinceLastUpdated to request all documents which have been updated
 * since the last time it was run, and adds the result to the cache (replacing old documents that have since been updated)
 *
 * It returns two accessors - getOne (which gets by an id) and getAll (which gets the entire cache (to be replaced with some kind of json query
 * language)) - these should be used within buildHtml to pass data to given pages
 */

export namespace Repository {
  type Item<T> = T & {
    identifier: string
  }

  interface ICache<T> {
    lastFetched: string
    items: Record<string, Item<T>>
  }

  interface ICachedFetcher<T> {
    update: () => Promise<void>
    getOne: (identifier: string) => Item<T>
    getAll: () => Item<T>[]
  }

  interface ICreateCache<T> {
    /** must return an array of all items that have been updated since the date passed into it */
    getSinceLastUpdated: (lastUpdated: string | undefined) => Promise<Item<T>[]>

    /** must return an array of all ids for this document type (i.e. using graphQuery in the Prismic API) - used to strip out old, since unpublished documents */
    getPublishedIdentifiers: () => Promise<string[]>

    outputDirectory: string
    documentTypeName: string
  }

  const getFullCacheDirectory = <T>({ outputDirectory }: Pick<ICreateCache<T>, 'outputDirectory'>) => path.resolve(outputDirectory, 'cache')

  const getCachePath = <T>({ documentTypeName, outputDirectory }: Pick<ICreateCache<T>, 'documentTypeName' | 'outputDirectory'>) =>
    `${getFullCacheDirectory({ outputDirectory })}/${documentTypeName}.json`

  const createCacheDirectoryIfNotExists = <T>({ outputDirectory }: Pick<ICreateCache<T>, 'outputDirectory'>) => {
    if (!fs.existsSync(getFullCacheDirectory({ outputDirectory }))) {
      fs.mkdirSync(getFullCacheDirectory({ outputDirectory }))
    }
  }

  const getLastFetchedFormattedDate = () => {
    const date = new Date()

    return date.toISOString()
  }

  const retrieveCache = <T>({
    documentTypeName,
    outputDirectory,
  }: Pick<ICreateCache<T>, 'documentTypeName' | 'outputDirectory'>): ICache<T> | undefined => {
    createCacheDirectoryIfNotExists({ outputDirectory })

    const cachePath = getCachePath({ documentTypeName, outputDirectory })

    if (!fs.existsSync(cachePath)) {
      return undefined
    }

    const cacheJson = fs.readFileSync(cachePath)

    return JSON.parse(cacheJson.toString()) as ICache<T>
  }

  const setCache = <T>(
    newCacheValue: ICache<T>,
    { documentTypeName, outputDirectory }: Pick<ICreateCache<T>, 'documentTypeName' | 'outputDirectory'>
  ) => {
    createCacheDirectoryIfNotExists({ outputDirectory })

    const cachePath = getCachePath({ documentTypeName, outputDirectory })

    fs.writeFileSync(cachePath, JSON.stringify(newCacheValue))
  }

  const itemArrayToDictionary = <T>(items: Item<T>[]) => {
    return items.reduce((output, item) => ({ ...output, [item.identifier]: item }), {})
  }

  const stripUnpublished = <T>(items: Record<string, Item<T>>, publishedIds: string[]) => {
    return Object.keys(items).reduce((output, identifier) => {
      if (publishedIds.includes(identifier)) {
        return { ...output, [identifier]: output[identifier as keyof typeof output] }
      }
      return output
    }, {})
  }

  const itemDictionaryToArray = <T>(items: Record<string, Item<T>>) => {
    return Object.keys(items).reduce((output, identifier) => [...output, items[identifier]], [])
  }

  export const create = <T>(config: ICreateCache<T>): ICachedFetcher<T> => {
    /** retrive all new documents since the last updated date using the given getSinceLastUpdated function and store them in the cache */
    const update = async () => {
      const date = getLastFetchedFormattedDate()

      const lastCacheValue = retrieveCache<T>(config)

      const publishedIds = await config.getPublishedIdentifiers()
      const newest = await config.getSinceLastUpdated(lastCacheValue?.lastFetched)

      const newItemsDictionary = {
        ...lastCacheValue.items,
        ...stripUnpublished(itemArrayToDictionary(newest), publishedIds),
      }

      const newCacheValue: ICache<T> = {
        lastFetched: date,
        items: newItemsDictionary,
      }

      setCache(newCacheValue, config)
    }

    /** retrieve an item from the cache by an id */
    const getOne = (identifier: string) => {
      const cache = retrieveCache<T>(config)

      return cache.items[identifier] || undefined
    }

    /** retrieve all items from the cache */
    const getAll = () => {
      const cache = retrieveCache<T>(config)

      return itemDictionaryToArray(cache.items)
    }

    return { update, getOne, getAll }
  }
}
