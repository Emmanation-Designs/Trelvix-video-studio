import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let appPromise: any = null;

export default async function handler(req: any, res: any) {
  if (!appPromise) {
    const { createExpressApp } = require('../dist/server.cjs');
    appPromise = createExpressApp();
  }
  const app = await appPromise;
  return app(req, res);
}

