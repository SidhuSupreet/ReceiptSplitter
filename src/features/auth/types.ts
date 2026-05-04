export type AuthUser = {
  email: string
  name?: string
  picture?: string
  /** Expiry as a unix epoch in seconds, copied from the ID token's `exp` claim. */
  exp: number
}
