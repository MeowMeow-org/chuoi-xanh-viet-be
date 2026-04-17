import { fetchAnchorReceipt } from '~/lib/blockchain'
import prisma from '~/lib/prisma'

const POLL_INTERVAL_MS = 60_000 // 60s / lần

let intervalHandle: NodeJS.Timeout | null = null
let isRunning = false

async function tick() {
  if (isRunning) return
  isRunning = true
  try {
    const pendings = await prisma.season_anchors.findMany({
      where: {
        status: 'pending',
        chain_network: 'sepolia',
        tx_hash: { not: null }
      },
      select: {
        id: true,
        tx_hash: true,
        anchor_meta: true
      },
      take: 20
    })

    if (pendings.length === 0) return

    for (const row of pendings) {
      if (!row.tx_hash) continue

      const receipt = await fetchAnchorReceipt(row.tx_hash as `0x${string}`)
      if (receipt == null) continue // chưa mine, để lần sau

      const blockNumber = typeof receipt.blockNumber === 'bigint' ? Number(receipt.blockNumber) : receipt.blockNumber
      const nextMeta = {
        ...((row.anchor_meta as Record<string, unknown> | null) ?? {}),
        confirmedAt: new Date().toISOString(),
        blockNumber,
        blockHash: receipt.blockHash,
        gasUsed: receipt.gasUsed?.toString() ?? null
      }

      if (receipt.status === 'success') {
        await prisma.season_anchors.update({
          where: { id: row.id },
          data: {
            status: 'anchored',
            anchor_meta: nextMeta
          }
        })
        console.log(`[anchor-worker] ✓ confirmed ${row.id} block=${blockNumber}`)
      } else {
        await prisma.season_anchors.update({
          where: { id: row.id },
          data: {
            status: 'failed',
            anchor_meta: { ...nextMeta, failureReason: 'tx_reverted' }
          }
        })
        console.warn(`[anchor-worker] ✗ reverted ${row.id}`)
      }
    }
  } catch (err) {
    console.error('[anchor-worker] tick error:', err)
  } finally {
    isRunning = false
  }
}

/**
 * Bật worker polling xác nhận tx. Worker KHÔNG block server startup —
 * tick chạy lần đầu sau POLL_INTERVAL_MS.
 */
export function startAnchorWorker() {
  if (intervalHandle != null) return
  console.log('[anchor-worker] started (interval =', POLL_INTERVAL_MS, 'ms)')
  intervalHandle = setInterval(() => {
    void tick()
  }, POLL_INTERVAL_MS)
  // Tick ngay lần đầu sau 5s để xử lý tx đang chờ lúc boot
  setTimeout(() => void tick(), 5_000)
}

export function stopAnchorWorker() {
  if (intervalHandle != null) {
    clearInterval(intervalHandle)
    intervalHandle = null
  }
}
