/**
 * Zalo Official Account — lấy access token (v4) và gửi tin nhắn text tới user đã quan tâm OA.
 * @see https://developers.zalo.me/docs/api/official-account-api/
 */

function envFlag(name: string): boolean {
  const v = process.env[name]
  return v === '1' || v?.toLowerCase() === 'true' || v?.toLowerCase() === 'yes'
}

export function isZaloOaConfigured(): boolean {
  return (
    envFlag('ZALO_OA_ENABLED') &&
    Boolean(process.env.ZALO_OA_APP_ID?.trim()) &&
    Boolean(process.env.ZALO_OA_APP_SECRET?.trim()) &&
    Boolean(process.env.ZALO_OA_REFRESH_TOKEN?.trim())
  )
}

type TokenCache = { accessToken: string; expiresAtMs: number }

let tokenCache: TokenCache | null = null

async function fetchOaAccessToken(): Promise<string> {
  const appId = process.env.ZALO_OA_APP_ID?.trim()
  const secret = process.env.ZALO_OA_APP_SECRET?.trim()
  const refresh = process.env.ZALO_OA_REFRESH_TOKEN?.trim()
  if (!appId || !secret || !refresh) {
    throw new Error('Zalo OA: missing ZALO_OA_APP_ID / ZALO_OA_APP_SECRET / ZALO_OA_REFRESH_TOKEN')
  }

  const body = new URLSearchParams({
    app_id: appId,
    refresh_token: refresh,
    grant_type: 'refresh_token'
  })

  const res = await fetch('https://oauth.zaloapp.com/v4/oa/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      secret_key: secret
    },
    body
  })

  const json = (await res.json()) as {
    access_token?: string
    expires_in?: string | number
    error?: string | number
    message?: string
  }

  if (!res.ok || !json.access_token) {
    tokenCache = null
    throw new Error(`Zalo OA token failed: ${JSON.stringify(json)}`)
  }

  const expiresInSec =
    typeof json.expires_in === 'number'
      ? json.expires_in
      : typeof json.expires_in === 'string'
        ? parseInt(json.expires_in, 10)
        : 90000

  const safeSec = Number.isFinite(expiresInSec) ? expiresInSec : 90000
  // làm mới sớm 120s trước khi hết hạn
  tokenCache = {
    accessToken: json.access_token,
    expiresAtMs: Date.now() + Math.max(60, safeSec - 120) * 1000
  }

  return json.access_token
}

async function getOaAccessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAtMs > Date.now()) {
    return tokenCache.accessToken
  }
  return fetchOaAccessToken()
}

const MAX_TEXT = 2000

/**
 * Gửi tin nhắn text OA tới một Zalo user_id (user đã tương tác / quan tâm OA).
 */
export async function sendZaloOaTextMessage(zaloUserId: string, text: string): Promise<void> {
  if (!isZaloOaConfigured()) return

  const uid = zaloUserId.trim()
  if (!uid) return

  const access_token = await getOaAccessToken()
  const safeText = text.trim().slice(0, MAX_TEXT)

  const url = new URL('https://openapi.zalo.me/v3.0/oa/message/cs')
  url.searchParams.set('access_token', access_token)

  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { user_id: uid },
      message: { text: safeText }
    })
  })

  const json = (await res.json()) as { error?: number; message?: string; data?: unknown }

  // Zalo: error === 0 là thành công
  if (!res.ok || (typeof json.error === 'number' && json.error !== 0)) {
    throw new Error(`Zalo OA message failed: ${JSON.stringify(json)}`)
  }
}
