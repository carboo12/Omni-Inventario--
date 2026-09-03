// Shim para 'next/cache'. En el servidor Hono no hay ISR ni revalidación de
// rutas Next, por lo que revalidatePath es un no-op. Se mantiene la misma firma.
export function revalidatePath(_path: string, _type?: 'layout' | 'page' | 'route'): void {
  // no-op: sin caché de rutas de Next en el server Hono.
}
