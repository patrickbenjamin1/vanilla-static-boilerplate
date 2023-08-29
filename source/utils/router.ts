import { AsyncUtils } from './async'
import { DomUtils } from './dom'

export namespace Router {
  const pageCache: { [path: string]: string } = {}

  const paramTemplateRegex = /^\[(\w+)\]$/

  const transitionOutTime = 150

  /** take a route and return an object keyed by the name in a given template (i.e. /thing/[id]) */
  export const getParamsFromRoute = <T extends Record<string, string>>(template: string) => {
    const currentPath = window.location.pathname

    const currentPathParts = currentPath.split('/')
    const templateParts = template.split('/')

    let output = {}

    for (let index = 0; index < templateParts.length; index++) {
      const currentPathPart = currentPathParts[index]
      const templatePart = templateParts[index]

      const matches = templatePart.match(paramTemplateRegex)
      const key = matches?.[1]

      if (key) {
        output = { ...output, [key]: currentPathPart }
      } else if (currentPathPart !== templatePart) {
        return null
      }
    }

    return output as T
  }

  /** request html from the server for a view at a given path (or return html from the cache) */
  const getViewMarkup = async (path: string) => {
    // fetch html from path
    const responseHtml = pageCache[path] || (await (await fetch(path)).text())

    // add to cache
    pageCache[path] = responseHtml

    // create element in memory, add response to it
    const newRouteRoot = document.createElement('html')
    newRouteRoot.innerHTML = responseHtml

    // get head and root from response
    const root = newRouteRoot.querySelector('[data-router-root]')
    const head = newRouteRoot.querySelector('head')

    return { root, head }
  }

  /** update the current html with the given */
  const updateRouter = async () => {
    // get new path
    const path = location.pathname

    // get elements
    const root = document.querySelector('[data-router-root]')
    const head = document.querySelector('head')

    if (root && head) {
      // start transition with data attribute triggering CSS rules
      root.setAttribute('data-transitioning-out', 'true')

      // get markup for new view, and ensure transition out time has elapsed before new markup is used
      const [{ root: newRoot, head: newHead }] = await Promise.all([getViewMarkup(path), AsyncUtils.wait(transitionOutTime)])

      // replace content
      root.innerHTML = newRoot?.innerHTML || ''

      // replace metadata
      head.querySelectorAll('[data-router-replace]').forEach((element) => element.remove())
      newHead?.querySelectorAll('[data-router-replace]').forEach((element) => head.appendChild(element))

      // ensure scripts work
      DomUtils.fixScripts(root)
      DomUtils.fixScripts(head, 'script[data-router-replace]')

      // end transition
      root.setAttribute('data-transitioning-out', 'false')
    }
  }

  /** navigate to a new path */
  export const navigate = async (path: string, replace?: boolean) => {
    if (path !== window.location.pathname) {
      if (replace) {
        history.replaceState({}, '', path)
      } else {
        history.pushState({}, '', path)
      }
      await updateRouter()
    }
  }

  /** initalise all router logic */
  export const init = () => {
    // override click events on anchor tags
    DomUtils.addRootEventListener('a', 'click', (event, element) => {
      const href = element.getAttribute('href')

      if (href && href[0] === '/') {
        event.preventDefault()
        navigate(href)
      }
    })

    // ensure popstate events trigger updates
    window.addEventListener('popstate', updateRouter)
  }
}
