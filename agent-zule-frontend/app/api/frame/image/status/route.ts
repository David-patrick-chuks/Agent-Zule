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
              📊 Portfolio Status
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

          {/* Portfolio Overview */}
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '24px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '16px',
              border: '2px solid rgba(34, 197, 94, 0.3)',
              marginBottom: '30px',
            }}
          >
            <div>
              <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '600' }}>
                Total Portfolio Value
              </div>
              <div style={{ fontSize: '32px', color: '#22c55e', fontWeight: 'bold' }}>
                $12,500.50
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '600' }}>
                24h Performance
              </div>
              <div style={{ fontSize: '32px', color: '#22c55e', fontWeight: 'bold' }}>
                +2.05%
              </div>
            </div>
          </div>

          {/* Holdings */}
          <div
            style={{
              display: 'flex',
              gap: '20px',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                flex: 1,
                padding: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '600', marginBottom: '8px' }}>
                MON (60%)
              </div>
              <div style={{ fontSize: '24px', color: '#3b82f6', fontWeight: 'bold' }}>
                $7,500
              </div>
              <div style={{ fontSize: '14px', color: '#22c55e' }}>
                +2.04%
              </div>
            </div>
            
            <div
              style={{
                flex: 1,
                padding: '20px',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(168, 85, 247, 0.2)',
              }}
            >
              <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '600', marginBottom: '8px' }}>
                USDC (40%)
              </div>
              <div style={{ fontSize: '24px', color: '#a855f7', fontWeight: 'bold' }}>
                $5,000
              </div>
              <div style={{ fontSize: '14px', color: '#22c55e' }}>
                +2.05%
              </div>
            </div>
          </div>

          {/* AI Status */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              backgroundColor: 'rgba(34, 197, 94, 0.1)',
              borderRadius: '12px',
              border: '1px solid rgba(34, 197, 94, 0.2)',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
              }}
            >
              <div style={{ fontSize: '24px' }}>🤖</div>
              <div>
                <div style={{ fontSize: '18px', color: '#ffffff', fontWeight: '600' }}>
                  AI Agent Status
                </div>
                <div style={{ fontSize: '14px', color: '#94a3b8' }}>
                  Monitoring market conditions
                </div>
              </div>
            </div>
            
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: 'rgba(34, 197, 94, 0.2)',
                borderRadius: '8px',
              }}
            >
              <div
                style={{
                  width: '8px',
                  height: '8px',
                  backgroundColor: '#22c55e',
                  borderRadius: '50%',
                }}
              />
              <div style={{ fontSize: '14px', color: '#22c55e', fontWeight: '600' }}>
                Active
              </div>
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
    console.error('Status frame image error:', error);
    return new NextResponse('Failed to generate image', { status: 500 });
  }
}
