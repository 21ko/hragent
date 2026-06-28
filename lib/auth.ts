const STAFFLY_API_KEY = process.env.STAFFLY_API_KEY;
const STAFFLY_ADMIN_KEY = process.env.STAFFLY_ADMIN_KEY;

/**
 * Gate for the /v1 agent-facing API. If STAFFLY_API_KEY is set, callers must
 * present it via `Authorization: Bearer <key>` or `x-api-key`. If it's unset
 * (demo/dev), access is open so the plugin works out of the box.
 */
export function checkApiKey(req: Request): boolean {
  if (!STAFFLY_API_KEY) return true;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const headerKey = req.headers.get("x-api-key") || "";
  return bearer === STAFFLY_API_KEY || headerKey === STAFFLY_API_KEY;
}

/**
 * Gate for internal admin-facing routes (candidate management, mission listing,
 * CV import). When STAFFLY_ADMIN_KEY is set, callers must present it via
 * `Authorization: Bearer <key>` or `x-admin-key`. When unset (demo/dev),
 * access is open so local development works without extra config.
 */
export function checkAdminKey(req: Request): boolean {
  if (!STAFFLY_ADMIN_KEY) return true;
  const auth = req.headers.get("authorization") || "";
  const bearer = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : "";
  const headerKey = req.headers.get("x-admin-key") || "";
  return bearer === STAFFLY_ADMIN_KEY || headerKey === STAFFLY_ADMIN_KEY;
}

export const authRequired = Boolean(STAFFLY_API_KEY);
export const adminAuthRequired = Boolean(STAFFLY_ADMIN_KEY);
