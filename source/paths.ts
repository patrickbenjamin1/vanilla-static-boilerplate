export namespace Paths {
  export const index = '/'
  export const page2 = '/2'
  export const thing = ({ uid }: { uid: string }) => `/thing/${uid}`
}
