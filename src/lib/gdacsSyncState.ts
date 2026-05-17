/** Shared GDACS fetch timing — avoids triple-fetch on bootstrap + Events mount + poll. */

let lastFetchAt = 0

export function markGdacsFetched(): void {
  lastFetchAt = Date.now()
}

export function getGdacsLastFetch(): number {
  return lastFetchAt
}

export function shouldSkipGdacsFetch(): boolean {
  return lastFetchAt > 0 && Date.now() - lastFetchAt < 120_000
}
