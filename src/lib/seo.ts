export const PUBLIC_PATHS = ["/", "/our-plan", "/priorities", "/updates", "/about", "/code-of-conduct", "/privacy", "/contact"] as const;

export const PRIVATE_PREFIXES = ["/portal", "/admin", "/api", "/auth", "/sign-in"] as const;

export function isPrivatePath(pathname: string): boolean {
  return PRIVATE_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}
