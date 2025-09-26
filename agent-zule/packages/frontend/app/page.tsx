import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowUpRight, Bot, Shield, TrendingUp, Users, Zap } from 'lucide-react';
import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="container mx-auto px-4 py-20">
          <div className="text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent/10 rounded-full text-accent mb-6">
              <Bot className="w-4 h-4" />
              <span className="text-sm font-medium">AI-Powered Portfolio Agent</span>
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Agent Zule
            </h1>
            
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              AI-powered portfolio rebalancing agent on Monad. Delegate permissions and let AI optimize your DeFi portfolio with community-driven decisions.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6">
                <Zap className="w-5 h-5 mr-2" />
                Try Farcaster Frame
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <TrendingUp className="w-5 h-5 mr-2" />
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Revolutionary AI Features</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for the $5,500 hackathon prize with cutting-edge innovations
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Bot className="w-6 h-6 text-primary" />
                </div>
                <CardTitle>AI-Powered Rebalancing</CardTitle>
                <CardDescription>
                  Continuous portfolio optimization using advanced AI algorithms and real-time market data
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Automated</Badge>
                    <span className="text-sm text-muted-foreground">24/7 monitoring</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Envio Data</Badge>
                    <span className="text-sm text-muted-foreground">Real-time insights</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-accent/10 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-accent" />
                </div>
                <CardTitle>Conditional Permissions</CardTitle>
                <CardDescription>
                  Dynamic permissions that adapt to market conditions with auto-revoke during high volatility
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="destructive">Innovation</Badge>
                    <span className="text-sm text-muted-foreground">First-of-its-kind</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">MetaMask</Badge>
                    <span className="text-sm text-muted-foreground">Smart Accounts</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="group hover:shadow-lg transition-all duration-300">
              <CardHeader>
                <div className="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center mb-4">
                  <Users className="w-6 h-6 text-green-500" />
                </div>
                <CardTitle>Community-Driven</CardTitle>
                <CardDescription>
                  Social decision making through Farcaster casts with community voting on high-risk moves
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">Farcaster</Badge>
                    <span className="text-sm text-muted-foreground">Native integration</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">Social</Badge>
                    <span className="text-sm text-muted-foreground">Community voting</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Farcaster Frame Demo */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">Farcaster Frame Integration</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Experience Agent Zule through native Farcaster Frames with seamless social onboarding
            </p>
          </div>
          
          <div className="max-w-4xl mx-auto">
            <Card className="overflow-hidden">
              <CardHeader className="bg-gradient-to-r from-primary/10 to-accent/10">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                    <Bot className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-2xl">Try the Frame</CardTitle>
                    <CardDescription>
                      Copy this frame URL and paste it in Farcaster to experience Agent Zule
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="bg-muted rounded-lg p-4 mb-4">
                  <code className="text-sm break-all">
                    {process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/frame
                  </code>
                </div>
                <div className="flex flex-col sm:flex-row gap-4">
                  <Button className="flex-1">
                    <ArrowUpRight className="w-4 h-4 mr-2" />
                    Open in Farcaster
                  </Button>
                  <Button variant="outline" className="flex-1">
                    Copy Frame URL
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Prize Strategy */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">$5,500 Prize Strategy</h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Optimized to win multiple hackathon prizes with innovative features
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-primary">$1,500</span>
                </div>
                <CardTitle>Best AI Agent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  AI agent with delegations for autonomous interactions
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-accent/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-accent">$500</span>
                </div>
                <CardTitle>Innovative Delegations</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Conditional permissions adapting to market conditions
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-green-500">$500</span>
                </div>
                <CardTitle>Farcaster Mini App</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Native Frame integration with social features
                </p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardHeader>
                <div className="w-16 h-16 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-2xl font-bold text-blue-500">$3,000</span>
                </div>
                <CardTitle>Envio Integration</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Custom indexer and real-time data visualization
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-4xl font-bold mb-6">Ready to Experience the Future?</h2>
            <p className="text-xl text-muted-foreground mb-8">
              Join the AI revolution in DeFi portfolio management
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="text-lg px-8 py-6">
                <Bot className="w-5 h-5 mr-2" />
                Start with Frame
              </Button>
              <Button variant="outline" size="lg" className="text-lg px-8 py-6">
                <TrendingUp className="w-5 h-5 mr-2" />
                View Dashboard
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
