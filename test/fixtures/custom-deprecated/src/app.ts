import { Legacy, oldFn, stale, uncatalogued } from './lib.ts'

const a = oldFn()
const b = stale
const obj = new Legacy()
obj.oldMethod()
uncatalogued()

export { a, b, obj }
