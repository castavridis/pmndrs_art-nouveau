import type { NavStoreApi } from '../src/nav/store'
declare global {
  interface Window {
    __navStore?: NavStoreApi
  }
}
