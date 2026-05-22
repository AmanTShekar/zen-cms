import { defineCollection } from 'sanity';
import { z } from 'zod';

export const sites = defineCollection({
  name: 'site',
  title: 'Site',
  type: 'document',
  schema: z.object({
    _id: z.string().optional(),
    name: z.string().min(1),
    slug: z.string().min(1),
    domain: z.string().optional(),
    tenantId: z.string().min(1), // maps to X-Zenith-Site-Id header
  }),
});
