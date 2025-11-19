import { unlink } from 'fs/promises'
import { join } from 'path'

export async function POST(req: Request) {
  try {
    const { slug } = await req.json()

    if (!slug) {
      return new Response(
        JSON.stringify({ error: 'Missing slug' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Delete the blog post file
    const filePath = join(process.cwd(), 'app', 'blog', `${slug}.md`)
    await unlink(filePath)

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error deleting blog post:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
