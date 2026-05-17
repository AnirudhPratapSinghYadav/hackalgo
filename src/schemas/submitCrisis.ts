import { z } from 'zod'

export const submitCrisisSchema = z.object({
  title: z.string().min(10, 'Title must be at least 10 characters').max(120),
  description: z.string().min(50, 'Provide enough detail for verifiers (50+ characters)').max(5000),
  category: z.enum(['medical', 'housing', 'disaster', 'education', 'other']),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  requiredAmount: z.number().min(1, 'Minimum 1 USDC').max(10_000_000),
  beneficiaryWallet: z.string().min(10, 'Enter a valid Algorand wallet address'),
})

export type SubmitCrisisForm = z.infer<typeof submitCrisisSchema>
