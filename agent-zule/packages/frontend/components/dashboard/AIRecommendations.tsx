'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  Shield, 
  DollarSign, 
  Users, 
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle
} from 'lucide-react';

// Mock data - in production this would come from API
const recommendations = [
  {
    id: '1',
    type: 'yield_optimization',
    title: 'Optimize Yield Farming',
    description: 'Move 20% of USDC to higher yield pool (12% APY)',
    impact: 'medium',
    confidence: 85,
    estimatedReturn: 120,
    riskLevel: 'low',
    communityVotes: {
      approve: 85,
      reject: 15,
      total: 100,
    },
    status: 'pending',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 22 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '2',
    type: 'rebalance',
    title: 'Portfolio Rebalancing',
    description: 'Rebalance MON/USDC allocation to 70/30 for optimal risk',
    impact: 'high',
    confidence: 92,
    estimatedReturn: 200,
    riskLevel: 'medium',
    communityVotes: {
      approve: 78,
      reject: 22,
      total: 100,
    },
    status: 'approved',
    createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: '3',
    type: 'dca',
    title: 'DCA Strategy',
    description: 'Implement dollar-cost averaging for MON purchases',
    impact: 'low',
    confidence: 75,
    estimatedReturn: 80,
    riskLevel: 'low',
    communityVotes: {
      approve: 65,
      reject: 35,
      total: 100,
    },
    status: 'rejected',
    createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    expiresAt: new Date(Date.now() + 18 * 60 * 60 * 1000).toISOString(),
  },
];

const typeConfig = {
  yield_optimization: {
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
    label: 'Yield Optimization',
  },
  rebalance: {
    icon: Shield,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    label: 'Rebalancing',
  },
  dca: {
    icon: DollarSign,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
    label: 'DCA Strategy',
  },
};

const impactConfig = {
  low: { color: 'text-green-500', label: 'Low Impact' },
  medium: { color: 'text-yellow-500', label: 'Medium Impact' },
  high: { color: 'text-red-500', label: 'High Impact' },
};

const riskConfig = {
  low: { color: 'text-green-500', label: 'Low Risk' },
  medium: { color: 'text-yellow-500', label: 'Medium Risk' },
  high: { color: 'text-red-500', label: 'High Risk' },
};

const statusConfig = {
  pending: { icon: Clock, color: 'text-yellow-500', label: 'Pending' },
  approved: { icon: CheckCircle, color: 'text-green-500', label: 'Approved' },
  rejected: { icon: XCircle, color: 'text-red-500', label: 'Rejected' },
};

export function AIRecommendations() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              AI-generated portfolio optimization suggestions
            </CardDescription>
          </div>
          <Badge variant="secondary">3 Active</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recommendations.map((recommendation) => {
            const typeInfo = typeConfig[recommendation.type as keyof typeof typeConfig];
            const impactInfo = impactConfig[recommendation.impact as keyof typeof impactConfig];
            const riskInfo = riskConfig[recommendation.riskLevel as keyof typeof riskConfig];
            const statusInfo = statusConfig[recommendation.status as keyof typeof statusConfig];
            const TypeIcon = typeInfo.icon;

            return (
              <div key={recommendation.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 ${typeInfo.bgColor} rounded-lg flex items-center justify-center`}>
                      <TypeIcon className={`w-5 h-5 ${typeInfo.color}`} />
                    </div>
                    <div>
                      <h4 className="font-semibold">{recommendation.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        {recommendation.description}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={impactInfo.color}>
                      {impactInfo.label}
                    </Badge>
                    <Badge variant="outline" className={riskInfo.color}>
                      {riskInfo.label}
                    </Badge>
                  </div>
                </div>

                {/* Metrics */}
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-green-500">
                      {recommendation.confidence}%
                    </div>
                    <div className="text-xs text-muted-foreground">Confidence</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      ${recommendation.estimatedReturn}
                    </div>
                    <div className="text-xs text-muted-foreground">Est. Return</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold">
                      {recommendation.communityVotes.approve}%
                    </div>
                    <div className="text-xs text-muted-foreground">Community</div>
                  </div>
                </div>

                {/* Community Progress */}
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-2">
                    <span>Community Consensus</span>
                    <span>{recommendation.communityVotes.approve}% approve</span>
                  </div>
                  <Progress 
                    value={recommendation.communityVotes.approve} 
                    className="h-2"
                  />
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <statusInfo.icon className={`w-4 h-4 ${statusInfo.color}`} />
                    <span className={`text-sm font-medium ${statusInfo.color}`}>
                      {statusInfo.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      • {Math.floor((Date.now() - new Date(recommendation.createdAt).getTime()) / (1000 * 60 * 60))}h ago
                    </span>
                  </div>
                  
                  {recommendation.status === 'pending' && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </Button>
                      <Button size="sm">
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </Button>
                    </div>
                  )}
                  
                  {recommendation.status === 'approved' && (
                    <Button size="sm" variant="outline">
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Execute
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
