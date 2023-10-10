# Vanilla Static Boilerplate

Boilerplate for building static HTML web pages without a framework

Has a custom build step (see build/) which builds a set of HTML documents using a custom HTML templating language based loosely on the syntax of JSX. (see HTML Generation)

Also transpiles and bundles ts, and bundles css using Webpack.

Also has a local dev server using browser-sync

## Prerequisites

- asdf (brew install asdf)

## Install

```sh
asdf install
npm install
```

## Run

To run locally, there are three scripts that need to be run simultaneously

In three separate terminal instances

- `npm run start-webpack`
- `npm run start-html`
- `npm run serve`

This will watch and build all html, ts, and css files, and serve them using browser sync

Alternatively, you can run a combined concurrent start script, but this makes reading logs a lot harder

```sh
npm run start
```

The contents of `source/public/` is also copied over and served from the root of the server

### HTML generation

All logic for building HTML is in `/build` and the only bit you should need to change is in `/build/buildHtml.ts`

Here, you can register pages uses the `registerPages` hook passed into the `build` function exported from `core.js` (a file containing all the important logic for this). This takes a path to the template file, an output path that will correspond to the path its served from (i.e. `/my-thing/id/cool-url`), and some context that gets passed into templates

The `registerPages` hook is asyncronous, meaning data can be fetched in here from an external API and passed into the context of `registerPage`, making API responses (i.e. from a CMS with a JSON API) available to your pages

Anything in `/source/partials/` is registered as a partial which can be used in template files

### HTML Templater (pchtml)

This setup uses a simple custom HTML templating solution

see [templater.md](./docs/templater.md)

### Fetching data

Data can be fetched as usual, but there is an abstracted Repository util to be run at build time, that caches responses and passes the last fetched date back into the fetcher to allow only new data to be requested.

see [repository.md](./docs/repository.md)

### Router

This setup uses a simple custom client side router

see [router.md]('./docs/router.md)

### TS bundling

Webpack is used to bundle Typescript

Anything imported into `app.ts` gets bundled into one bundle which should be included manually in every view.

Any TS file in `views/` will create a new js bundle in dist with that as the entrypoint, allowing page specific code to only be requested for each page. This ensures that only code required for each page is requested, rather than a giant mega bundle, and ensures new code is executed for each page on load.

Pages with their own js bundle should have them manually included at the end of their body (within data-router-root)

### CSS bundling

Webpack is used to bundle CSS

Everything must be imported into `sources/styles.css` to be bundled

## Build

To build servable outputs, run `npm run build`

The contents of `dist` can now be used as a static thing

# Todo

- handle query and hash changes in the router without refetching the page
- URGENT - remove deleted pages from dist file
- cached repository layer which wraps up requests to third party APIs
  - add paging for cached files
  - i.e. if array is more than say 30, split into paged files (/cache/thing--0.json) and add index file (/cache/thing--index.json) that includes an array of arrays of ids (index in initial array corresponds to which page it's in) to speed up queries
  - sorting for cached files
- write some utils for using the repository layer at runtime - embedded json in script tag that gets passed to the templater? entire context strigified into a script tag with a js util to read it? or just fetch requests to the served json files as they're built to output?
- OPTIMISATION - allow templater to return templates before rendering to prevent mutliple possibly massive functions being evald (i.e. have something that returns the result of getFunctionTemplate for reuse)
- allow passing helper functions into templater (https://stackoverflow.com/questions/6754919/json-stringify-function)
- implement some kind of query language for large json files (or store them some other way - as the current implementation scales, it'll get unwieldy cus the whole file will need to be loaded into memory - could also page the json and query them one at a time, will slow things down way more but will help stop things getting too big)
- write some nice utils for using the templater at runtime
- way more documentation for templater
- switch to Vite
- dependency tree for partial rerenders in dev
  - currently builds all page on partial changes - should keep track of which pages include which partials and only rebuild the necessary pages
- combine different watchers
  - currently has `npm run serve`, `npm run start-html` and `npm run start-webpack` - these should be combined into a single script
  - custom cli?
- vscode extension for syntax highlighting
  - I will almost definitely never do this lol but would be fun to learn how to write one
- write an express server to allow live server side rendering on some routes
