import assert from 'node:assert/strict'
import auditService from '~/modules/audit/audit.service'

function run() {
  const raw = {
    email: 'u@example.com',
    password: 'supersecret',
    refreshToken: 'token-123',
    nested: {
      authorization: 'Bearer abc',
      ok: true
    }
  }
  const sanitized = auditService.sanitize(raw) as Record<string, unknown>
  assert.equal(sanitized.password, '[redacted]')
  assert.equal(sanitized.refreshToken, '[redacted]')
  assert.deepEqual(sanitized.nested, { authorization: '[redacted]', ok: true })
  console.log('OK: audit sanitize redaction works')
}

run()
