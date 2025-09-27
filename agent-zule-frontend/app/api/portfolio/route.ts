import { NextRequest, NextResponse } from 'next/server';
import { Portfolio } from '@/lib/types';

// Mock data - in production this would come from your backend
const mockPortfolio: Portfolio = {
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
        address: '0x1234567890abcdef1234567890abcdef12345678',
        decimals: 18,
        logoUrl: '/placeholder-logo.png',
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
        address: '0x4567890123cdef4567890123cdef4567890123',
        decimals: 6,
        logoUrl: '/placeholder-logo.png',
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userAddress = searchParams.get('address');
    
    if (!userAddress) {
      return NextResponse.json(
        { error: 'User address is required' },
        { status: 400 }
      );
    }

    // In production, this would fetch from your backend
    // const portfolio = await fetchPortfolioFromBackend(userAddress);
    
    return NextResponse.json({
      data: mockPortfolio,
      success: true,
      message: 'Portfolio data retrieved successfully',
    });
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch portfolio data' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, data } = body;

    // Handle different portfolio actions
    switch (action) {
      case 'refresh':
        // Trigger portfolio refresh
        return NextResponse.json({
          success: true,
          message: 'Portfolio refresh initiated',
        });
      
      case 'rebalance':
        // Initiate portfolio rebalancing
        return NextResponse.json({
          success: true,
          message: 'Portfolio rebalancing initiated',
        });
      
      default:
        return NextResponse.json(
          { error: 'Invalid action' },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Portfolio API error:', error);
    return NextResponse.json(
      { error: 'Failed to process portfolio action' },
      { status: 500 }
    );
  }
}
