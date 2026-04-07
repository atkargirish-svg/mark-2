'use client';

import { Bar, BarChart, CartesianGrid, Pie, PieChart, Line, LineChart, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent } from '@/components/ui/chart';
import type { ChartConfig } from '@/components/ui/chart';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { OperationalRecord } from '@/lib/types';
import { EMISSION_FACTORS } from '@/lib/types';
import { useMemo } from 'react';

// Emissions Line Chart
interface EmissionsLineChartProps {
  data: OperationalRecord[];
}

export function EmissionsLineChart({ data }: EmissionsLineChartProps) {
  const chartData = useMemo(() => {
    return data.map(record => {
      const electricityEmissions = record.electricity_kwh * EMISSION_FACTORS.electricityKgCo2PerKWh;
      let fuelEmissions = 0;
      switch (record.fuel_type) {
        case 'diesel':
          fuelEmissions = record.fuel_amount * EMISSION_FACTORS.dieselKgCo2PerLiter;
          break;
        case 'coal':
          fuelEmissions = record.fuel_amount * EMISSION_FACTORS.coalKgCo2PerKg;
          break;
        case 'natural_gas':
          fuelEmissions = record.fuel_amount * EMISSION_FACTORS.naturalGasKgCo2PerM3;
          break;
        case 'propane':
          fuelEmissions = record.fuel_amount * EMISSION_FACTORS.propaneKgCo2PerLiter;
          break;
      }
      return {
        date: record.date,
        "CO2 Emissions (kg)": parseFloat((electricityEmissions + fuelEmissions).toFixed(2)),
      }
    });
  }, [data]);

  const chartConfig = {
    'CO2 Emissions (kg)': {
      label: 'CO2 Emissions (kg)',
      color: 'hsl(var(--primary))',
    },
  } satisfies ChartConfig;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Daily Carbon Emissions</CardTitle>
        <CardDescription>Total CO₂ emissions (in kg) per day.</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[250px] w-full">
          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} tickFormatter={(value) => new Date(value.replace(/-/g, '/')).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} />
            <YAxis stroke="#888888" fontSize={12} tickLine={false} axisLine={false} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
            <Legend />
            <Line type="monotone" dataKey="CO2 Emissions (kg)" stroke="var(--color-CO2 Emissions (kg))" strokeWidth={2} dot={false} />
          </LineChart>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}

// Breakdown Pie Chart
interface BreakdownPieChartProps {
    data: OperationalRecord[];
}

export function BreakdownPieChart({ data }: BreakdownPieChartProps) {
    const chartData = useMemo(() => {
        const totalElectricity = data.reduce((sum, record) => sum + record.electricity_kwh, 0);
        const totalDiesel = data.reduce((sum, record) => sum + (record.fuel_type === 'diesel' ? record.fuel_amount : 0), 0);
        const totalCoal = data.reduce((sum, record) => sum + (record.fuel_type === 'coal' ? record.fuel_amount : 0), 0);
        const totalNaturalGas = data.reduce((sum, record) => sum + (record.fuel_type === 'natural_gas' ? record.fuel_amount : 0), 0);
        const totalPropane = data.reduce((sum, record) => sum + (record.fuel_type === 'propane' ? record.fuel_amount : 0), 0);

        const electricityEmissions = totalElectricity * EMISSION_FACTORS.electricityKgCo2PerKWh;
        const dieselEmissions = totalDiesel * EMISSION_FACTORS.dieselKgCo2PerLiter;
        const coalEmissions = totalCoal * EMISSION_FACTORS.coalKgCo2PerKg;
        const naturalGasEmissions = totalNaturalGas * EMISSION_FACTORS.naturalGasKgCo2PerM3;
        const propaneEmissions = totalPropane * EMISSION_FACTORS.propaneKgCo2PerLiter;
        
        const result = [];
        if (electricityEmissions > 0) {
            result.push({ source: 'electricity', value: parseFloat(electricityEmissions.toFixed(2)), fill: 'var(--color-electricity)' });
        }
        if (dieselEmissions > 0) {
            result.push({ source: 'diesel', value: parseFloat(dieselEmissions.toFixed(2)), fill: 'var(--color-diesel)' });
        }
        if (coalEmissions > 0) {
            result.push({ source: 'coal', value: parseFloat(coalEmissions.toFixed(2)), fill: 'var(--color-coal)' });
        }
        if (naturalGasEmissions > 0) {
            result.push({ source: 'natural_gas', value: parseFloat(naturalGasEmissions.toFixed(2)), fill: 'var(--color-natural_gas)' });
        }
        if (propaneEmissions > 0) {
            result.push({ source: 'propane', value: parseFloat(propaneEmissions.toFixed(2)), fill: 'var(--color-propane)' });
        }
        return result;
    }, [data]);

    const chartConfig = {
        value: {
            label: 'Emissions (kg)',
        },
        electricity: {
            label: 'Electricity',
            color: 'hsl(var(--chart-1))',
        },
        diesel: {
            label: 'Diesel',
            color: 'hsl(var(--chart-2))',
        },
        coal: {
            label: 'Coal',
            color: 'hsl(var(--chart-3))',
        },
        natural_gas: {
            label: 'Natural Gas',
            color: 'hsl(var(--chart-4))',
        },
        propane: {
            label: 'Propane',
            color: 'hsl(var(--chart-5))',
        },
    } satisfies ChartConfig;

    return (
        <Card>
            <CardHeader>
                <CardTitle>Emission Sources</CardTitle>
                <CardDescription>Breakdown of total emissions by source.</CardDescription>
            </CardHeader>
            <CardContent>
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                    <PieChart>
                        <ChartTooltip content={<ChartTooltipContent nameKey="source" hideLabel />} />
                        <Pie data={chartData} dataKey="value" nameKey="source" innerRadius={60} />
                        <ChartLegend content={<ChartLegendContent nameKey="source" />} />
                    </PieChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
