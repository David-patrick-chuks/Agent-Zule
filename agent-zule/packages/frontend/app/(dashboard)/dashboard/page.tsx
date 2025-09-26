import { PortfolioOverview } from '@/components/dashboard/PortfolioOverview';
import { AIRecommendations } from '@/components/dashboard/AIRecommendations';
import { RiskAssessment } from '@/components/dashboard/RiskAssessment';
import { CommunityActivity } from '@/components/dashboard/CommunityActivity';

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Portfolio Dashboard</h1>
        <p className="text-muted-foreground">
          AI-powered portfolio management with real-time insights
        </p>
      </div>
      
      <div className="grid gap-6">
        <PortfolioOverview />
        <div className="grid lg:grid-cols-2 gap-6">
          <AIRecommendations />
          <RiskAssessment />
        </div>
        <CommunityActivity />
      </div>
    </div>
  );
}
