let appPromise: Promise<(req: unknown, res: unknown) => unknown> | null = null;

async function getApp() {
  if (!appPromise) {
    appPromise = import("../backend/src/index.js").then(
      (mod) => (mod.default ?? mod.app) as (req: unknown, res: unknown) => unknown
    );
  }
  return appPromise;
}

export default async function handler(req: unknown, res: unknown) {
  const app = await getApp();
  return app(req, res);
}
