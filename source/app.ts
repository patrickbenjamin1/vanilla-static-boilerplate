import './styles.css'

import { Header } from './partials/header'
import { Router } from './utils/router'

document.addEventListener('DOMContentLoaded', () => {
  Header.init()
  Router.init()
})
