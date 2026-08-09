import { getAll } from '@vercel/global-config';

export default {
  async fetch() {
    const flags = await getAll();
    return Response.json(flags, {
      headers: { 'cache-control': 'no-store' },
    });
  },
};
