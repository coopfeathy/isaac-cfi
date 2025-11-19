import { writeFile } from 'fs/promises'
import { join } from 'path'

export async function POST(req: Request) {
  try {
    const { slug, content } = await req.json()

    if (!slug || !content) {
      return new Response(
        JSON.stringify({ error: 'Missing slug or content' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Write the blog post file
    const filePath = join(process.cwd(), 'app', 'blog', `${slug}.md`)
    await writeFile(filePath, content, 'utf-8')

    return new Response(
      JSON.stringify({ success: true, slug }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error creating blog post:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
