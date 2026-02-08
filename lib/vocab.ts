export const CAR_VISIBILITY = ['PUBLIC', 'UNLISTED', 'PRIVATE'] as const
export type CarVisibility = (typeof CAR_VISIBILITY)[number]

export const BUILD_STATUS = ['IN_PROGRESS', 'TUV_READY', 'TRACK_READY', 'DAILY_READY'] as const
export type BuildStatus = (typeof BUILD_STATUS)[number]

export const ELEMENT_VISIBILITY = ['NONE', 'SELF', 'LINK', 'PUBLIC'] as const
export type ElementVisibility = (typeof ELEMENT_VISIBILITY)[number]

export const LOG_ENTRY_TYPE = ['MODIFICATION', 'MAINTENANCE', 'TRACK_DAY', 'DYNO'] as const
export type LogEntryType = (typeof LOG_ENTRY_TYPE)[number]

export const TUV_STATUS = ['GREEN_REGISTERED', 'YELLOW_ABE', 'RED_RACING'] as const
export type TuvStatus = (typeof TUV_STATUS)[number]

export const LISTING_CONDITION = ['NEW', 'LIKE_NEW', 'USED'] as const
export type ListingCondition = (typeof LISTING_CONDITION)[number]

export const LISTING_STATUS = ['ACTIVE', 'RESERVED', 'SOLD'] as const
export type ListingStatus = (typeof LISTING_STATUS)[number]

export const OFFER_STATUS = ['PENDING', 'ACCEPTED', 'DECLINED', 'CANCELLED'] as const
export type OfferStatus = (typeof OFFER_STATUS)[number]

export const EVENT_STATUS = ['UPCOMING', 'ACTIVE', 'PAST'] as const
export type EventStatus = (typeof EVENT_STATUS)[number]

export const TASK_STATUS = ['TODO', 'IN_PROGRESS', 'DONE'] as const
export type TaskStatus = (typeof TASK_STATUS)[number]

function normalizeString(input: unknown): string {
  return typeof input === 'string' ? input.trim().toUpperCase() : ''
}

function parseFromList<const T extends readonly string[]>(
  allowed: T,
  input: unknown
): T[number] | null {
  const v = normalizeString(input)
  // Casting is safe because we're comparing to the literal allowed list.
  return (allowed as readonly string[]).includes(v) ? (v as T[number]) : null
}

export function parseCarVisibility(input: unknown): CarVisibility | null {
  return parseFromList(CAR_VISIBILITY, input)
}

export function parseBuildStatus(input: unknown): BuildStatus | null {
  return parseFromList(BUILD_STATUS, input)
}

export function parseElementVisibility(input: unknown): ElementVisibility | null {
  return parseFromList(ELEMENT_VISIBILITY, input)
}

export function parseElementVisibilityOrDefault(
  input: unknown,
  defaultValue: ElementVisibility = 'SELF'
): ElementVisibility {
  return parseElementVisibility(input) ?? defaultValue
}

export function parseLogEntryType(input: unknown): LogEntryType | null {
  return parseFromList(LOG_ENTRY_TYPE, input)
}

export function parseTuvStatus(input: unknown): TuvStatus | null {
  return parseFromList(TUV_STATUS, input)
}

export function parseListingCondition(input: unknown): ListingCondition | null {
  return parseFromList(LISTING_CONDITION, input)
}

export function parseListingStatus(input: unknown): ListingStatus | null {
  return parseFromList(LISTING_STATUS, input)
}

export function parseOfferStatus(input: unknown): OfferStatus | null {
  return parseFromList(OFFER_STATUS, input)
}

export function parseEventStatus(input: unknown): EventStatus | null {
  return parseFromList(EVENT_STATUS, input)
}

export function parseTaskStatus(input: unknown): TaskStatus | null {
  return parseFromList(TASK_STATUS, input)
}
