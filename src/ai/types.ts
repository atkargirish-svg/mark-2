import { z } from 'zod';

// Schemas for analyze-emission-patterns
export const OperationalRecordSchema = z.object({
  date: z.string().describe('Date of the record in YYYY-MM-DD format.'),
  electricity_kwh: z.number().describe('Electricity usage in kilowatt-hours (kWh) for the day.'),
  diesel_liters: z.number().describe('Diesel consumption in liters for the day.'),
  production_units: z.number().describe('Number of production units completed for the day.'),
  production_hours: z.number().describe('Total hours of production for the day.'),
});

export const AnalyzeEmissionPatternsInputSchema = z.object({
  factoryName: z.string().describe('The name of the factory.'),
  industryType: z.string().describe('The type of industry the factory belongs to (e.g., textile, manufacturing, food processing).'),
  periodDescription: z.string().describe('A brief description of the period covered by the data (e.g., "last 30 days", "Q3 2023").'),
  operationalData: z.array(OperationalRecordSchema).describe('An array of daily operational data records for analysis.'),
});
export type AnalyzeEmissionPatternsInput = z.infer<typeof AnalyzeEmissionPatternsInputSchema>;

// SIMPLIFIED: Each insight is now a single string.
export const PatternInsightSchema = z.string().describe('A detailed explanation of the identified pattern, its impact, and supporting evidence, all in one paragraph.');

export const AnalyzeEmissionPatternsOutputSchema = z.object({
  overallEmissionSummary: z.string().describe("A concise summary of the factory's overall carbon emission patterns and general efficiency during the analyzed period, considering CO2 emissions."),
  peakUsageInsights: PatternInsightSchema.describe('Insights related to periods of highest energy or fuel consumption, leading to peak CO2 emissions.'),
  idleTimeInsights: PatternInsightSchema.describe('Insights regarding periods when machines were running but not actively producing, leading to wasted energy and CO2 emissions.'),
  inefficiencyInsights: PatternInsightSchema.describe('Insights identifying machines, processes, or days with unusually high energy/fuel consumption relative to production, indicating inefficiency and higher CO2.'),
  abnormalEnergySpikes: PatternInsightSchema.describe('Insights into any sudden, unusual increases in energy or fuel consumption, which translate to unexpected CO2 spikes.'),
  potentialSavingsOverview: z.string().describe('An overview of the total potential carbon emission and cost savings if the identified inefficiencies are addressed.'),
});
export type AnalyzeEmissionPatternsOutput = z.infer<typeof AnalyzeEmissionPatternsOutputSchema>;

// Schemas for generate-reduction-recommendations
export const GenerateReductionRecommendationsInputSchema = z.object({
  currentTotalEmissionsKgPerDay: z
    .number()
    .describe('The current estimated total carbon emissions in kg per day.'),
  emissionBreakdown: z
    .array(
      z.object({
        source: z
          .string()
          .describe(
            'The source of emissions (e.g., Electricity, Diesel, Oven 1, Machine X).'
          ),
        emissionsKgPerDay: z
          .number()
          .describe('Carbon emissions from this source in kg per day.'),
        percentageOfTotal: z
          .number()
          .describe('Percentage of total emissions from this source.'),
      })
    )
    .describe('Detailed breakdown of carbon emissions by source.'),
  identifiedOperationalInefficiencies: z
    .array(
      z.object({
        type: z
          .enum(['peak_usage', 'idle_time', 'inefficient_machine', 'abnormal_spike'])
          .describe('Type of inefficiency identified.'),
        description: z
          .string()
          .describe(
            'A detailed description of the identified inefficiency, including relevant data like machine IDs, timeframes, or energy consumption.'
          ),
        potentialImpactKgPerDay: z
          .number()
          .optional()
          .describe(
            'Estimated potential emission reduction in kg per day if this inefficiency is addressed.'
          ),
      })
    )
    .describe('A list of identified operational inefficiencies from pattern analysis.'),
  emissionFactors: z
    .object({
      electricityKgCo2PerKWh: z
        .number()
        .describe('Emission factor for electricity in kg CO2 per kWh.'),
      dieselKgCo2PerLiter: z
        .number()
        .describe('Emission factor for diesel in kg CO2 per liter.'),
      coalKgCo2PerKg: z
        .number()
        .describe('Emission factor for coal in kg CO2 per kg.'),
    })
    .describe('The emission factors used for calculations.'),
});
export type GenerateReductionRecommendationsInput = z.infer<typeof GenerateReductionRecommendationsInputSchema>;

export const GenerateReductionRecommendationsOutputSchema = z.object({
  recommendations: z
    .array(
      z.string().describe('A single, complete, actionable recommendation in a paragraph. It should include the what, why, and estimated impact.')
    )
    .describe('A list of smart, actionable recommendations to reduce carbon footprint.'),
});
export type GenerateReductionRecommendationsOutput = z.infer<typeof GenerateReductionRecommendationsOutputSchema>;
