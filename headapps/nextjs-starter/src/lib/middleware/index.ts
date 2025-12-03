import { NextResponse } from 'next/server';
import type { NextFetchEvent, NextRequest } from 'next/server';
import { debug } from '@sitecore-jss/sitecore-jss-nextjs/middleware';

// ✅ Explicitly import known safe plugins instead of dynamic Object.values()
import { multisitePlugin, personalizePlugin, redirectsPlugin } from 'temp/middleware-plugins';
//import pluginB from 'temp/middleware-plugins/pluginB';
// Add more plugins as needed
/*

export { multisitePlugin } from 'src/lib/middleware/plugins/multisite';
export { personalizePlugin } from 'src/lib/middleware/plugins/personalize';
export { redirectsPlugin } from 'src/lib/middleware/plugins/redirects';

*/

export interface MiddlewarePlugin {
  order: number;
  exec(req: NextRequest, res?: NextResponse, ev?: NextFetchEvent): Promise<NextResponse>;
}

// ✅ Whitelist of allowed plugins
const allowedPlugins: MiddlewarePlugin[] = [multisitePlugin, personalizePlugin, redirectsPlugin];

// ✅ Validate plugin structure and sanitize order
const validatedPlugins = allowedPlugins.filter(
  (plugin) =>
    plugin &&
    typeof plugin.order === 'number' &&
    Number.isInteger(plugin.order) &&
    typeof plugin.exec === 'function'
);

export default async function middleware(
  req: NextRequest,
  ev: NextFetchEvent
): Promise<NextResponse> {
  const response = NextResponse.next();

  debug.common('next middleware start');

  const start = Date.now();

  // ✅ Sort plugins safely
  const sortedPlugins = [...validatedPlugins].sort((p1, p2) => p1.order - p2.order);

  // ✅ Execute plugins in sequence
  const finalRes = await sortedPlugins.reduce(
    (promiseChain, plugin) =>
      promiseChain.then((res) => {
        try {
          return plugin.exec(req, res, ev);
        } catch (err) {
          console.error(`Plugin execution failed: ${err}`);
          return res; // fallback to previous response
        }
      }),
    Promise.resolve(response)
  );

  debug.common('next middleware end in %dms', Date.now() - start);
  return finalRes;
}
