import prisma from '~/lib/prisma'

async function run() {
  const days = Number(process.argv[2] ?? process.env.AUDIT_LOG_RETENTION_DAYS ?? 180)
  if (!Number.isFinite(days) || days < 1) {
    throw new Error('Retention days must be a positive number')
  }
  const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000)
  const result = await prisma.audit_logs.deleteMany({
    where: { created_at: { lt: cutoff } }
  })
  console.log(
    `[audit-cleanup] deleted=${result.count} cutoff=${cutoff.toISOString()} retentionDays=${days}`
  )
}

run()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
