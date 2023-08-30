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

### HTML bundling

HTML is bundled using handlebars

All logic for this is in `/build` and the only bit you should need to change is in `/build/buildHtml.js`

Here, you can register pages uses the `registerPages` hook passed into the `build` function exported from `core.js` (a file containing all the important logic for this). This takes a path to the template file, an output path that will correspond to the path its served from (i.e. `/my-thing/id/cool-url`), and some context that gets passed to Handlebars

The `registerPages` hook is asyncronous, meaning data can be fetched in here from an external API and passed into the context of `registerPage`, making API responses (i.e. from a CMS with a JSON API) available to your pages

Anything in `/source/partials/` is registered as a partial and can be used in Handlebars templates

### Router

When served, the site should be served as static html files (without the extension)

Once served, there is a router which takes over navigation events in the browser

This requests the given HTML for a new page, and looks for a div with the attribute `data-router-root`, and replaces the current `data-router-root` with the new one

It will also replace anything in the document head that has `data-router-replace` with whatever comes from the new page

### TS bundling

Webpack is used to bundle Typescript

Any TS file in `views/` will create a new bundle with that as the entrypoint, allowing page specific code to only be requested for each page. This ensures that only code required for each page is requested, rather than a giant mega bundle, and ensures new code is executed for each page on load.

## Build

To build servable outputs, run `npm run build`

The contents of `dist` can now be used as a static thing
