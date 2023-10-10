# Repository

A util for caching API responses in JSON, with callbacks provided to allow you to only fetch new items, massively speeding up builds.

For use at build time

```ts
const MyRepository = Repository.create({
    documentTypeName: 'my-repository' // the name used for the cache file
    getNew: async (lastUpdated) => {
        // request new stuff, optionally use the lastUpdated argument to filter your requests
        // ensure the return array has an `identifier` property on it
    },
    getPublishedIdentifiers: () => {
        // get the ids of all currently published documents in this repository
        // used to strip off cached items that aren't published any more
    },
    outputDirectory: '/path/to/cache/output'
})

MyRepository.update()

const items = MyRepository.getAll()
const item = MyRepository.getById('thing')

```

An example using Prismic:

```ts
const client = prismic.createClient('vanilla-boilerplate')

const MyRepository = Repository.create({
  documentTypeName: 'document-type-name',
  getNew: async (lastUpdated) => {
    const result = await config.client.getAllByType('document-type-name', {
      filters: lastUpdated && [prismic.filter.dateAfter('document.last_publication_date', new Date(lastUpdated))],
    })

    return result.map((document) => ({
      identifier: document.uid || document.id,
      ...document,
    }))
  },
  getPublishedIdentifiers: async () => {
    const result = await config.client.getAllByType('document-type-name', {
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
```
