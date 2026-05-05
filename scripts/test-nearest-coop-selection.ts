import assert from 'node:assert/strict'
import {
  rankCooperativeCandidates,
  type CoopReviewerCandidate
} from '~/modules/certificate/certificate.reviewer'

function d(day: number) {
  return new Date(Date.UTC(2026, 0, day))
}

function run() {
  const base: CoopReviewerCandidate[] = [
    {
      cooperativeUserId: 'coop-a',
      matchScore: 10,
      distanceKm: 12.5,
      createdAt: d(1)
    },
    {
      cooperativeUserId: 'coop-b',
      matchScore: 60,
      distanceKm: 20,
      createdAt: d(2)
    },
    {
      cooperativeUserId: 'coop-c',
      matchScore: 60,
      distanceKm: 5,
      createdAt: d(3)
    }
  ]

  const ranked = rankCooperativeCandidates(base)
  assert.equal(ranked[0].cooperativeUserId, 'coop-c')

  const noDistance: CoopReviewerCandidate[] = [
    {
      cooperativeUserId: 'coop-old',
      matchScore: 25,
      distanceKm: null,
      createdAt: d(1)
    },
    {
      cooperativeUserId: 'coop-new',
      matchScore: 25,
      distanceKm: null,
      createdAt: d(2)
    }
  ]
  const rankedNoDistance = rankCooperativeCandidates(noDistance)
  assert.equal(rankedNoDistance[0].cooperativeUserId, 'coop-old')

  console.log('OK: nearest cooperative ranking rules pass')
}

run()
