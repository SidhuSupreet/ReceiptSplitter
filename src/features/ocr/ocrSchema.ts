import { z } from 'zod'

export const ocrItemSchema = z.object({
  name: z.string(),
  priceCents: z.number().int().nonnegative(),
  quantity: z.number().int().positive().default(1),
})

export const ocrSuccessSchema = z.object({
  items: z.array(ocrItemSchema),
  taxCents: z.number().int().nonnegative().default(0),
  tipCents: z.number().int().nonnegative().default(0),
})

export const ocrUnparseableSchema = z.object({
  error: z.literal('unparseable'),
})

export const ocrErrorSchema = z.object({
  error: z.string(),
})

export const ocrResponseSchema = z.union([
  ocrSuccessSchema,
  ocrUnparseableSchema,
  ocrErrorSchema,
])

export type OcrItem = z.infer<typeof ocrItemSchema>
export type OcrSuccess = z.infer<typeof ocrSuccessSchema>
export type OcrResponse = z.infer<typeof ocrResponseSchema>
