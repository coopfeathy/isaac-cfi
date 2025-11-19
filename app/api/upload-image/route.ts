import { writeFile } from 'fs/promises'
import { join } from 'path'
import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: 'No file provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Create a unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
    
    // Convert file to buffer
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Save to public/blog-images directory
    const filePath = join(process.cwd(), 'public', 'blog-images', filename)
    await writeFile(filePath, buffer)

    // Return the public URL
    const publicUrl = `/blog-images/${filename}`
    
    return new Response(
      JSON.stringify({ success: true, url: publicUrl }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error: any) {
    console.error('Error uploading image:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
