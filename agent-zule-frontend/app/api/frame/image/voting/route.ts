import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user') || 'user123';
    const vote = searchParams.get('vote') || 'approve';

    const isApproved = vote === 'approve';
    const voteColor = isApproved ? '#22c55e' : '#ef4444';
    const voteIcon = isApproved ? '✅' : '❌';
    const communityConsensus = isApproved ? '85% Approve' : '65% Reject';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#0a0f1c',
            backgroundImage: 'linear-gradient(45deg, #0a0f1c 0%, #1a2332 100%)',
            fontFamily: 'system-ui',
            padding: '40px',
          }}
        >
          {/* Header */}
          <div
            style={{
              fontSize: '48px',
              fontWeight: 'bold',
              color: '#ffffff',
              marginBottom: '20px',
              textAlign: 'center',
            }}
          >
            {voteIcon} Vote Recorded
          </div>

          {/* Vote Details */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '32px',
              backgroundColor: `rgba(${isApproved ? '34, 197, 94' : '239, 68, 68'}, 0.1)`,
              borderRadius: '20px',
              border: `3px solid ${voteColor}`,
              marginBottom: '40px',
              maxWidth: '600px',
            }}
          >
            <div
              style={{
                fontSize: '24px',
                color: '#ffffff',
                fontWeight: 'bold',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              Your Vote: {isApproved ? 'APPROVE' : 'REJECT'}
            </div>
            
            <div
              style={{
                fontSize: '18px',
                color: '#94a3b8',
                marginBottom: '20px',
                textAlign: 'center',
                lineHeight: '1.5',
              }}
            >
              {isApproved 
                ? 'You approved the AI recommendation for yield optimization'
                : 'You rejected the AI recommendation due to risk concerns'
              }
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px 24px',
                backgroundColor: `rgba(${isApproved ? '34, 197, 94' : '239, 68, 68'}, 0.2)`,
                borderRadius: '12px',
              }}
            >
              <div style={{ fontSize: '20px' }}>👥</div>
              <div
                style={{
                  fontSize: '18px',
                  color: voteColor,
                  fontWeight: 'bold',
                }}
              >
                Community Consensus: {communityConsensus}
              </div>
            </div>
          </div>

          {/* Next Steps */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '16px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              maxWidth: '500px',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                color: '#ffffff',
                fontWeight: 'bold',
                marginBottom: '12px',
                textAlign: 'center',
              }}
            >
              Next Steps
            </div>
            
            <div
              style={{
                fontSize: '16px',
                color: '#94a3b8',
                textAlign: 'center',
                lineHeight: '1.5',
              }}
            >
              {isApproved 
                ? 'The AI will execute the approved recommendation automatically'
                : 'The recommendation has been rejected and will not be executed'
              }
            </div>
          </div>

          {/* Footer */}
          <div
            style={{
              position: 'absolute',
              bottom: '20px',
              right: '20px',
              fontSize: '14px',
              color: '#64748b',
            }}
          >
            User: {user} • Powered by Agent Zule
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Voting frame image error:', error);
    return new NextResponse('Failed to generate image', { status: 500 });
  }
}
