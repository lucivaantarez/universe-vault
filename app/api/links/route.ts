import { NextRequest, NextResponse } from 'next/server'
import { Redis } from '@upstash/redis'

const redis = Redis.fromEnv()
const HASH_KEY = 'vault:links'
const AUTH_TOKEN = process.env.FOOL_AUTH_TOKEN!

function checkAuth(req: NextRequest) {
  return req.headers.get('x-fool-auth') === AUTH_TOKEN
}

// GET — return all links as array
export async function GET(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const data = await redis.hgetall(HASH_KEY)
  if (!data) return NextResponse.json([])
  const links = Object.values(data).map((v) =>
    typeof v === 'string' ? JSON.parse(v) : v
  )
  return NextResponse.json(links)
}

// POST — add new links (array)
export async function POST(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const body = await req.json()
  const links: any[] = body.links || []
  const pipeline = redis.pipeline()
  for (const link of links) {
    pipeline.hset(HASH_KEY, { [link.linkCode]: JSON.stringify(link) })
  }
  await pipeline.exec()
  return NextResponse.json({ added: links.length })
}

// DELETE — remove by linkCode
export async function DELETE(req: NextRequest) {
  if (!checkAuth(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(req.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  await redis.hdel(HASH_KEY, id)
  return NextResponse.json({ deleted: id })
}
