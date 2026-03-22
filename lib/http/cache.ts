type PublicCacheOptions = {
  maxAge?: number;
  sMaxAge?: number;
  staleWhileRevalidate?: number;
  immutable?: boolean;
};

export const buildPublicCacheControl = ({
  maxAge = 60,
  sMaxAge = maxAge,
  staleWhileRevalidate = sMaxAge,
  immutable = false,
}: PublicCacheOptions = {}) => {
  const parts = [
    "public",
    `max-age=${Math.max(0, Math.floor(maxAge))}`,
    `s-maxage=${Math.max(0, Math.floor(sMaxAge))}`,
  ];

  if (immutable) {
    parts.push("immutable");
  } else if (staleWhileRevalidate > 0) {
    parts.push(`stale-while-revalidate=${Math.max(0, Math.floor(staleWhileRevalidate))}`);
  }

  return parts.join(", ");
};

export const applyPublicCache = <T extends Response>(response: T, options?: PublicCacheOptions) => {
  response.headers.set("Cache-Control", buildPublicCacheControl(options));
  return response;
};

export const applyDefaultPublicCache = <T extends Response>(
  response: T,
  options?: PublicCacheOptions,
) => {
  if (!response.headers.has("Cache-Control")) {
    response.headers.set("Cache-Control", buildPublicCacheControl(options));
  }
  return response;
};
