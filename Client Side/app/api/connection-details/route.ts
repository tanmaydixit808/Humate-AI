import { AccessToken, AccessTokenOptions, VideoGrant } from "livekit-server-sdk";
import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";


const API_KEY = process.env.LIVEKIT_API_KEY;
const API_SECRET = process.env.LIVEKIT_API_SECRET;
const LIVEKIT_URL = process.env.LIVEKIT_URL;

export type ConnectionDetails = {
  serverUrl: string;
  roomName: string;
  participantName: string;
  participantToken: string;
};

export async function GET(request: Request) {
  // Validate environment variables first
  if (!API_KEY || !API_SECRET || !LIVEKIT_URL) {
    console.error("Missing required environment variables", {
      hasApiKey: !!API_KEY,
      hasApiSecret: !!API_SECRET,
      hasLivekitUrl: !!LIVEKIT_URL
    });
    return new NextResponse(
      "Server configuration error - missing environment variables",
      { status: 500 }
    );
  }

  try {
    // Parse and validate URL parameters
    const { searchParams } = new URL(request.url);
    const roomName = searchParams.get('roomName')?.trim() || 
      `voice_assistant_room_${Date.now()}_${Math.round(Math.random() * 1000)}`;
    const participantIdentity = searchParams.get('participantIdentity')?.trim() || 
      `voice_assistant_user_${Date.now()}_${Math.round(Math.random() * 1000)}`;

    // Validate room name and participant identity
    if (roomName.length < 1 || participantIdentity.length < 1) {
      return new NextResponse(
        "Invalid room name or participant identity",
        { status: 400 }
      );
    }

    // Create participant token with retry logic
    let participantToken: string | null = null;
    let retryCount = 0;
    const maxRetries = 3;

    while (!participantToken && retryCount < maxRetries) {
      try {
        participantToken = await createParticipantToken(
          { 
            identity: participantIdentity,
            name: participantIdentity,
            metadata: JSON.stringify({
              createdAt: new Date().toISOString(),
              connectionAttempt: retryCount + 1
            })
          },
          roomName
        );
      } catch (tokenError) {
        console.error(`Token creation attempt ${retryCount + 1} failed:`, tokenError);
        retryCount++;
        if (retryCount === maxRetries) {
          throw new Error("Failed to create participant token after multiple attempts");
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      }
    }

    if (!participantToken) {
      throw new Error("Failed to generate participant token");
    }

    const data: ConnectionDetails = {
      serverUrl: LIVEKIT_URL,
      roomName: roomName,
      participantToken: participantToken,
      participantName: participantIdentity,
    };

    const headers = new Headers({
      'X-Room-Name': roomName,
      'X-Participant-Identity': participantIdentity,
    });

    return NextResponse.json(data, { 
      headers,
      status: 200 
    });

  } catch (error) {
    console.error("LiveKit connection error:", error);
    const errorMessage = error instanceof Error ? 
      error.message : 
      "An unexpected error occurred while setting up the LiveKit connection";
    
    return new NextResponse(errorMessage, { 
      status: 500,
      headers: {
        'X-Error-Type': 'LiveKitConnectionError',
        'X-Error-Time': new Date().toISOString()
      }
    });
  }
}

async function createParticipantToken(
  userInfo: AccessTokenOptions,
  roomName: string
): Promise<string> {
  if (!API_KEY || !API_SECRET) {
    throw new Error("Missing API credentials");
  }

  const at = new AccessToken(API_KEY, API_SECRET, userInfo);
  
  at.ttl = "30m";
  
  const grant: VideoGrant = {
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
  };
  
  at.addGrant(grant);
  
  const token = await at.toJwt();
  if (!token) {
    throw new Error("Failed to generate JWT token");
  }
  
  return token;
}