export type CoopReviewerCandidate = {
  cooperativeUserId: string
  createdAt: Date
  matchScore: number
  distanceKm: number | null
}

export function rankCooperativeCandidates(
  candidates: CoopReviewerCandidate[]
): CoopReviewerCandidate[] {
  return [...candidates].sort((a, b) => {
    if (b.matchScore !== a.matchScore) return b.matchScore - a.matchScore
    const aHasDistance = a.distanceKm != null
    const bHasDistance = b.distanceKm != null
    if (aHasDistance !== bHasDistance) return aHasDistance ? -1 : 1
    if (a.distanceKm != null && b.distanceKm != null && a.distanceKm !== b.distanceKm) {
      return a.distanceKm - b.distanceKm
    }
    return a.createdAt.getTime() - b.createdAt.getTime()
  })
}
