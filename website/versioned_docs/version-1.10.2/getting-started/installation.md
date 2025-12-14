---
sidebar_position: 1
---

# Installation

Get started with jslog in seconds!

## NPM

```bash
npm install @omdxp/jslog
```

## Yarn

```bash
yarn add @omdxp/jslog
```

## PNPM

```bash
pnpm add @omdxp/jslog
```

## Bun

```bash
bun add @omdxp/jslog
```

## Requirements

- **Node.js**: 18.0.0 or higher
- **TypeScript**: 5.0+ (optional, but recommended)

## Verify Installation

Create a simple test file to verify your installation:

```typescript title="test.ts"
import { info, String } from '@omdxp/jslog';

info('Installation successful!', String('version', '1.0.0'));
```

Run it:

```bash
npx tsx test.ts
# or
node test.js
```

You should see output like:

```
time=2024-01-01T00:00:00.000Z level=INFO msg="Installation successful!" version="1.0.0"
```

## Next Steps

- **[Quick Start](./quick-start)** - Your first jslog application
- **[Configuration](./configuration)** - Configure jslog for your needs
