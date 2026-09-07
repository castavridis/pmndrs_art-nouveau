import type { useNavStore } from '../src/nav/store'
declare global {
  interface Window {
    __navStore?: typeof useNavStore
  }
}
