import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user') || 'user123';

    return new ImageResponse(
      (
        <div
          style={{
            height: '100%',
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: '#0a0f1c',
            backgroundImage: 'linear-gradient(45deg, #0a0f1c 0%, #1a2332 100%)',
            fontFamily: 'system-ui',
            padding: '40px',
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                fontSize: '32px',
                fontWeight: 'bold',
                color: '#ffffff',
              }}
            >
              🤖 AI Recommendations
            </div>
            <div
              style={{
                fontSize: '16px',
                color: '#94a3b8',
              }}
            >
              User: {user}
            </div>
          </div>

          {/* Portfolio Summary */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '20px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(59, 130, 246, 0.2)',
              marginBottom: '30px',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '600' }}>
                Portfolio Value
              </div>
              <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 'bold' }}>
                $12,500.50
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '600' }}>
                24h Change
              </div>
              <div style={{ fontSize: '24px', color: '#22c55e', fontWeight: 'bold' }}>
                +2.05%
              </div>
            </div>
          </div>

          {/* Recommendation Card */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              padding: '24px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '16px',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              marginBottom: '20px',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                marginBottom: '16px',
              }}
            >
              <div style={{ fontSize: '24px', marginRight: '12px' }}>📈</div>
              <div
                style={{
                  fontSize: '20px',
                  color: '#ffffff',
                  fontWeight: 'bold',
                }}
              >
                Yield Optimization Opportunity
              </div>
            </div>
            
            <div
              style={{
                fontSize: '16px',
                color: '#94a3b8',
                marginBottom: '16px',
                lineHeight: '1.5',
              }}
            >
              Move 20% of USDC to higher yield pool (12% APY)
            </div>
            
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  gap: '20px',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Confidence</div>
                  <div style={{ fontSize: '18px', color: '#22c55e', fontWeight: 'bold' }}>
                    85%
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Est. Return</div>
                  <div style={{ fontSize: '18px', color: '#22c55e', fontWeight: 'bold' }}>
                    $120
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '14px', color: '#64748b' }}>Risk</div>
                  <div style={{ fontSize: '18px', color: '#22c55e', fontWeight: 'bold' }}>
                    Low
                  </div>
                </div>
              </div>
              
              <div
                style={{
                  padding: '8px 16px',
                  backgroundColor: 'rgba(34, 197, 94, 0.2)',
                  borderRadius: '8px',
                  fontSize: '14px',
                  color: '#22c55e',
                  fontWeight: '600',
                }}
              >
                Community Vote: 85% Approve
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              gap: '20px',
            }}
          >
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#22c55e',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#ffffff',
                fontWeight: 'bold',
              }}
            >
              ✅ Approve
            </div>
            <div
              style={{
                padding: '12px 24px',
                backgroundColor: '#ef4444',
                borderRadius: '8px',
                fontSize: '16px',
                color: '#ffffff',
                fontWeight: 'bold',
              }}
            >
              ❌ Reject
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
            Powered by Envio • Monad Testnet
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Recommendations frame image error:', error);
    return new NextResponse('Failed to generate image', { status: 500 });
  }
}
