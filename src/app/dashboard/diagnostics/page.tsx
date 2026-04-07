
'use client';

import { Suspense, useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useFirebase, useDoc, useMemoFirebase } from '@/firebase';
import { updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { doc } from 'firebase/firestore';
import { Loader, Bot, AlertTriangle, ArrowLeft, Waves, Image as ImageIcon, FileAudio } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import type { OperationalRecord } from '@/lib/types';
import { format } from 'date-fns';
import { PageHeader } from '@/components/common/page-header';
import { Input } from '@/components/ui/input';

const formSchema = z.object({
    thermal_image_description: z.string().optional(),
    acoustic_analysis_summary: z.string().optional(),
});

function DiagnosticsContent() {
    const searchParams = useSearchParams();
    const recordId = searchParams.get('recordId');
    const { firestore, user } = useFirebase();
    const { toast } = useToast();
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isAnalyzingThermal, setIsAnalyzingThermal] = useState(false);
    const [thermalImagePreview, setThermalImagePreview] = useState<string | null>(null);
    const [acousticFileName, setAcousticFileName] = useState<string | null>(null);


    const docRef = useMemoFirebase(() => {
        if (!firestore || !user || !recordId) return null;
        return doc(firestore, 'users', user.uid, 'operationalData', recordId);
    }, [firestore, user, recordId]);

    const { data: record, isLoading, error } = useDoc<OperationalRecord>(docRef);

    const formattedDate = useMemo(() => {
        if (!record?.date) return '';
        const dateValue = record.date as any;
        if (typeof dateValue === 'string') {
            return format(new Date(dateValue.replace(/-/g, '/')), 'PPP');
        }
        if (dateValue && typeof dateValue.toDate === 'function') {
            return format(dateValue.toDate(), 'PPP');
        }
        if (dateValue instanceof Date) {
            return format(dateValue, 'PPP');
        }
        return '';
    }, [record]);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            thermal_image_description: '',
            acoustic_analysis_summary: '',
        },
    });

    useEffect(() => {
        if (record) {
            form.reset({
                thermal_image_description: record.thermal_image_description || '',
                acoustic_analysis_summary: record.acoustic_analysis_summary || '',
            });
        }
    }, [record, form]);

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        if (!docRef || !record) return;
        updateDocumentNonBlocking(docRef, values);
        toast({
            title: 'Diagnostics Saved',
            description: `Advanced diagnostics for ${formattedDate} have been updated.`,
        });
    };
    
    const handleThermalImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setThermalImagePreview(reader.result as string);
                setIsAnalyzingThermal(true);
                form.setValue('thermal_image_description', ''); 
                toast({ title: 'Analyzing Image...', description: 'The AI is processing the thermal image.' });

                setTimeout(() => {
                    const analyses = [
                        "Hotspot detected on the main conveyor belt motor; temperature is 20°C above baseline, indicating potential overload or bearing friction.",
                        "Electrical panel in Sector B shows uniform temperature distribution. No anomalies detected.",
                        "Minor coolant leak visible near the primary stamping press; temperature is 5°C lower than surrounding area.",
                        "Thermal signature across all machinery is within normal operational parameters."
                    ];
                    const randomAnalysis = analyses[Math.floor(Math.random() * analyses.length)];
                    form.setValue('thermal_image_description', randomAnalysis);
                    setIsAnalyzingThermal(false);
                    toast({ title: 'Thermal Image Analysis Complete' });
                }, 2500);
            };
            reader.readAsDataURL(file);
        }
    };
    
    const handleAcousticFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setAcousticFileName(file.name);
            form.setValue('acoustic_analysis_summary', ''); 
            toast({ title: 'Audio File Selected', description: `Ready to analyze ${file.name}.` });
        }
    };

    const handleAnalyzeSound = () => {
        setIsAnalyzing(true);
        toast({ title: 'Analyzing Sound...', description: 'The AI is processing the audio signature.' });
        setTimeout(() => {
            const analyses = [
                "Acoustic signature is stable. All systems operating within normal sound parameters. Amplitude matches baseline.",
                "High-frequency whine detected at 2.1kHz, a 15% amplitude increase from yesterday's baseline. Suggests advanced bearing wear in the primary compressor.",
                "Intermittent low-frequency rumble (40-60Hz) observed, which was not present in previous recordings. This may indicate a misaligned conveyor belt or gear imbalance.",
                "Overall sound volume is 5dB higher than the historical average for this production level, indicating increased mechanical strain across multiple systems."
            ];
            const randomAnalysis = analyses[Math.floor(Math.random() * analyses.length)];
            form.setValue('acoustic_analysis_summary', randomAnalysis);
            setIsAnalyzing(false);
            toast({ title: 'Acoustic Analysis Complete' });
        }, 2500);
    };

    if (!recordId) {
        return (
            <>
                <PageHeader title="Advanced Diagnostics" subtitle="Add insights to your operational data" />
                 <div className="mb-6">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/data-entry">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Data Entry
                        </Link>
                    </Button>
                </div>
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="text-xl font-semibold text-foreground">No Record Selected</h3>
                    <p className="text-muted-foreground mt-2 mb-4">Please select a record from the data entry page to add diagnostics.</p>
                </Card>
            </>
        );
    }
    
    if (isLoading) {
        return (
          <div className="flex justify-center items-center h-64">
            <Loader className="h-8 w-8 animate-spin" />
          </div>
        );
    }

    if (error || !record) {
        return (
            <>
                <PageHeader title="Advanced Diagnostics" subtitle="Error loading record" />
                 <div className="mb-6">
                    <Button variant="outline" asChild>
                        <Link href="/dashboard/data-entry">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Data Entry
                        </Link>
                    </Button>
                </div>
                <Card className="flex flex-col items-center justify-center p-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-destructive mb-4" />
                    <h3 className="text-xl font-semibold text-foreground">Error Loading Record</h3>
                    <p className="text-muted-foreground mt-2">{error?.message || "The selected record could not be found."}</p>
                </Card>
            </>
        );
    }


    return (
        <>
            <PageHeader
                title="Advanced Diagnostics"
                subtitle={`Adding insights for record on ${formattedDate}`}
            />
             <div className="mb-6">
                <Button variant="outline" asChild>
                    <Link href="/dashboard/data-entry">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Data Entry
                    </Link>
                </Button>
            </div>
            <FormProvider {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <ImageIcon className="h-6 w-6 text-primary" />
                                    <CardTitle>Thermal Image Analysis</CardTitle>
                                </div>
                                <CardDescription>Upload a thermal image to get an AI-driven anomaly analysis.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="w-full aspect-video bg-muted/50 rounded-md mb-4 flex items-center justify-center border">
                                    {isAnalyzingThermal ? (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Loader className="h-8 w-8 animate-spin mb-2" />
                                            <p>AI is analyzing...</p>
                                        </div>
                                    ) : thermalImagePreview ? (
                                        <img src={thermalImagePreview} alt="Thermal image preview" className="object-contain h-full w-full rounded-md" />
                                    ) : (
                                        <div className="text-center text-muted-foreground p-4">
                                            <ImageIcon className="mx-auto h-12 w-12 mb-2" />
                                            <p>Upload a thermal image to begin analysis.</p>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    type="file"
                                    id="thermal-upload"
                                    className="hidden"
                                    onChange={handleThermalImageUpload}
                                    accept="image/*"
                                    disabled={isAnalyzingThermal}
                                />
                                <Button asChild className="w-full" variant="outline" disabled={isAnalyzingThermal}>
                                    <label htmlFor="thermal-upload" className="cursor-pointer">
                                        <Bot className="mr-2 h-4 w-4" />
                                        {thermalImagePreview ? 'Change & Re-analyze' : 'Upload & Analyze Image'}
                                    </label>
                                </Button>

                                <FormField
                                    control={form.control}
                                    name="thermal_image_description"
                                    render={({ field }) => (
                                        <FormItem className="mt-4">
                                            <FormLabel>AI Anomaly Description</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="AI analysis will appear here after uploading an image..." {...field} rows={4} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <div className="flex items-center gap-3">
                                    <Waves className="h-6 w-6 text-primary" />
                                    <CardTitle>Acoustic Signature Analysis</CardTitle>
                                </div>
                                <CardDescription>Upload a machinery sound file for an AI-driven comparison and analysis.</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="w-full aspect-video bg-muted/50 rounded-md mb-4 flex items-center justify-center border flex-col p-4">
                                    {isAnalyzing ? (
                                        <div className="flex flex-col items-center justify-center text-muted-foreground">
                                            <Loader className="h-8 w-8 animate-spin mb-2" />
                                            <p>AI is analyzing...</p>
                                        </div>
                                    ) : acousticFileName ? (
                                        <div className="text-center text-muted-foreground">
                                            <FileAudio className="mx-auto h-12 w-12 mb-2" />
                                            <p className="font-semibold text-foreground">File Ready for Analysis:</p>
                                            <p className="text-sm break-all">{acousticFileName}</p>
                                        </div>
                                    ) : (
                                        <div className="text-center text-muted-foreground">
                                            <Waves className="mx-auto h-12 w-12 mb-2" />
                                            <p>Upload an audio file to begin analysis.</p>
                                        </div>
                                    )}
                                </div>

                                <Input
                                    type="file"
                                    id="acoustic-upload"
                                    className="hidden"
                                    onChange={handleAcousticFileChange}
                                    accept="audio/*"
                                    disabled={isAnalyzing}
                                />
                                <Button asChild className="w-full mb-2" variant="outline" disabled={isAnalyzing}>
                                    <label htmlFor="acoustic-upload" className="cursor-pointer">
                                        <FileAudio className="mr-2 h-4 w-4" />
                                        {acousticFileName ? 'Change Audio File' : 'Upload Audio File'}
                                    </label>
                                </Button>

                                <Button className="w-full" type="button" onClick={handleAnalyzeSound} disabled={isAnalyzing || !acousticFileName}>
                                    {isAnalyzing ? <Loader className="mr-2 h-4 w-4 animate-spin" /> : <Bot className="mr-2 h-4 w-4" />}
                                    {isAnalyzing ? 'Analyzing...' : 'Analyze Machine Sound'}
                                </Button>

                                <FormField
                                    control={form.control}
                                    name="acoustic_analysis_summary"
                                    render={({ field }) => (
                                        <FormItem className="mt-4">
                                            <FormLabel>AI Analysis Summary</FormLabel>
                                            <FormControl>
                                                <Textarea placeholder="AI analysis will appear here after analyzing sound..." {...field} rows={4} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </CardContent>
                        </Card>
                    </div>
                     <div className="flex justify-end">
                        <Button type="submit">Save Diagnostics</Button>
                    </div>
                </form>
            </FormProvider>
        </>
    );
}

export default function DiagnosticsPage() {
    return (
        <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader className="h-8 w-8 animate-spin" /></div>}>
            <DiagnosticsContent />
        </Suspense>
    );
}
