'use client';

import { PageHeader } from '@/components/common/page-header';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import { getRecommendationsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Lightbulb, ArrowRight, BarChart3 } from 'lucide-react';

function RecommendationCard({ rec, index }: { rec: string; index: number }) {
  return (
    <Card className="transition-all hover:shadow-md">
       <CardHeader>
        <div className="flex items-start gap-4">
            <div className="flex-shrink-0 h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Lightbulb className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg leading-snug pt-1.5">Recommendation #{index + 1}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground">{rec}</p>
      </CardContent>
    </Card>
  );
}


export default function RecommendationsPage() {
  const { state, dispatch } = useAppContext();
  const { toast } = useToast();
  const { analysis, recommendations, operationalData, loading } = state;

  const handleGetRecommendations = async () => {
    if (!analysis) {
      toast({
        title: 'Analysis Required',
        description: 'Please run an analysis first to get recommendations.',
        variant: 'destructive',
      });
      return;
    }

    dispatch({ type: 'SET_RECOMMENDATIONS_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });

    try {
      const result = await getRecommendationsAction(analysis, operationalData);
      dispatch({ type: 'SET_RECOMMENDATIONS_RESULT', payload: result });
      toast({
        title: 'Recommendations Generated',
        description: 'Smart recommendations are ready for review.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast({
        title: 'Failed to Get Recommendations',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };

  return (
    <>
      <PageHeader
        title="Smart Recommendations"
        subtitle="AI-generated suggestions to reduce your carbon footprint."
      />
      
      {!analysis && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">Analysis Required</h3>
            <p className="text-muted-foreground mt-2 mb-4">You need to analyze your data before we can generate recommendations.</p>
            <Button asChild>
                <Link href="/dashboard/analysis">Go to Analysis <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
        </Card>
      )}

      {analysis && (
        <>
            <div className="flex justify-start mb-6">
                <Button onClick={handleGetRecommendations} disabled={loading.recommendations}>
                    {loading.recommendations ? 'Generating...' : 'Generate Recommendations'}
                    <Lightbulb className="ml-2 h-4 w-4" />
                </Button>
            </div>

            {loading.recommendations && (
                <div className="space-y-4">
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-36 w-full" />
                    <Skeleton className="h-36 w-full" />
                </div>
            )}
            
            {recommendations && !loading.recommendations && (
                <div className="space-y-4">
                    {recommendations.recommendations.map((rec, index) => (
                        <RecommendationCard key={index} rec={rec} index={index} />
                    ))}
                </div>
            )}

            {!recommendations && !loading.recommendations && (
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                    <Lightbulb className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground">Ready to optimize?</h3>
                    <p className="text-muted-foreground mt-2">Click the "Generate Recommendations" button to get personalized advice.</p>
                </Card>
            )}
        </>
      )}
    </>
  );
}
