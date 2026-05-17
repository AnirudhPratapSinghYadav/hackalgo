import type { CrisisCategory } from '../types/crisis'

/** One image per category — no rotation; must match the notice type. */
const CATEGORY_IMAGE: Record<CrisisCategory, string> = {
  medical: '/images/woman-aid-form.jpg',
  housing: '/images/disaster/relief-camp.jpg',
  disaster: '/images/flood-family-india.jpg',
  education: '/images/rural-mobile-india.jpg',
  other: '/images/field-assessment.jpg',
}

const KEYWORD_CATEGORY: { keywords: string[]; category: CrisisCategory }[] = [
  { keywords: ['flood', 'cyclone', 'earthquake', 'landslide', 'storm', 'disaster', 'relief', 'drought'], category: 'disaster' },
  { keywords: ['medical', 'hospital', 'health', 'injury', 'medicine', 'surgery'], category: 'medical' },
  { keywords: ['house', 'shelter', 'home', 'housing', 'roof', 'evict'], category: 'housing' },
  { keywords: ['school', 'education', 'student', 'tuition', 'exam'], category: 'education' },
]

export function inferCategoryFromText(title: string, description = ''): CrisisCategory {
  const blob = `${title} ${description}`.toLowerCase()
  for (const { keywords, category } of KEYWORD_CATEGORY) {
    if (keywords.some((k) => blob.includes(k))) return category
  }
  return 'other'
}

export function getCrisisImage(category: CrisisCategory): string {
  return CATEGORY_IMAGE[category]
}

export function getCrisisImages(category: CrisisCategory): string[] {
  return [getCrisisImage(category)]
}

/** Ops/community feed: category-locked hero — ignores unrelated uploaded URLs. */
export function resolveAppealHeroImage(input: {
  title: string
  description: string
  category?: CrisisCategory
  images?: string[]
}): string {
  const inferred = inferCategoryFromText(input.title, input.description)
  const category = input.category && input.category !== 'other' ? input.category : inferred
  const canonical = getCrisisImage(category)

  const first = input.images?.[0]
  if (!first || first.includes('placeholder') || first.includes('picsum') || first.includes('unsplash.com/random')) {
    return canonical
  }

  if (first.startsWith('/') && first.includes(category === 'disaster' ? 'flood' : category)) {
    return first
  }

  return canonical
}
