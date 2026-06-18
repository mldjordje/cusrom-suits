export const buildMofficeProxyHeaders = (secret: string) => ({
  "X-Proxy-Secret": secret,
});
