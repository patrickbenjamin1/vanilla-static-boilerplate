export namespace DomUtils {
  /** add an event listener to the document that can listen for events on elements which didn't exist when this function was called */
  export const addRootEventListener = (selector: string, type: keyof HTMLElementEventMap, callback: (event: Event, element: Element) => void) => {
    // define event listener callback
    const eventListenerCallback = (event: Event) => {
      // get the original target of the event
      const { target } = event

      if (target instanceof Element) {
        // get parent that matches the given selector
        const matched = target.closest(selector)

        if (matched) {
          // run callback
          callback(event, matched)
        }
      }
    }

    // add callback to event listener on the body
    document.defaultView?.addEventListener(type, eventListenerCallback, true)

    // return the callback so it can be removed
    return eventListenerCallback
  }

  /** slight hack to ensure scripts execute if added using string content (scripts made using innerHTML = * don't execute) */
  export const fixScripts = (element: Element, selector = 'script') => {
    if (element) {
      element.querySelectorAll(selector).forEach((script) => {
        const newScript = document.createElement('script')
        newScript.text = script.innerHTML
        for (let index = 0; index < script.attributes.length; index++) {
          newScript.setAttribute(script.attributes.item(index)!.name, script.attributes.item(index)!.value)
        }
        script.parentNode?.replaceChild(newScript, script)
      })
    }
  }
}
