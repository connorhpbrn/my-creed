// PostgREST only lists RPCs that remain granted in its schema cache.
// A newer applied migration can still leave personal writes dead if it
// revoked execute on commit_personal_creed.
export const COMMIT_PERSONAL_CREED_OPENAPI_PATH = "/rpc/commit_personal_creed";

export function openApiExposesCommitPersonalCreed(document) {
  if (!document || typeof document !== "object") return false;
  const paths = document.paths;
  if (!paths || typeof paths !== "object") return false;
  return Object.keys(paths).some(
    (path) =>
      path === COMMIT_PERSONAL_CREED_OPENAPI_PATH ||
      path.endsWith("/rpc/commit_personal_creed"),
  );
}
