'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Portfolio, AIRecommendation, Permission, Web3State } from '@/lib/types';
import { apiClient } from '@/services/api/apiClient';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Shield, 
  Bot, 
  Users, 
  Activity,
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';

interface DashboardProps {
  walletState: Web3State;
}

export function Dashboard({ walletState }: DashboardProps) {
  const [portfolio, setPortfolio] = useState<Portfolio | null>(null);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (walletState.isConnected && walletState.account) {
      loadDashboardData();
    }
  }, [walletState.isConnected, walletState.account]);

  const loadDashboardData = async () => {
    if (!walletState.account) return;

    setLoading(true);
    setError(null);

    try {
      // Load portfolio data
      const portfolioResponse = await apiClient.getPortfolioData(walletState.account);
      if (portfolioResponse.success) {
        setPortfolio(portfolioResponse.data[0] || null);
      }

      // Load recommendations
      const recommendationsResponse = await apiClient.recommendations.getRecommendations(walletState.account);
      if (recommendationsResponse.success) {
        setRecommendations(recommendationsResponse.data);
      }

      // Load permissions
      const permissionsResponse = await apiClient.permissions.getPermissions(walletState.account);
      if (permissionsResponse.success) {
        setPermissions(permissionsResponse.data);
      }

      // Setup real-time monitoring
      await setupRealTimeMonitoring();

    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const setupRealTimeMonitoring = async () => {
    try {
      if (portfolio) {
        await apiClient.setupPortfolioMonitoring(portfolio.id);
      }
      await apiClient.setupRecommendationMonitoring();

      // Listen for updates
      apiClient.on('portfolioUpdate', (data) => {
        setPortfolio(prev => prev ? { ...prev, ...data } : null);
      });

      apiClient.on('recommendationUpdate', (data) => {
        setRecommendations(prev => 
          prev.map(rec => rec.id === data.id ? { ...rec, ...data } : rec)
        );
      });

    } catch (err) {
      console.warn('Failed to setup real-time monitoring:', err);
    }
  };

  const handleExecuteRecommendation = async (recommendationId: string) => {
    try {
      await apiClient.executeRecommendation(recommendationId);
      // Refresh recommendations
      const response = await apiClient.recommendations.getRecommendations(walletState.account!);
      if (response.success) {
        setRecommendations(response.data);
      }
    } catch (err) {
      console.error('Failed to execute recommendation:', err);
      setError('Failed to execute recommendation. Please try again.');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'rejected':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'executed':
        return <Zap className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getImpactColor = (impact: string) => {
    switch (impact) {
      case 'high':
        return 'destructive';
      case 'medium':
        return 'default';
      case 'low':
        return 'secondary';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-64 space-y-4">
        <AlertTriangle className="w-12 h-12 text-red-500" />
        <p className="text-red-500">{error}</p>
        <Button onClick={loadDashboardData} variant="outline">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Overview */}
      {portfolio && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Value</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ${portfolio.totalValue.toLocaleString()}
              </div>
              <p className={`text-xs flex items-center ${
                portfolio.totalValueChange >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {portfolio.totalValueChange >= 0 ? (
                  <TrendingUp className="w-3 h-3 mr-1" />
                ) : (
                  <TrendingDown className="w-3 h-3 mr-1" />
                )}
                {portfolio.totalValueChangePercent.toFixed(2)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Positions</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{portfolio.positions.length}</div>
              <p className="text-xs text-muted-foreground">
                Diversified across tokens
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Delegations</CardTitle>
              <Shield className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {permissions.filter(p => p.isGranted).length}
              </div>
              <p className="text-xs text-muted-foreground">
                AI permissions active
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Recommendations</CardTitle>
              <Bot className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {recommendations.filter(r => r.status === 'pending').length}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting your approval
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultValue="recommendations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recommendations">AI Recommendations</TabsTrigger>
          <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-4">
          <div className="grid gap-4">
            {recommendations.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Bot className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Active Recommendations</h3>
                  <p className="text-muted-foreground text-center">
                    AI is analyzing your portfolio. New recommendations will appear here.
                  </p>
                </CardContent>
              </Card>
            ) : (
              recommendations.map((recommendation) => (
                <Card key={recommendation.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(recommendation.status)}
                        <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      </div>
                      <Badge variant={getImpactColor(recommendation.impact)}>
                        {recommendation.impact.toUpperCase()}
                      </Badge>
                    </div>
                    <CardDescription>{recommendation.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid gap-4 md:grid-cols-3">
                      <div>
                        <p className="text-sm font-medium">Confidence</p>
                        <p className="text-2xl font-bold text-green-600">
                          {recommendation.confidence}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Estimated Return</p>
                        <p className="text-2xl font-bold">
                          {recommendation.estimatedReturn > 0 ? '+' : ''}
                          {recommendation.estimatedReturn.toFixed(2)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-sm font-medium">Risk Level</p>
                        <Badge variant={getImpactColor(recommendation.riskLevel)}>
                          {recommendation.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <div className="flex items-center space-x-2">
                        <Users className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          {recommendation.communityVotes.length} community votes
                        </span>
                      </div>
                      {recommendation.status === 'pending' && (
                        <div className="flex space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExecuteRecommendation(recommendation.id)}
                          >
                            <Zap className="w-4 h-4 mr-2" />
                            Execute
                          </Button>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="portfolio" className="space-y-4">
          {portfolio ? (
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Portfolio Positions</CardTitle>
                  <CardDescription>
                    Current allocation and performance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {portfolio.positions.map((position) => (
                      <div key={position.id} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold">
                              {position.token.symbol.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">{position.token.symbol}</p>
                            <p className="text-sm text-muted-foreground">{position.token.name}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-medium">${position.value.toLocaleString()}</p>
                          <p className={`text-sm ${
                            position.valueChange >= 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {position.valueChange >= 0 ? '+' : ''}
                            {position.valueChangePercent.toFixed(2)}%
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{position.allocation.toFixed(1)}%</p>
                          <p className="text-xs text-muted-foreground">Allocation</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-8">
                <DollarSign className="w-12 h-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Portfolio Found</h3>
                <p className="text-muted-foreground text-center">
                  Create a portfolio to start managing your DeFi assets.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="permissions" className="space-y-4">
          <div className="grid gap-4">
            {permissions.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-8">
                  <Shield className="w-12 h-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Permissions Set</h3>
                  <p className="text-muted-foreground text-center">
                    Grant permissions to AI agent to enable automated portfolio management.
                  </p>
                </CardContent>
              </Card>
            ) : (
              permissions.map((permission) => (
                <Card key={permission.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg capitalize">
                        {permission.type.replace('_', ' ')}
                      </CardTitle>
                      <Badge variant={permission.isGranted ? 'default' : 'secondary'}>
                        {permission.isGranted ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        Conditions: {permission.conditions.length}
                      </p>
                      {permission.conditions.map((condition) => (
                        <div key={condition.id} className="text-xs bg-muted p-2 rounded">
                          {condition.type}: {condition.value} ({condition.operator})
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <Activity className="w-12 h-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">Activity Feed</h3>
              <p className="text-muted-foreground text-center">
                Recent AI actions and portfolio changes will appear here.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
