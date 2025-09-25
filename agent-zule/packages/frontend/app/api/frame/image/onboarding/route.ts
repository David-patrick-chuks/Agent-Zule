import { NextRequest, NextResponse } from 'next/server';
import { ImageResponse } from 'next/og';

export async function GET(request: NextRequest) {
  try {
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
          }}
        >
          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                fontSize: '48px',
                fontWeight: 'bold',
                color: '#ffffff',
                marginBottom: '16px',
                textAlign: 'center',
              }}
            >
              🤖 Agent Zule
            </div>
            <div
              style={{
                fontSize: '24px',
                color: '#94a3b8',
                textAlign: 'center',
                maxWidth: '600px',
                lineHeight: '1.4',
              }}
            >
              AI-Powered Portfolio Rebalancing Agent
            </div>
          </div>

          {/* Features */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              gap: '40px',
              marginBottom: '40px',
            }}
          >
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(59, 130, 246, 0.2)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>⚖️</div>
              <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '600' }}>
                Auto Rebalancing
              </div>
            </div>
            
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: 'rgba(34, 197, 94, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(34, 197, 94, 0.2)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>📈</div>
              <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '600' }}>
                Yield Optimization
              </div>
            </div>
            
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                padding: '20px',
                backgroundColor: 'rgba(168, 85, 247, 0.1)',
                borderRadius: '12px',
                border: '1px solid rgba(168, 85, 247, 0.2)',
              }}
            >
              <div style={{ fontSize: '32px', marginBottom: '8px' }}>🛡️</div>
              <div style={{ fontSize: '16px', color: '#ffffff', fontWeight: '600' }}>
                Risk Management
              </div>
            </div>
          </div>

          {/* Call to Action */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              padding: '24px',
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderRadius: '16px',
              border: '2px solid #3b82f6',
            }}
          >
            <div
              style={{
                fontSize: '20px',
                color: '#ffffff',
                fontWeight: 'bold',
                marginBottom: '8px',
              }}
            >
              Join the AI Revolution
            </div>
            <div
              style={{
                fontSize: '16px',
                color: '#94a3b8',
                textAlign: 'center',
              }}
            >
              Delegate permissions and let AI optimize your portfolio
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
            Built on Monad • Powered by Envio
          </div>
        </div>
      ),
      {
        width: 1200,
        height: 630,
      }
    );
  } catch (error) {
    console.error('Onboarding frame image error:', error);
    return new NextResponse('Failed to generate image', { status: 500 });
  }
}
