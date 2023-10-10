import * as fs from 'fs'
import * as path from 'path'
import { createLogger } from './logger'

/**
 * a limited but powerful repository layer that allows requesting of documents of a consistent type and storage in a very aggressive cache
 *
 * requires use of a backend that allows
 * 1. a quick way of retrieving just the IDs of every document (so not requesting all of them then stripping the IDs off i.e. https://prismic.io/docs/rest-api-technical-reference#graphquery)
 * 2. a way of requesting only IDs updated later than a given date (i.e. filtering by last updated)
 *
 * The update function returned from getRepository should be run at the beginning of the node build. This first calls getPublishedIdentifiers and
 * strips out any old cached values that are no longer published. Then it calls getNew to request all documents which have been updated
 * since the last time it was run, and adds the result to the cache (replacing old documents that have since been updated)
 *
 * It returns two accessors - getOne (which gets by an id) and getAll (which gets the entire cache (to be replaced with some kind of json query
 * language)) - these should be used within buildHtml to pass data to given pages
 *
 * using this is completely optional in this setup, and data can just be fetched with fetch directly if a more flexible way of requesting data
 * is needed - in cases where it can be used (such as document based CMSs which support the above) it will massively speed up pulling data from
 * the cms meaning the build step is way quicker
 *
 * caches are stored as json dictionaries keyed by an identifier
 *
 * BIG WARN - this will not scale well and will eventually slow down builds on big documents
 */

export namespace Repository {
  const logger = createLogger('Repository')

  type Item<T> = T & {
    identifier: string
  }

  interface ICache<T> {
    lastFetched: string
    items: Record<string, Item<T>>
  }

  interface IRepository<T> {
    /** retrive all new documents since the last updated date using the given getNew function and store them in the cache */
    update: () => Promise<void>

    /** retrieve an item from the cache by an id - leave the id blank to retrieve the first item (useful for singletons) */
    getOne: (identifier?: string) => Item<T> | undefined

    /** retrieve all items from the cache */
    getAll: () => Item<T>[]
  }

  interface ICreateRepositoryConfig<T> {
    /** must return an array of all items that have been updated since the date passed into it */
    getNew: (lastUpdated: string | undefined) => Promise<Item<T>[]>

    /** must return an array of all ids for this document type (i.e. using graphQuery in the Prismic API) - used to strip out old, since unpublished documents */
    getPublishedIdentifiers?: () => Promise<string[]>

    outputDirectory: string
    documentTypeName: string

    /** remove old items with the result of getNew - when true, ensures the entire cache is just the result of getNew, effectively disabling caching but still useful as all data can be stored in json for the frontend - when false, ensure getPublishedIdentifiers is used */
    clearCacheOnRefetch?: boolean
  }

  /** get the directory of the cache from a given output directory */
  const getFullCacheDirectory = <T>({ outputDirectory }: Pick<ICreateRepositoryConfig<T>, 'outputDirectory'>) =>
    path.resolve(outputDirectory, 'cache')

  /** get the path for a cache item from the document type name */
  const getCachePath = <T>({ documentTypeName, outputDirectory }: Pick<ICreateRepositoryConfig<T>, 'documentTypeName' | 'outputDirectory'>) =>
    `${getFullCacheDirectory({ outputDirectory })}/${documentTypeName}.json`

  /** ensure the cache directory is created if it doesn't already exist */
  const createCacheDirectoryIfNotExists = <T>({ outputDirectory }: Pick<ICreateRepositoryConfig<T>, 'outputDirectory'>) => {
    if (!fs.existsSync(getFullCacheDirectory({ outputDirectory }))) {
      logger.info(`Creating cache directory...`)
      fs.mkdirSync(getFullCacheDirectory({ outputDirectory }))
    }
  }

  /** convert a date to the date format used in the cached files */
  const getLastFetchedFormattedDate = () => new Date().toISOString()

  /** read a json file from the cache */
  const retrieveCache = <T>({
    documentTypeName,
    outputDirectory,
  }: Pick<ICreateRepositoryConfig<T>, 'documentTypeName' | 'outputDirectory'>): ICache<T> | undefined => {
    createCacheDirectoryIfNotExists({ outputDirectory })

    const cachePath = getCachePath({ documentTypeName, outputDirectory })

    if (!fs.existsSync(cachePath)) {
      logger.info(`No cache found for ${documentTypeName}`)

      return undefined
    }

    const cacheJson = fs.readFileSync(cachePath)

    logger.success(`Read from cache for ${documentTypeName}`)

    return JSON.parse(cacheJson.toString()) as ICache<T>
  }

  /** set the json file value in the cache */
  const setCache = <T>(
    newCacheValue: ICache<T>,
    { documentTypeName, outputDirectory }: Pick<ICreateRepositoryConfig<T>, 'documentTypeName' | 'outputDirectory'>
  ) => {
    createCacheDirectoryIfNotExists({ outputDirectory })

    const cachePath = getCachePath({ documentTypeName, outputDirectory })

    fs.writeFileSync(cachePath, JSON.stringify(newCacheValue))

    logger.success(`Wrote to cache for ${documentTypeName}`)
  }

  /** convert an array of items to a dictionary */
  const itemArrayToDictionary = <T>(items: Item<T>[]) => {
    return items.reduce((output, item) => ({ ...output, [item.identifier]: item }), {})
  }

  /** strip any unpublished IDs using an array of currently published IDs */
  const stripUnpublished = <T>(items: Record<string, Item<T>>, publishedIds?: string[]) => {
    if (!publishedIds) {
      return items
    }

    return Object.keys(items).reduce((output, identifier) => {
      if (publishedIds.includes(identifier)) {
        return { ...output, [identifier]: items[identifier as keyof typeof items] }
      }
      return output
    }, {})
  }

  /** convert a dictionary of items to an array */
  const itemDictionaryToArray = <T>(items: Record<string, Item<T>>) => {
    return Object.keys(items).reduce<Item<T>[]>((output, identifier) => [...output, items[identifier]], [] as Item<T>[])
  }

  /** define a new cache */
  export const create = <T>(config: ICreateRepositoryConfig<T>): IRepository<T> => {
    logger.info(`Creating repository for ${config.documentTypeName}...`)

    /** retrive all new documents since the last updated date using the given getNew function and store them in the cache */
    const update = async () => {
      logger.verbose(`fetching new ${config.documentTypeName}...`)

      const date = getLastFetchedFormattedDate()

      const lastCacheValue = retrieveCache<T>(config)

      const publishedIds = config.getPublishedIdentifiers && !config.clearCacheOnRefetch ? await config.getPublishedIdentifiers() : undefined
      const newest = await config.getNew(lastCacheValue?.lastFetched)

      logger.info(`fetched ${newest.length} new ${config.documentTypeName}`)

      const newItemsDictionary = {
        ...(config.clearCacheOnRefetch && newest.length ? {} : stripUnpublished(lastCacheValue?.items || {}, publishedIds)),
        ...(itemArrayToDictionary(newest) || {}),
      }

      const newCacheValue: ICache<T> = {
        lastFetched: date,
        items: newItemsDictionary,
      }

      setCache(newCacheValue, config)
    }

    /** retrieve an item from the cache by an id - leave the id blank to retrieve the first item (useful for singletons) */
    const getOne = (identifier?: string) => {
      logger.success(`Get one ${config.documentTypeName} at ${identifier}`)

      const cache = retrieveCache<T>(config)

      if (!cache) {
        logger.error(`${config.documentTypeName} requested but no cache found - has Repository.update been run?`)
        return undefined
      }

      if (!identifier) {
        const firstIdentifier = Object.keys(cache.items)[0]

        return cache.items[firstIdentifier]
      }

      return cache.items[identifier] || undefined
    }

    /** retrieve all items from the cache */
    const getAll = () => {
      logger.success(`Get all ${config.documentTypeName}`)

      const cache = retrieveCache<T>(config)

      if (!cache) {
        logger.error(`${config.documentTypeName} requested but no cache found - has Repository.update been run?`)
        return []
      }

      return itemDictionaryToArray(cache.items)
    }

    return { update, getOne, getAll }
  }
}
