FROM node:22-alpine
WORKDIR /repo
RUN corepack enable
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml .npmrc ./
COPY apps/chain-runner/package.json apps/chain-runner/
COPY apps/web/package.json apps/web/
RUN pnpm install --frozen-lockfile --filter @moya/chain-runner --prod
COPY apps/chain-runner/src apps/chain-runner/src
COPY contracts/aiken-contracts/plutus.json contracts/aiken-contracts/plutus.json
WORKDIR /repo/apps/chain-runner
EXPOSE 5071
CMD ["node", "src/index.js"]
