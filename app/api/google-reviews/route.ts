import { NextResponse } from 'next/server'

type GooglePlacesReview = {
  rating?: number
  relativePublishTimeDescription?: string
  text?: { text?: string }
  authorAttribution?: {
    displayName?: string
    uri?: string
    photoUri?: string
  }
}

export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY
    const placeId = process.env.GOOGLE_PLACE_ID

    if (!apiKey || !placeId) {
      return NextResponse.json(
        { error: 'Google Reviews is not configured' },
        { status: 503 }
      )
    }

    const response = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
      headers: {
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'displayName,rating,userRatingCount,reviews',
      },
      next: { revalidate: 600 },
    })

    const data = await response.json().catch(() => ({}))

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message || 'Failed to fetch Google reviews' },
        { status: 502 }
      )
    }

    const reviews = (data.reviews || [])
      .slice(0, 6)
      .map((review: GooglePlacesReview) => ({
        authorName: review.authorAttribution?.displayName || 'Google User',
        authorUrl: review.authorAttribution?.uri || null,
        authorPhotoUrl: review.authorAttribution?.photoUri || null,
        rating: review.rating || 0,
        relativeTime: review.relativePublishTimeDescription || '',
        text: review.text?.text || '',
      }))

    return NextResponse.json({
      placeName: data.displayName?.text || 'Merlin Flight Training',
      rating: data.rating || 0,
      userRatingCount: data.userRatingCount || 0,
      reviews,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unexpected error fetching Google reviews' },
      { status: 500 }
    )
  }
}
