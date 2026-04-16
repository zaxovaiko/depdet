import { z } from 'zod'

export const schema = z.object({
  email: z.string().email(),
  website: z.string().url(),
})

export type Schema = z.infer<typeof schema>
