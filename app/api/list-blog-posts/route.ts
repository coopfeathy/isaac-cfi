import { readdir, readFile } from 'fs/promises'
import { join } from 'path'
import matter from 'gray-matter'

export async function GET() {
  try {
    const postsDirectory = join(process.cwd(), 'app', 'blog')
    const filenames = await readdir(postsDirectory)
    
    const posts = await Promise.all(
      filenames
        .filter(filename => filename.endsWith('.md'))
        .map(async filename => {
          const filePath = join(postsDirectory, filename)
          const fileContents = await readFile(filePath, 'utf8')
          const { data, content } = matter(fileContents)
          
          return {
            slug: filename.replace('.md', ''),
            title: data.title || 'Untitled',
            date: data.date || '',
            author: data.author || '',
            excerpt: data.excerpt || '',
            content: content
          }
        })
    )

    // Sort by date descending
    posts.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

    return new Response(
      JSON.stringify({ posts }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error listing blog posts:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
