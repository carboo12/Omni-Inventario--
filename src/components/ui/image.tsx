// Reemplazo de next/image para Vite: renderiza <img> estándar.
// Soporta las props más usadas de next/image (src, alt, width, height, fill, className, priority, sizes).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function Image(props: any) {
  const {
    src,
    alt = '',
    width,
    height,
    fill,
    className,
    priority,
    sizes,
    style,
    unoptimized,
    ...rest
  } = props;

  const imgStyle: Record<string, string | number> = { ...(style || {}) };
  if (fill) {
    imgStyle.position = 'absolute';
    imgStyle.inset = '0';
    imgStyle.width = '100%';
    imgStyle.height = '100%';
    imgStyle.objectFit = rest.objectFit || 'cover';
  }

  return (
    <img
      src={src}
      alt={alt}
      width={!fill ? width : undefined}
      height={!fill ? height : undefined}
      className={className}
      sizes={sizes}
      loading={priority ? 'eager' : 'lazy'}
      decoding="async"
      style={imgStyle}
      {...rest}
    />
  );
}