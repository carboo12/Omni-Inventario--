// Reemplazo de next/dynamic para Vite: lazy load con React.lazy + Suspense.
//
// IMPORTANTE: React.lazy exige que el loader resuelva a un módulo con
// propiedad `default`. Para evitar el error "Element type is invalid" cuando el
// componente usa export nombrado, normalizamos el resultado:
//   - si el módulo tiene `.default`, lo usamos tal cual;
//   - si no, lo envolvemos como { default: <lo resuelto> }.
import { lazy, Suspense, createElement } from 'react';

type DynamicOptions = {
  ssr?: boolean;
  loading?: React.ComponentType;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function dynamic(load: () => Promise<any>, _options: DynamicOptions = {}) {
  const LazyComponent = lazy(async () => {
    const mod = await load();
    // Acepta tanto { default: X } como export nombrado (X directo o { X }).
    if (mod && typeof mod === 'object' && 'default' in mod) return mod;
    return { default: mod };
  });
  const Loading = _options.loading;
  return function DynamicWrapper(props: any) {
    return createElement(
      Suspense,
      { fallback: Loading ? createElement(Loading) : null },
      createElement(LazyComponent, props)
    );
  };
}