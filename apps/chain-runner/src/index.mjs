// Moya chain-runner — thin internal wrapper around the Socious escrow
// (contracts/aiken-contracts MeshEscrowContract). Called ONLY by moya-api
// over the internal docker network with a shared secret. Users and orgs
// never touch wallets: Moya is a web2 app; this service holds platform
// custodial keys and executes lock / bind / release / refund on Cardano.
//
// M3 wiring lands here (Mesh + Blockfrost + aiken-contracts off-chain).
// Until then every endpoint returns 501 so the deploy pipeline, health
// checks, and api integration can be built and tested end to end.
import { serve } from '@hono/node-server';
import { Hono } from 'hono';

const app = new Hono();
const SECRET = process.env.CHAIN_RUNNER_SECRET || '';

app.use('*', async (c, next) => {
  if (c.req.path === '/ping') return next();
  if (!SECRET || c.req.header('x-internal-secret') !== SECRET) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  return next();
});

app.get('/ping', (c) => c.json({ message: 'pong', service: 'moya-chain-runner' }));

for (const route of ['/wallets/new', '/escrow/initiate', '/escrow/bind', '/escrow/release', '/escrow/refund']) {
  app.post(route, (c) => c.json({ error: 'not implemented until Milestone 3 wiring' }, 501));
}

const port = Number(process.env.PORT || 5071);
console.log(`moya-chain-runner listening on :${port}`);
serve({ fetch: app.fetch, port });
