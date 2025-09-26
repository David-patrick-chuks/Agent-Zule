'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { 
  Users, 
  MessageCircle, 
  TrendingUp, 
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Bot
} from 'lucide-react';

// Mock data - in production this would come from API
const communityData = {
  totalMembers: 1247,
  activeVoters: 89,
  recentActivity: [
    {
      id: '1',
      type: 'vote',
      user: {
        name: 'crypto_optimist',
        avatar: '/placeholder-user.jpg',
        fid: '1234',
      },
      action: 'voted to approve',
      target: 'Yield Optimization Strategy',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      vote: 'approve',
    },
    {
      id: '2',
      type: 'discussion',
      user: {
        name: 'defi_trader',
        avatar: '/placeholder-user.jpg',
        fid: '5678',
      },
      action: 'commented on',
      target: 'Portfolio Rebalancing Proposal',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      content: 'This looks like a solid strategy. The risk metrics are well within acceptable limits.',
    },
    {
      id: '3',
      type: 'ai_recommendation',
      user: {
        name: 'Agent Zule',
        avatar: '/placeholder-logo.png',
        fid: 'ai',
      },
      action: 'generated new recommendation',
      target: 'DCA Strategy for MON',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      confidence: 75,
    },
    {
      id: '4',
      type: 'vote',
      user: {
        name: 'yield_farmer',
        avatar: '/placeholder-user.jpg',
        fid: '9012',
      },
      action: 'voted to reject',
      target: 'High Risk Position Change',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      vote: 'reject',
    },
    {
      id: '5',
      type: 'execution',
      user: {
        name: 'Agent Zule',
        avatar: '/placeholder-logo.png',
        fid: 'ai',
      },
      action: 'executed approved trade',
      target: 'USDC to MON swap',
      timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      result: 'successful',
    },
  ],
  currentVotes: [
    {
      id: '1',
      title: 'Yield Optimization Strategy',
      description: 'Move 20% of USDC to higher yield pool',
      votes: {
        approve: 78,
        reject: 22,
        total: 100,
      },
      timeRemaining: '18h 32m',
      status: 'active',
    },
    {
      id: '2',
      title: 'Portfolio Rebalancing',
      description: 'Rebalance MON/USDC to 70/30 allocation',
      votes: {
        approve: 65,
        reject: 35,
        total: 100,
      },
      timeRemaining: '2d 14h',
      status: 'active',
    },
  ],
};

const activityConfig = {
  vote: {
    icon: CheckCircle,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  discussion: {
    icon: MessageCircle,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  ai_recommendation: {
    icon: Bot,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  execution: {
    icon: TrendingUp,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
};

const voteConfig = {
  approve: { icon: CheckCircle, color: 'text-green-500' },
  reject: { icon: XCircle, color: 'text-red-500' },
};

export function CommunityActivity() {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Community Activity
            </CardTitle>
            <CardDescription>
              Social decision making and community engagement
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">
              {communityData.totalMembers} members
            </Badge>
            <Badge variant="outline">
              {communityData.activeVoters} active voters
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Current Votes */}
          <div>
            <h4 className="font-semibold mb-4">Active Community Votes</h4>
            <div className="space-y-3">
              {communityData.currentVotes.map((vote) => (
                <div key={vote.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h5 className="font-semibold">{vote.title}</h5>
                      <p className="text-sm text-muted-foreground">
                        {vote.description}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {vote.timeRemaining} left
                    </Badge>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Community Consensus</span>
                      <span>{vote.votes.approve}% approve</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div 
                        className="bg-green-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${vote.votes.approve}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>{vote.votes.reject}% reject</span>
                      <span>{vote.votes.total} total votes</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 mt-3">
                    <Button size="sm" variant="outline" className="flex-1">
                      <XCircle className="w-4 h-4 mr-1" />
                      Reject
                    </Button>
                    <Button size="sm" className="flex-1">
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Activity */}
          <div>
            <h4 className="font-semibold mb-4">Recent Activity</h4>
            <div className="space-y-3">
              {communityData.recentActivity.map((activity) => {
                const activityInfo = activityConfig[activity.type as keyof typeof activityConfig];
                const ActivityIcon = activityInfo.icon;
                const isAI = activity.user.fid === 'ai';
                
                return (
                  <div key={activity.id} className="flex items-start gap-3 p-3 hover:bg-muted/50 rounded-lg transition-colors">
                    <div className={`w-8 h-8 ${activityInfo.bgColor} rounded-full flex items-center justify-center flex-shrink-0`}>
                      <ActivityIcon className={`w-4 h-4 ${activityInfo.color}`} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Avatar className="w-6 h-6">
                          <AvatarImage src={activity.user.avatar} />
                          <AvatarFallback>
                            {isAI ? 'AI' : activity.user.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium text-sm">
                          {activity.user.name}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {activity.action}
                        </span>
                        <span className="font-medium text-sm">
                          {activity.target}
                        </span>
                      </div>
                      
                      {activity.content && (
                        <p className="text-sm text-muted-foreground mt-1">
                          "{activity.content}"
                        </p>
                      )}
                      
                      {activity.vote && (
                        <div className="flex items-center gap-1 mt-1">
                          {activity.vote === 'approve' ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <XCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="text-sm text-muted-foreground">
                            Voted {activity.vote}
                          </span>
                        </div>
                      )}
                      
                      {activity.confidence && (
                        <div className="flex items-center gap-1 mt-1">
                          <Bot className="w-4 h-4 text-purple-500" />
                          <span className="text-sm text-muted-foreground">
                            {activity.confidence}% confidence
                          </span>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-1 mt-1">
                        <Clock className="w-3 h-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {Math.floor((Date.now() - new Date(activity.timestamp).getTime()) / (1000 * 60))}m ago
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
