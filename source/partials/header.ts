import Parallax from 'parallax-scroll'

export namespace Header {
  let heroElement = document.querySelector('.hide-header')
  let headerElement = document.querySelector('header.header')

  export let headerHeight = headerElement?.clientHeight || 0
  export let heroHeight = heroElement?.clientHeight || 0

  const getElements = () => {
    heroElement = document.querySelector('.hide-header')
    headerElement = document.querySelector('header.header')
  }

  const onResize = () => {
    headerHeight = headerElement?.clientHeight || 0
    heroHeight = heroElement?.clientHeight || 0

    document.documentElement.style.setProperty('--header-height', `${headerHeight}px`)
  }

  const setFixed = (fixed: boolean) => {
    if (headerElement) {
      if (fixed) {
        headerElement.removeAttribute('tabindex')
        headerElement.removeAttribute('aria-hidden')
      } else {
        headerElement.setAttribute('tabindex', '-1')
        headerElement.setAttribute('aria-hidden', '')
      }
      headerElement.setAttribute('data-fixed', fixed ? 'true' : 'false')
    }
  }

  const onScroll = () => {
    if (document.scrollingElement && headerElement) {
      const fixed = document.scrollingElement.scrollTop > heroHeight - headerHeight

      if (headerElement.getAttribute('data-fixed') !== (fixed ? 'true' : 'false')) {
        setFixed(fixed)
      }
    }
  }

  export const init = () => {
    getElements()

    document.addEventListener('resize', onResize)
    document.addEventListener('scroll', onScroll)

    onResize()
    onScroll()

    const parallax = new Parallax('.hero .hero-bg', { speed: 0.2 })
    parallax.animate()
  }
}
