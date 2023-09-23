# Vanilla Static Boilerplate

Boilerplate which builds a static set of HTML files using handlebars (with utils for defining pages and such) and uses webpack to bundle global and page-level js (from typescript) and to bundle all css

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

The contents of `source/public/` is also copied over and served from the root of the server

### HTML generation

HTML is bundled using a custom HTML templating system, loosely based on JSX

All logic for this is in `/build` and the only bit you should need to change is in `/build/buildHtml.ts`

Here, you can register pages uses the `registerPages` hook passed into the `build` function exported from `core.js` (a file containing all the important logic for this). This takes a path to the template file, an output path that will correspond to the path its served from (i.e. `/my-thing/id/cool-url`), and some context that gets passed into templates

The `registerPages` hook is asyncronous, meaning data can be fetched in here from an external API and passed into the context of `registerPage`, making API responses (i.e. from a CMS with a JSON API) available to your pages

Anything in `/source/partials/` is registered as a partial which can be used in template files

#### HTML Templater

PCHTML files are template files using a custom (but very simple) templating system, loosely based on the simplicity of JSX

Under the hood, all these files are turned into JS template strings (i.e. `<p>{name}</p>` is turned into `` `<p>${name}</p>\` ``)

Anything in the braces is evaluated as javascript and returns the value as a string.

Partials are registered from the `partialsDirectory` given to the build function. These are accessed using the filename preceded by an underscore. I.e. `<_header title='foobar' />` will render the file `${partialsDirectory}/header.pchtml` with the context `{ title: 'foobar' }`

All logic for templating is found in `/build/template.ts`.

Due to it's similarity in syntax to JSX, I recommend setting VSCode (or whatever IDE you're on) to treat pchtml files as JSX files - but there are some limitations

- JSX requires a single root html element, whereas this doesn't by design
- attributes need to be wrapped in quotes, with braces inside - i.e. `<div className={className} />` in JSX would be `<div className="{className}" />` in PCHTML

### Router

When served, the site should be served as static html files (without the extension)

Once served, there is a router which takes over navigation events in the browser

This requests the given HTML for a new page, and looks for a div with the attribute `data-router-root`, and replaces the current `data-router-root` with the new one

It will also replace anything in the document head that has `data-router-replace` with whatever comes from the new page

### TS bundling

Webpack is used to bundle Typescript

Any TS file in `views/` will create a new bundle with that as the entrypoint, allowing page specific code to only be requested for each page. This ensures that only code required for each page is requested, rather than a giant mega bundle, and ensures new code is executed for each page on load.

### CSS bundling

Webpack is used to bundle CSS

Everything must be imported into `sources/styles.css` to be bundled

## Build

To build servable outputs, run `npm run build`

The contents of `dist` can now be used as a static thing

# Todo

- cached repository layer which wraps up requests to third party APIs
  - make really generic (i.e. a cache accessor class which has an array of document types given in the constructor, with formatted requests for CRUDs passed into constructor)
  - cache all data in json arrays by document, use results as context for page generation
  - build this for Prismic initially, but make cache accessors generic enough to be reused
  - for Prismic, this can request only documents with later updated dates than the last build - this might be possible for other backends, but should be kept optional
- write some utils for using the repository layer at runtime - embedded json in script tag?
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
