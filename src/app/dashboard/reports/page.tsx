'use client';

import { PageHeader } from '@/components/common/page-header';
import { useAppContext } from '@/lib/context';
import { Button } from '@/components/ui/button';
import { Printer, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { Logo } from '@/components/common/logo';

export default function ReportsPage() {
  const { state } = useAppContext();
  const { operationalData, analysis, recommendations } = state;
  const hasContent = operationalData.length > 0 && analysis && recommendations;
  
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <div className="flex justify-between items-center print:hidden">
        <PageHeader title="Reports" subtitle="Generate and view reports for certification and review." />
        <Button onClick={handlePrint} disabled={!hasContent}>
          <Printer className="mr-2 h-4 w-4" />
          Print Report
        </Button>
      </div>

      {!hasContent && (
        <Card className="flex flex-col items-center justify-center p-12 text-center print:hidden">
            <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold text-foreground">Incomplete Data</h3>
            <p className="text-muted-foreground mt-2">Please add data, run an analysis, and generate recommendations to create a full report.</p>
        </Card>
      )}

      {hasContent && (
        <Card id="report-content" className="p-4 sm:p-6 md:p-8">
            <div className="print:block hidden mb-8">
                <Logo />
                <h1 className="text-3xl font-bold mt-2">Carbon Emission Report</h1>
                <p className="text-muted-foreground">Generated on {format(new Date(), 'PPP')}</p>
            </div>
            
            <div className="space-y-8">
            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">1. Executive Summary</h2>
              {analysis.overallEmissionSummary && (
                <p className="text-muted-foreground">{analysis.overallEmissionSummary}</p>
              )}
              {analysis.potentialSavingsOverview && (
                <p className="mt-2 text-muted-foreground">{analysis.potentialSavingsOverview}</p>
              )}
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">2. Key Recommendations</h2>
              <div className="space-y-4">
                {recommendations.recommendations.map((rec, index) => (
                    <div key={index} className="p-4 border rounded-lg">
                        <h3 className="font-medium text-foreground mb-2">Recommendation #{index + 1}</h3>
                        <p className="text-muted-foreground">{rec}</p>
                    </div>
                ))}
              </div>
            </section>

            <section>
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">3. AI-Identified Inefficiencies</h2>
              <ul className="list-disc pl-5 space-y-2 text-muted-foreground">
                <li><strong className="font-medium text-foreground">Peak Usage:</strong> {analysis.peakUsageInsights}</li>
                <li><strong className="font-medium text-foreground">Idle Time:</strong> {analysis.idleTimeInsights}</li>
                <li><strong className="font-medium text-foreground">Inefficiencies:</strong> {analysis.inefficiencyInsights}</li>
                <li><strong className="font-medium text-foreground">Abnormal Spikes:</strong> {analysis.abnormalEnergySpikes}</li>
              </ul>
            </section>

            <Separator className="my-8" />
            
            <section className="break-before-page">
              <h2 className="text-2xl font-semibold border-b pb-2 mb-4">4. Raw Operational Data</h2>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Electricity (kWh)</TableHead>
                    <TableHead>Fuel Type</TableHead>
                    <TableHead>Fuel Amount</TableHead>
                    <TableHead>Production Units</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operationalData.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell>{format(new Date(record.date.replace(/-/g, '/')), 'yyyy-MM-dd')}</TableCell>
                      <TableCell>{record.electricity_kwh}</TableCell>
                      <TableCell>{record.fuel_type === 'none' ? 'N/A' : record.fuel_type}</TableCell>
                      <TableCell>
                        {record.fuel_type !== 'none' && record.fuel_amount > 0
                            ? `${record.fuel_amount} ${
                                record.fuel_type === 'diesel' ? 'L' :
                                record.fuel_type === 'coal' ? 'kg' :
                                record.fuel_type === 'natural_gas' ? 'm³' :
                                record.fuel_type === 'propane' ? 'L' : ''
                              }`
                            : '-'}
                      </TableCell>
                      <TableCell>{record.production_units}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </section>
            </div>
        </Card>
      )}

      <style jsx global>{`
        @media print {
            body * {
                visibility: hidden;
            }
            #report-content, #report-content * {
                visibility: visible;
            }
            #report-content {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                border: none;
                box-shadow: none;
            }
            .break-before-page {
              page-break-before: always;
            }
        }
      `}</style>
    </>
  );
}
