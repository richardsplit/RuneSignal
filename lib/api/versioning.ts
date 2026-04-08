/**
 * TrustLayer API Versioning
 *
 * Parses Accept header for explicit version requests and provides
 * response header helpers.
 *
 * Versioning strategy:
 *   - Default: v1 (current stable)
 *   - Explicit: Accept: application/vnd.trustlayer.v1+json
 *   - Response header: X-API-Version: 1
 */

export const CURRENT_API_VERSION = '1';
export const SUPPORTED_API_VERSIONS = ['1'];

/**
 * Parses the API version from Accept header.
 * Returns the version number string, or the current version as fallback.
 */
export function parseApiVersion(acceptHeader: string | null): string {
  if (!acceptHeader) return CURRENT_API_VERSION;

  // Match: application/vnd.trustlayer.v{N}+json
  const match = acceptHeader.match(/application\/vnd\.trustlayer\.v(\d+)\+json/);
  if (match && SUPPORTED_API_VERSIONS.includes(match[1])) {
    return match[1];
  }

  return CURRENT_API_VERSION;
}

/**
 * Returns standard API response headers to add to all /api/v1/ responses.
 */
export function apiVersionHeaders(version: string = CURRENT_API_VERSION): Record<string, string> {
  return {
    'X-API-Version': version,
    'X-TrustLayer-Version': `trustlayer/${version}`,
  };
}
