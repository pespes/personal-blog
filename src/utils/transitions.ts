/**
 * Centralized page transition configuration.
 *
 * Astro's ClientRouter applies named view transition animations (elements with
 * `transition:name`) via the Web Animations API — not CSS. This means CSS
 * overrides (even with `!important`) have no effect on them. The only reliable
 * way to control named transition animations is via the `transition:animate`
 * directive on each element.
 *
 * This file exports a single `transition` value so all named transitions across
 * the site share one configuration. To change the animation globally — swap
 * the type, adjust the duration, or disable entirely — edit only this file.
 *
 * Usage in any .astro file:
 *   import { transition } from "@/utils/transitions";
 *   <element transition:name="my-name" transition:animate={transition} />
 *
 * Note: the `<body transition:animate>` in Layout.astro controls the root
 * (unnamed) page transition separately and should also be updated if you
 * change the duration here.
 */

import { fade } from "astro:transitions";

export const transition = fade({ duration: "150ms" });
