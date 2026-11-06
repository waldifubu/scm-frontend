/**
 * Where to go after logging in: the page that sent the user to the login, carried in `?redirect=`.
 *
 * It arrives from the address bar, so it is anybody's to write. Only a path inside this application
 * is followed - one that starts with a single slash. `//evil.example` and `https://evil.example` are
 * addresses elsewhere that a login page would otherwise forward a freshly logged-in user to.
 */
export function safeRedirect(target: string | undefined): string {
  if (target && target.startsWith('/') && !target.startsWith('//') && !target.startsWith('/\\')) {
    return target
  }
  return '/'
}
