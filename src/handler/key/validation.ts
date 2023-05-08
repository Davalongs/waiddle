import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'

export const NewKeyValidator = zValidator(
    'json',
    z.object({
        token: z.string()
    }),
)