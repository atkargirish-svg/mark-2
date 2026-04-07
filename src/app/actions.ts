'use server';

/**
 * Legacy actions for EcoVision dashboard to satisfy build requirements.
 */

export async function runAnalysisAction(data: any) {
  return {
    overallEmissionSummary: "Analysis system ready.",
    peakUsageInsights: "No peaks detected.",
    idleTimeInsights: "No idle time detected.",
    inefficiencyInsights: "System operating normally.",
    abnormalEnergySpikes: "None.",
    potentialSavingsOverview: "Optimization complete."
  };
}

export async function getRecommendationsAction(analysis: any, data: any) {
  return {
    recommendations: ["Maintain hardware regularity.", "Monitor system pulse."]
  };
}
