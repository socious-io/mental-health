// Moya chain-runner — internal escrow executor. Called ONLY by moya-api over
// the docker network with a shared secret. Holds platform custodial keys;
// users and orgs never touch wallets (Moya is a web2 app).
const { serve } = require('@hono/node-server');
const { Hono } = require('hono');
const { initiate, bind, release, fund, walletAddressOffline, orgWalletInfo, escrowAddress, NETWORK } = require('./escrow.js');

const app = new Hono();
const SECRET = process.env.CHAIN_RUNNER_SECRET || '';

app.use('*', async (c, next) => {
  if (c.req.path === '/ping') return next();
  if (!SECRET || c.req.header('x-internal-secret') !== SECRET) {
    return c.json({ error: 'unauthorized' }, 401);
  }
  return next();
});

app.get('/ping', (c) =>
  c.json({ message: 'pong', service: 'moya-chain-runner', network: NETWORK, escrow_address: safe(escrowAddress) }),
);

const safe = (fn) => { try { return fn(); } catch { return null; } };

app.post('/wallets/new', async (c) => {
  const { user_id } = await c.req.json();
  if (!user_id) return c.json({ error: 'user_id required' }, 400);
  const address = await walletAddressOffline(`users/${user_id}`);
  return c.json({ address });
});

const orgWalletHandler = async (c) => {
  try {
    return c.json(await orgWalletInfo());
  } catch (e) {
    console.error('org wallet:', e);
    return c.json({ error: String(e.message || e) }, 502);
  }
};
app.get('/wallets/org', orgWalletHandler);
app.post('/wallets/org', orgWalletHandler);

app.post('/wallets/fund', async (c) => {
  try {
    const body = await c.req.json();
    return c.json(await fund(body));
  } catch (e) {
    console.error('fund:', e);
    return c.json({ error: String(e.message || e) }, 502);
  }
});

app.post('/escrow/initiate', async (c) => {
  try {
    const body = await c.req.json();
    return c.json(await initiate(body));
  } catch (e) {
    console.error('initiate:', e);
    return c.json({ error: String(e.message || e) }, 502);
  }
});

app.post('/escrow/bind', async (c) => {
  try {
    const body = await c.req.json();
    return c.json(await bind(body));
  } catch (e) {
    console.error('bind:', e);
    return c.json({ error: String(e.message || e) }, 502);
  }
});

app.post('/escrow/release', async (c) => {
  try {
    const body = await c.req.json();
    return c.json(await release(body));
  } catch (e) {
    console.error('release:', e);
    return c.json({ error: String(e.message || e) }, 502);
  }
});

const port = Number(process.env.PORT || 5071);
console.log(`moya-chain-runner :${port} network=${NETWORK}`);
serve({ fetch: app.fetch, port });
