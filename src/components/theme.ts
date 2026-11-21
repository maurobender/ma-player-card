// Components don't define the base variables (--fill, --glass, --accent…): they inherit them
// from the card around them, so they follow the HA theme and the configured accent color.

/** Applied on each card's :host. */
export const BASE_VARS = `
  --fill: color-mix(in srgb, var(--primary-text-color) 7%, transparent);
  --fill-strong: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --sep: color-mix(in srgb, var(--primary-text-color) 12%, transparent);
  --glass: color-mix(in srgb, var(--card-background-color, #fff) 72%, transparent);
  --glass-bg: color-mix(in srgb, var(--primary-background-color, #f2f2f7) 80%, transparent);
  --blur: blur(30px) saturate(180%);
`;

/**
 * Dark theme over the blurred artwork (shown while something plays). Redefines --glass too:
 * inherited variables arrive already computed from the light colors.
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
