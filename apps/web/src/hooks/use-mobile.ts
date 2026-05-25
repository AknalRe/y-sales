import { useMediaQuery } from './use-media-query';

const DEFAULT_MOBILE_BREAKPOINT = 768;

export function useIsMobile(breakpoint: number = DEFAULT_MOBILE_BREAKPOINT) {
  return useMediaQuery(`(max-width: ${breakpoint - 1}px)`);
}
