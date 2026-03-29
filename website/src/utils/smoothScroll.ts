import { animate } from "animejs";

/**
 * Smooth scroll to a target position using anime.js
 * @param targetY - Target scroll position in pixels
 * @param duration - Animation duration in milliseconds (default: 800)
 * @param easing - Easing function (default: 'easeInOutCubic')
 */
export function smoothScrollTo(
  targetY: number,
  duration: number = 800,
  easing: string = "easeInOutCubic"
): Promise<void> {
  return new Promise((resolve) => {
    const startY = window.scrollY;
    const distance = targetY - startY;

    // Create a temporary object to animate
    const scrollObj = { value: startY };

    animate(scrollObj, {
      value: targetY,
      duration,
      easing,
      update: () => {
        window.scrollTo(0, scrollObj.value);
      },
      complete: () => {
        resolve();
      },
    });
  });
}

/**
 * Smooth scroll to an element using anime.js
 * @param element - Target element or selector
 * @param duration - Animation duration in milliseconds (default: 800)
 * @param easing - Easing function (default: 'easeInOutCubic')
 * @param offset - Optional offset in pixels (negative to scroll above target)
 */
export function smoothScrollToElement(
  element: Element | string,
  duration: number = 800,
  easing: string = "easeInOutCubic",
  offset: number = 0
): Promise<void> {
  const targetElement =
    typeof element === "string" ? document.querySelector(element) : element;

  if (!targetElement) {
    console.warn(`Element not found: ${element}`);
    return Promise.resolve();
  }

  const rect = targetElement.getBoundingClientRect();
  const targetY = window.scrollY + rect.top + offset;

  return smoothScrollTo(targetY, duration, easing);
}

/**
 * Smooth scroll by a relative amount using anime.js
 * @param deltaY - Amount to scroll (positive = down, negative = up)
 * @param duration - Animation duration in milliseconds (default: 600)
 * @param easing - Easing function (default: 'easeInOutCubic')
 */
export function smoothScrollBy(
  deltaY: number,
  duration: number = 600,
  easing: string = "easeInOutCubic"
): Promise<void> {
  const targetY = window.scrollY + deltaY;
  return smoothScrollTo(targetY, duration, easing);
}
