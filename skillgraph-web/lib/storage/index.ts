/**
 * lib/storage — private file storage for user documents (résumés, application proofs).
 *
 * Files are never written under public/. Each stored file is identified by a
 * reference string kept in the database:
 *
 *   cloudinary:<public_id>   Cloudinary "authenticated" raw asset, served via short-lived signed URLs
 *   local:<folder>/<name>    Development fallback when Cloudinary is not configured (.data/uploads)
 *
 * Legacy values written before ADR-001 Phase 1 are still readable:
 *   https://…                public URL — redirected to as before
 *   /resumes/…, /proofs/…    old files under public/ (dev machines only)
 */
import path from 'path'
import { promises as fs } from 'fs'
import { v2 as cloudinary } from 'cloudinary'

const CLOUDINARY_PREFIX = 'cloudinary:'
const LOCAL_PREFIX = 'local:'
const LOCAL_ROOT = path.join(process.cwd(), '.data', 'uploads')
const ROOT_FOLDER = 'skillgraph/private'
const DEFAULT_TTL_SEC = 300

export type StorageFolder = 'resumes' | 'proofs'

export type FileAccess =
  | { kind: 'redirect'; url: string }
  | { kind: 'buffer'; data: Uint8Array; contentType: string }

function cloudinaryConfigured(): boolean {
  return Boolean(
    process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET
  )
}

let configured = false
function ensureCloudinary() {
  if (configured) return
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  })
  configured = true
}

/** Rejects path separators and traversal so callers can't escape their folder. */
function safeName(filename: string): string {
  if (!/^[\w.-]+$/.test(filename) || filename.startsWith('.')) throw new Error(`Invalid file name: ${filename}`)
  return filename
}

function contentTypeFor(name: string): string {
  const ext = path.extname(name).toLowerCase()
  if (ext === '.pdf') return 'application/pdf'
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg'
  if (ext === '.png') return 'image/png'
  return 'application/octet-stream'
}

/** Stores a file privately and returns the reference to persist in the database. */
export async function putPrivateFile(folder: StorageFolder, filename: string, data: Uint8Array): Promise<string> {
  const name = safeName(filename)

  if (cloudinaryConfigured()) {
    ensureCloudinary()
    const result = await new Promise<{ public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            resource_type: 'raw',
            type: 'authenticated',
            folder: `${ROOT_FOLDER}/${folder}`,
            public_id: name, // raw assets keep their extension in the public_id
            overwrite: false,
          },
          (err, res) => (err || !res ? reject(err ?? new Error('empty upload result')) : resolve(res))
        )
        .end(Buffer.from(data))
    })
    return `${CLOUDINARY_PREFIX}${result.public_id}`
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Cloudinary is not configured; refusing to store user files on local disk in production')
  }
  const dir = path.join(LOCAL_ROOT, folder)
  await fs.mkdir(dir, { recursive: true })
  await fs.writeFile(path.join(dir, name), data)
  return `${LOCAL_PREFIX}${folder}/${name}`
}

/**
 * Resolves a stored reference into something a route handler can return.
 * Returns null when the file cannot be found. Callers must authorise access first.
 */
export async function getFileAccess(ref: string, ttlSec = DEFAULT_TTL_SEC): Promise<FileAccess | null> {
  if (ref.startsWith(CLOUDINARY_PREFIX)) {
    if (!cloudinaryConfigured()) return null
    ensureCloudinary()
    const publicId = ref.slice(CLOUDINARY_PREFIX.length)
    const url = cloudinary.utils.private_download_url(publicId, '', {
      resource_type: 'raw',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + ttlSec,
    })
    return { kind: 'redirect', url }
  }

  if (ref.startsWith(LOCAL_PREFIX)) {
    const [folder, name] = ref.slice(LOCAL_PREFIX.length).split('/')
    return readLocal(path.join(LOCAL_ROOT, folder, safeName(name)))
  }

  if (/^https:\/\//.test(ref)) return { kind: 'redirect', url: ref }

  const legacy = ref.match(/^\/(resumes|proofs)\/([\w.-]+)$/)
  if (legacy) return readLocal(path.join(process.cwd(), 'public', legacy[1], safeName(legacy[2])))

  return null
}

/** The bytes of a stored file, for server-side processing (e.g. re-reading an uploaded résumé). */
export async function readPrivateFile(ref: string): Promise<Uint8Array | null> {
  const access = await getFileAccess(ref, 60)
  if (!access) return null
  if (access.kind === 'buffer') return access.data
  // Only Cloudinary assets are fetched server-side, never arbitrary URLs: private ones, or
  // legacy public uploads (pre-ADR-001) on Cloudinary's delivery host
  if (!ref.startsWith(CLOUDINARY_PREFIX) && !isLegacyCloudinaryUrl(ref)) return null
  const res = await fetch(access.url, { signal: AbortSignal.timeout(15_000) })
  return res.ok ? new Uint8Array(await res.arrayBuffer()) : null
}

/**
 * Permanently deletes a stored file. Legacy public URLs are not managed by us and are skipped.
 * Returns false when the file could not be deleted (callers log and continue).
 */
export async function deletePrivateFile(ref: string): Promise<boolean> {
  try {
    if (ref.startsWith(CLOUDINARY_PREFIX)) {
      if (!cloudinaryConfigured()) return false
      ensureCloudinary()
      const res = await cloudinary.uploader.destroy(ref.slice(CLOUDINARY_PREFIX.length), {
        resource_type: 'raw',
        type: 'authenticated',
        invalidate: true,
      })
      return res.result === 'ok' || res.result === 'not found'
    }
    if (ref.startsWith(LOCAL_PREFIX)) {
      const [folder, name] = ref.slice(LOCAL_PREFIX.length).split('/')
      await fs.rm(path.join(LOCAL_ROOT, folder, safeName(name)), { force: true })
      return true
    }
    const legacy = ref.match(/^\/(resumes|proofs)\/([\w.-]+)$/)
    if (legacy) {
      await fs.rm(path.join(process.cwd(), 'public', legacy[1], safeName(legacy[2])), { force: true })
      return true
    }
    return false
  } catch {
    return false
  }
}

function isLegacyCloudinaryUrl(ref: string) {
  try {
    const url = new URL(ref)
    return url.protocol === 'https:' && url.hostname === 'res.cloudinary.com'
  } catch {
    return false
  }
}

async function readLocal(filePath: string): Promise<FileAccess | null> {
  try {
    const data = await fs.readFile(filePath)
    return { kind: 'buffer', data: new Uint8Array(data), contentType: contentTypeFor(filePath) }
  } catch {
    return null
  }
}

/** Builds the HTTP response for a resolved file. */
export function fileResponse(access: FileAccess, downloadName: string): Response {
  if (access.kind === 'redirect') {
    return new Response(null, { status: 302, headers: { Location: access.url, 'Cache-Control': 'no-store' } })
  }
  return new Response(access.data as BodyInit, {
    status: 200,
    headers: {
      'Content-Type': access.contentType,
      'Content-Disposition': `attachment; filename="${safeName(downloadName)}"`,
      'Content-Length': String(access.data.length),
      'Cache-Control': 'private, no-store',
    },
  })
}
