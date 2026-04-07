'use client';

import { PageHeader } from '@/components/common/page-header';
import { useAppContext } from '@/lib/context';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Trash2, CalendarIcon, Loader, Cpu } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useFirebase } from '@/firebase';
import { addDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { collection, doc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const formSchema = z.object({
  date: z.date({ required_error: 'A date is required.' }),
  electricity_kwh: z.coerce.number().min(0, 'Must be a positive number.'),
  fuel_type: z.enum(['diesel', 'coal', 'natural_gas', 'propane', 'none']),
  fuel_amount: z.coerce.number().min(0, 'Must be a positive number.'),
  production_units: z.coerce.number().min(0, 'Must be a positive number.'),
  production_hours: z.coerce.number().min(0, 'Must be a positive number.'),
});

export default function DataEntryPage() {
  const { state } = useAppContext();
  const { firestore, user } = useFirebase();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      date: new Date(),
      electricity_kwh: 0,
      fuel_type: 'none',
      fuel_amount: 0,
      production_units: 0,
      production_hours: 0,
    },
  });

  const fuelType = form.watch('fuel_type');

  function onSubmit(values: z.infer<typeof formSchema>) {
    if (!firestore || !user) return;

    const newRecord = {
      date: format(values.date, 'yyyy-MM-dd'),
      electricity_kwh: values.electricity_kwh,
      fuel_type: values.fuel_type,
      fuel_amount: values.fuel_type === 'none' ? 0 : values.fuel_amount,
      production_units: values.production_units,
      production_hours: values.production_hours,
    };
    
    const collectionRef = collection(firestore, 'users', user.uid, 'operationalData');
    addDocumentNonBlocking(collectionRef, newRecord);

    toast({ title: "Record Added", description: `Data for ${newRecord.date} has been saved.` });
    form.reset({
        date: new Date(),
        electricity_kwh: 0,
        fuel_type: 'none',
        fuel_amount: 0,
        production_units: 0,
        production_hours: 0,
    });
  }

  function handleDelete(id: string) {
    if (!firestore || !user) return;
    const docRef = doc(firestore, 'users', user.uid, 'operationalData', id);
    deleteDocumentNonBlocking(docRef);
    toast({ title: "Record Deleted", variant: "destructive" });
  }

  const sortedData = [...state.operationalData].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <>
      <PageHeader title="Data Entry" subtitle="Add and manage your daily operational data." />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Add New Record</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="date"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant="outline"
                              className={cn(
                                'w-full pl-3 text-left font-normal',
                                !field.value && 'text-muted-foreground'
                              )}
                            >
                              {field.value ? format(field.value, 'MM/dd/yyyy') : <span>MM/DD/YYYY</span>}
                              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            disabled={(date) => date > new Date() || date < new Date('1900-01-01')}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="electricity_kwh"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Electricity (kWh)</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 120" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel_type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Fuel Type</FormLabel>
                      <Select
                        onValueChange={(value) => {
                          field.onChange(value);
                          if (value === 'none') {
                            form.setValue('fuel_amount', 0);
                          }
                        }}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a fuel type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="diesel">Diesel</SelectItem>
                          <SelectItem value="coal">Coal</SelectItem>
                          <SelectItem value="natural_gas">Natural Gas</SelectItem>
                          <SelectItem value="propane">Propane</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="fuel_amount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Fuel Amount
                        {fuelType === 'diesel' && ' (liters)'}
                        {fuelType === 'coal' && ' (kg)'}
                        {fuelType === 'natural_gas' && ' (m³)'}
                        {fuelType === 'propane' && ' (liters)'}
                      </FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 50" {...field} disabled={fuelType === 'none'} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="production_units"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Units</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 300" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="production_hours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Production Hours</FormLabel>
                      <FormControl>
                        <Input type="number" placeholder="e.g., 8" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full">Add Record</Button>
              </form>
            </Form>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Operational Data Records</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="max-h-[600px] overflow-auto">
                  {state.loading.data ? (
                     <div className="flex justify-center items-center h-40">
                        <Loader className="h-8 w-8 animate-spin" />
                      </div>
                  ) : (
                    <Table>
                        <TableHeader className="sticky top-0 bg-card">
                        <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead className="text-right">Electricity (kWh)</TableHead>
                            <TableHead className="text-right">Fuel</TableHead>
                            <TableHead className="text-right">Units</TableHead>
                            <TableHead className="text-right">Hours</TableHead>
                            <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                        </TableHeader>
                        <TableBody>
                        {sortedData.map((record) => (
                            <TableRow key={record.id}>
                                <TableCell>{format(new Date(record.date), 'MMM d, yyyy')}</TableCell>
                                <TableCell className="text-right">{record.electricity_kwh}</TableCell>
                                <TableCell className="text-right">
                                  {record.fuel_type && record.fuel_type !== 'none'
                                    ? `${record.fuel_amount} ${
                                        record.fuel_type === 'diesel' ? 'L' :
                                        record.fuel_type === 'coal' ? 'kg' :
                                        record.fuel_type === 'natural_gas' ? 'm³' :
                                        record.fuel_type === 'propane' ? 'L' : ''
                                      }`
                                    : 'N/A'}
                                </TableCell>
                                <TableCell className="text-right">{record.production_units}</TableCell>
                                <TableCell className="text-right">{record.production_hours}</TableCell>
                                <TableCell className="text-right">
                                    <div className="flex items-center justify-end space-x-1">
                                        <Button variant="ghost" size="icon" asChild>
                                          <Link href={`/dashboard/diagnostics?recordId=${record.id}`} title="Add Diagnostics">
                                            <Cpu className="h-4 w-4" />
                                          </Link>
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(record.id)} title="Delete Record">
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        </TableBody>
                    </Table>
                  )}
                    {(!state.loading.data && sortedData.length === 0) && <p className="text-center text-muted-foreground p-4">No data records found.</p>}
                </div>
            </CardContent>
        </Card>
      </div>
    </>
  );
}
