import { NextRequest, NextResponse } from 'next/server';
import { FrameRequest, getFrameMessage } from '@frog/frog';
import { FrameState, FrameMetadata } from '@/lib/types';
import { FRAME_CONFIG, FRAME_BUTTONS } from '@/lib/constants';

// Mock data for development
const mockPortfolio = {
  id: '1',
  totalValue: 12500.50,
  totalValueChange: 250.75,
  totalValueChangePercent: 2.05,
  positions: [
    {
      id: '1',
      token: {
        id: '1',
        symbol: 'MON',
        name: 'Monad',
        address: '0x123...',
        decimals: 18,
        price: 0.15,
        priceChange24h: 0.02,
        priceChangePercent24h: 15.38,
      },
      amount: 50000,
      value: 7500,
      valueChange: 150,
      valueChangePercent: 2.04,
      allocation: 60,
    },
    {
      id: '2',
      token: {
        id: '2',
        symbol: 'USDC',
        name: 'USD Coin',
        address: '0x456...',
        decimals: 6,
        price: 1.00,
        priceChange24h: 0,
        priceChangePercent24h: 0,
      },
      amount: 5000,
      value: 5000,
      valueChange: 100.75,
      valueChangePercent: 2.05,
      allocation: 40,
    },
  ],
  lastUpdated: new Date().toISOString(),
};

const mockRecommendations = [
  {
    id: '1',
    type: 'yield_optimization' as const,
    title: 'Optimize Yield Farming',
    description: 'Move 20% of USDC to higher yield pool (12% APY)',
    impact: 'medium' as const,
    confidence: 85,
    estimatedReturn: 120,
    riskLevel: 'low' as const,
    actions: [],
    communityVotes: [],
    status: 'pending' as const,
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  },
];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const frameRequest = body as FrameRequest;
    
    // Get frame message (this would be real in production)
    const { untrustedData } = frameRequest;
    const buttonIndex = untrustedData?.buttonIndex || 1;
    const userAddress = untrustedData?.fid?.toString() || 'user123';

    // Determine current frame state
    let currentFrame: FrameState['currentFrame'] = 'onboarding';
    let frameMetadata: FrameMetadata;

    // Route based on button clicks and current state
    switch (buttonIndex) {
      case 1: // Join/Connect button
        if (currentFrame === 'onboarding') {
          currentFrame = 'recommendations';
          frameMetadata = await generateRecommendationsFrame(userAddress);
        } else {
          frameMetadata = await generateOnboardingFrame();
        }
        break;
      
      case 2: // Approve button
        currentFrame = 'voting';
        frameMetadata = await generateVotingFrame(userAddress, 'approve');
        break;
      
      case 3: // Reject button
        currentFrame = 'voting';
        frameMetadata = await generateVotingFrame(userAddress, 'reject');
        break;
      
      case 4: // View Dashboard button
        frameMetadata = await generateStatusFrame(userAddress);
        break;
      
      default:
        frameMetadata = await generateOnboardingFrame();
    }

    return NextResponse.json({
      ...frameMetadata,
      state: {
        currentFrame,
        userAddress,
        isConnected: true,
        portfolio: mockPortfolio,
        recommendations: mockRecommendations,
        delegations: [],
        marketCondition: {
          volatility: 0.15,
          trend: 'bullish' as const,
          riskLevel: 'low' as const,
          lastUpdated: new Date().toISOString(),
        },
      },
    });
  } catch (error) {
    console.error('Frame API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

async function generateOnboardingFrame(): Promise<FrameMetadata> {
  return {
    title: 'Agent Zule - AI Portfolio Agent',
    description: 'Join the AI-powered portfolio rebalancing community on Monad',
    image: {
      src: `${FRAME_CONFIG.baseUrl}/api/frame/image/onboarding`,
      aspectRatio: '1.91:1',
    },
    buttons: [
      FRAME_BUTTONS.join,
      FRAME_BUTTONS.viewDashboard,
    ],
    postUrl: `${FRAME_CONFIG.baseUrl}/api/frame`,
  };
}

async function generateRecommendationsFrame(userAddress: string): Promise<FrameMetadata> {
  return {
    title: 'AI Recommendations',
    description: 'Your personalized portfolio optimization suggestions',
    image: {
      src: `${FRAME_CONFIG.baseUrl}/api/frame/image/recommendations?user=${userAddress}`,
      aspectRatio: '1.91:1',
    },
    buttons: [
      FRAME_BUTTONS.approve,
      FRAME_BUTTONS.reject,
      FRAME_BUTTONS.viewDashboard,
    ],
    postUrl: `${FRAME_CONFIG.baseUrl}/api/frame`,
  };
}

async function generateVotingFrame(userAddress: string, vote: 'approve' | 'reject'): Promise<FrameMetadata> {
  return {
    title: 'Community Vote Recorded',
    description: `Your ${vote} vote has been recorded. Community consensus: ${vote === 'approve' ? '85% approve' : '65% reject'}`,
    image: {
      src: `${FRAME_CONFIG.baseUrl}/api/frame/image/voting?user=${userAddress}&vote=${vote}`,
      aspectRatio: '1.91:1',
    },
    buttons: [
      FRAME_BUTTONS.viewDashboard,
      FRAME_BUTTONS.execute,
    ],
    postUrl: `${FRAME_CONFIG.baseUrl}/api/frame`,
  };
}

async function generateStatusFrame(userAddress: string): Promise<FrameMetadata> {
  return {
    title: 'Portfolio Status',
    description: 'Your AI-managed portfolio is performing well with 2.05% gains today',
    image: {
      src: `${FRAME_CONFIG.baseUrl}/api/frame/image/status?user=${userAddress}`,
      aspectRatio: '1.91:1',
    },
    buttons: [
      FRAME_BUTTONS.execute,
    ],
    postUrl: `${FRAME_CONFIG.baseUrl}/api/frame`,
  };
}
