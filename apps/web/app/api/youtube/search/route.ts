import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");
  const relatedToVideoId = searchParams.get("relatedToVideoId");
  const maxResults = searchParams.get("maxResults") || "12";
  const API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  
  if (!API_KEY) {
    return NextResponse.json(
      { error: "YouTube API key not configured" },
      { status: 500 }
    );
  }

  try {
    let url = "https://www.googleapis.com/youtube/v3/search?part=snippet&type=video";
    
    // Either search by query or get related videos
    if (relatedToVideoId) {
      url += `&relatedToVideoId=${relatedToVideoId}`;
    } else if (query) {
      url += `&q=${encodeURIComponent(query)}`;
    } else {
      return NextResponse.json(
        { error: "Either query or relatedToVideoId parameter is required" },
        { status: 400 }
      );
    }
    
    // Add remaining parameters
    url += `&maxResults=${maxResults}&key=${API_KEY}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: "YouTube API error", details: errorData },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("YouTube search API error:", error);
    return NextResponse.json(
      { error: "Failed to fetch from YouTube API" },
      { status: 500 }
    );
  }
}