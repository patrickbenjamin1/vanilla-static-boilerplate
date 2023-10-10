# Router

Uses a custom routing setup

The router overrides history change events (popstate) and click events on `a` tags, requests the new page from the server, and only replaces specified parts of the DOM with the response, allowing a persistent shell between pages

## Usage

Every page should have an element defined as the router root, using a data attribute

```html
<html>
  <body>
    <header>I'm the header</header>

    <div data-router-root>specific page contents goes here</div>
  </body>
</html>
```

During a page change, the existing `data-router-root` element gets a `data-transitioning-out="true"` attribute added to it, allowing for custom page transitions to be handled however you want. This attribute lasts for the `transitionOutTime` defined at the top of `router.ts` (or, if longer, the time it takes to request the new page).

To get the same functionality when triggering changes in javascript, use the `Router.navigate` function

```js
import { Router } from '../utils/router'

Router.navigate('/new-page')
```

`navigate` takes a second argument, a boolean telling `navigate` whether to use a history replace
