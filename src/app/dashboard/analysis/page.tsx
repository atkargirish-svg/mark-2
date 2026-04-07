'use client';

import { PageHeader } from '@/components/common/page-header';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import { runAnalysisAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { AlertTriangle, BarChart3, CheckCircle, Cpu, Hourglass, TrendingDown, Zap } from 'lucide-react';

export default function AnalysisPage() {
  const { state, dispatch } = useAppContext();
  const { toast } = useToast();
  const { analysis, operationalData, loading } = state;

  const handleRunAnalysis = async () => {
    if (operationalData.length === 0) {
      toast({
        title: 'No Data',
        description: 'Please add some operational data before running analysis.',
        variant: 'destructive',
      });
      return;
    }

    dispatch({ type: 'SET_ANALYSIS_LOADING', payload: true });
    dispatch({ type: 'SET_ERROR', payload: null });
    try {
      const result = await runAnalysisAction(operationalData);
      dispatch({ type: 'SET_ANALYSIS_RESULT', payload: result });
      toast({
        title: 'Analysis Complete',
        description: 'Emission patterns have been successfully analyzed.',
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
      dispatch({ type: 'SET_ERROR', payload: errorMessage });
      toast({
        title: 'Analysis Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    }
  };
  
  const insightSections = analysis ? [
    {
      icon: <BarChart3 className="h-5 w-5 text-primary" />,
      title: "Overall Emission Summary",
      content: analysis.overallEmissionSummary
    },
    {
      icon: <Zap className="h-5 w-5 text-primary" />,
      title: "Peak Usage Insights",
      content: analysis.peakUsageInsights,
    },
    {
      icon: <Hourglass className="h-5 w-5 text-primary" />,
      title: "Idle Time Insights",
      content: analysis.idleTimeInsights,
    },
    {
      icon: <TrendingDown className="h-5 w-5 text-primary" />,
      title: "Inefficiency Insights",
      content: analysis.inefficiencyInsights,
    },
    {
      icon: <AlertTriangle className="h-5 w-5 text-primary" />,
      title: "Abnormal Energy Spikes",
      content: analysis.abnormalEnergySpikes,
    },
  ] : [];

  return (
    <>
      <PageHeader
        title="AI-Based Pattern Analysis"
        subtitle="Discover inefficiencies and opportunities for carbon reduction."
      />
      <div className="flex justify-start mb-6">
        <Button onClick={handleRunAnalysis} disabled={loading.analysis}>
          {loading.analysis ? 'Analyzing...' : 'Analyze Emission Patterns'}
          <Cpu className="ml-2 h-4 w-4" />
        </Button>
      </div>

      {loading.analysis && (
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </CardContent>
        </Card>
      )}

      {analysis && !loading.analysis && (
         <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis Results</CardTitle>
              <CardDescription>
                The following patterns and insights were identified from your operational data.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible defaultValue="Overall Emission Summary">
                {insightSections.map((section, index) => (
                  <AccordionItem value={section.title} key={index}>
                    <AccordionTrigger className="text-lg font-medium hover:no-underline">
                        <div className="flex items-center gap-3">
                            {section.icon}
                            <span>{section.title}</span>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-2 text-base">
                      <p className="text-muted-foreground whitespace-pre-wrap">{section.content}</p>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>

          <Card className="bg-primary/10 border-primary/20">
            <CardHeader>
                <div className="flex items-center gap-3">
                    <CheckCircle className="h-6 w-6 text-primary"/>
                    <CardTitle>Potential Savings</CardTitle>
                </div>
            </CardHeader>
            <CardContent>
              <p className="text-lg text-foreground">{analysis.potentialSavingsOverview}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {!analysis && !loading.analysis && (
        <Card className="flex flex-col items-center justify-center p-12 text-center">
            <BarChart3 className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">No analysis to display</h3>
            <p className="text-muted-foreground mt-2">Click the "Analyze Emission Patterns" button to get started.</p>
        </Card>
      )}
    </>
  );
}
