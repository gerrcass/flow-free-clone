/**
 * Connected/open class pair for Pipes, Endpoint rings, and HUD dots
 * (#13). One helper so Board and HUD never drift branch shapes: the
 * base class always applies, plus `-connected` or `-open`.
 */
export function connectedClass(base: string, connected: boolean): string {
  return connected ? `${base} ${base}-connected` : `${base} ${base}-open`;
}
