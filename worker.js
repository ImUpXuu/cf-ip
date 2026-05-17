const CORS = true
const BASE_URL = '/ipapi'
const TOKEN_ENABLED = false
const TOKEN = 'your-token-here'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
}

function verifyToken(url) {
  if (!TOKEN_ENABLED) return true
  const token = url.searchParams.get('token')
  return token === TOKEN
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url)
    const path = url.pathname

    if (CORS && request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    if (!verifyToken(url)) {
      return jsonResponse({ error: 'Invalid token' }, 401)
    }

    if (path === BASE_URL || path === BASE_URL + '/') {
      const clientIP = request.headers.get('CF-Connecting-IP')
      const cf = request.cf
      const info = {
        ip: clientIP,
        ...cf,
      }
      return jsonResponse(info)
    }

    if (path === BASE_URL + '/ip') {
      const queryIP = url.searchParams.get('ip')
      if (!queryIP) {
        return jsonResponse({ error: 'Missing ip parameter' }, 400)
      }
      const selfReq = new Request(request.url, {
        headers: { 'CF-Connecting-IP': queryIP },
        method: 'GET',
      })
      selfReq.cf = {}
      const selfRes = await fetch(selfReq)
      const data = await selfRes.json()
      return jsonResponse(data)
    }

    return jsonResponse({ error: 'Not Found' }, 404)
  },
}

function jsonResponse(data, status = 200) {
  const headers = {
    'Content-Type': 'application/json',
  }
  if (CORS) {
    Object.assign(headers, corsHeaders)
  }
  return new Response(JSON.stringify(data, null, 2), { status, headers })
}
