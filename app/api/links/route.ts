import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL!
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN!
const AUTH_TOKEN = process.env.FOOL_AUTH_TOKEN ?? ''
const HASH_KEY = 'vault:links'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET,POST,DELETE,OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type,x-fool-auth',
}

async function redisCmd(command: any[]) {
  const res = await fetch(REDIS_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  })
  return res.json()
}

function checkAuth(req: NextRequest) {
  return req.headers.get('x-fool-auth') === AUTH_TOKEN
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: CORS })
}

export async function GET(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  const result = await redisCmd(['HGETALL', HASH_KEY])
  const raw: string[] = result.result || []
  const links = []
  for (let i = 0; i < raw.length; i += 2) {
    try { links.push(JSON.parse(raw[i + 1])) } catch {}
  }
  return NextResponse.json(links, { headers: CORS })
}

export async function POST(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  const body = await req.json()
  const links: any[] = body.links || []
  for (const link of links) {
    await redisCmd(['HSET', HASH_KEY, link.linkCode, JSON.stringify(link)])
  }
  return NextResponse.json({ added: links.length }, { headers: CORS })
}

export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401, headers: CORS })
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400, headers: CORS })
  await redisCmd(['HDEL', HASH_KEY, id])
  return NextResponse.json({ deleted: id }, { headers: CORS })
}
