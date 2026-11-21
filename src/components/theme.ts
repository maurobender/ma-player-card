// Variables de color compartidas por las cards y los componentes.
//
// Los componentes NO definen las variables base (--fill, --glass, --accent…): las heredan
// de la card que los contiene, así siguen el tema de HA y el color de acento configurado.

/** Variables base: se aplican en el :host de cada card. */
export const BASE_VARS = `
  --fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);       /* relleno gris iOS */
  --fill-strong: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --sep: color-mix(in srgb, var(--primary-text-color) 12%, transparent);        /* líneas finas */
  --glass: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
  --glass-bg: color-mix(in srgb, var(--primary-background-color, #f2f2f7) 80%, transparent);
  --blur: blur(30px) saturate(180%);
`;

/**
 * Tema oscuro sobre la portada desenfocada (lo que se ve con algo sonando).
 * Redefine también --glass: las variables heredadas llegan ya calculadas con los colores claros.
 */
export const DARK_VARS = `
  --primary-text-color: #fff;
  --secondary-text-color: rgba(255, 255, 255, .62);
  --primary-background-color: #1c1c1e;
  --card-background-color: #2c2c2e;
  --glass: color-mix(in srgb, #2c2c2e 72%, transparent);
  --glass-bg: rgba(28, 28, 30, .2);
  --fill: rgba(255, 255, 255, .1);
  --fill-strong: rgba(255, 255, 255, .16);
  --sep: rgba(255, 255, 255, .14);
  color-scheme: dark;
`;
