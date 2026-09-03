
"use client";

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from '@/lib/router-nav';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from '@/components/ui/form';
import { useAuth } from '@/hooks/use-auth';
import { useCashRegister } from '@/hooks/use-cash-register';
import { useBusinessMode } from '@/hooks/use-business-mode';
import { Loader2, Wallet } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Numpad } from '@/components/cash-register/numpad';

const denominations = {
  bills: [1000, 500, 200, 100, 50, 20, 10],
  coins: [5, 1, 0.50, 0.25],
};

const formSchema = z.object({
  denominations: z.record(z.coerce.number().min(0).default(0)),
  initialAmountUSD: z.coerce.number().min(0).default(0),
});

type FormValues = z.infer<typeof formSchema>;

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('es-NI', { style: 'currency', currency: 'NIO' }).format(amount);
};


export default function OpenCashRegisterPage() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const { openCashRegister, isCashRegisterOpen } = useCashRegister();
  const { mode } = useBusinessMode();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);

  useEffect(() => {
    if (user && !['cashier', 'admin', 'master-admin'].includes(user.role)) {
      router.replace('/dashboard');
    }
    if (isCashRegisterOpen) {
      router.replace(mode === 'JEWELRY' ? '/jewelry/sales' : '/pos');
    }
  }, [user, isCashRegisterOpen, router]);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      denominations: {},
      initialAmountUSD: 0,
    },
  });

  const watchedDenominations = useWatch({ control: form.control, name: 'denominations' });

  const totalAmount = useMemo(() => {
    return Object.entries(watchedDenominations).reduce((acc, [key, quantity]) => {
      const value = parseFloat(key.replace('d_', '').replace('_', '.'));
      return acc + value * (quantity || 0);
    }, 0);
  }, [watchedDenominations]);

  const handleSubmit = (data: FormValues) => {
    setIsSubmitting(true);
    setTimeout(() => {
      openCashRegister(totalAmount, data.initialAmountUSD);
      router.push(mode === 'JEWELRY' ? '/jewelry/sales' : '/pos');
    }, 500);
  };

  const handleNumpadInput = (value: string) => {
    if (!activeField) return;
    const currentVal = form.getValues(activeField as any) || '';
    form.setValue(activeField as any, parseInt(`${currentVal}${value}`, 10));
  };

  const handleNumpadBackspace = () => {
    if (!activeField) return;
    const currentVal = String(form.getValues(activeField as any) || '');
    const newVal = currentVal.slice(0, -1);
    form.setValue(activeField as any, newVal === '' ? 0 : parseInt(newVal, 10));
  };

  const handleNumpadClear = () => {
    if (!activeField) return;
    form.setValue(activeField as any, 0);
  };

  // Show loading state while authentication is being verified
  if (loading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-8rem)]">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  if (!user || !['cashier', 'admin', 'master-admin'].includes(user.role) || isCashRegisterOpen) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card className="w-full flex flex-col h-[calc(100vh-8rem)] max-h-[750px] overflow-hidden">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleSubmit)} className="flex flex-col h-full">
            <CardHeader className="flex-shrink-0 border-b pb-4">
              <CardTitle>Apertura de Caja</CardTitle>
              <CardDescription>
                Ingrese la cantidad de billetes y monedas para calcular el monto inicial.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-0">
              <div className="space-y-6 px-6 pb-6">
                  <div>
                    <h3 className="mb-4 text-lg font-medium text-primary">Billetes (C$)</h3>
                    <div className="space-y-4">
                      {denominations.bills.map((bill) => {
                        const fieldName = `denominations.d_${bill}` as const;
                        const quantity = watchedDenominations?.[`d_${bill}`] ?? 0;
                        const subtotal = bill * quantity;

                        return (
                          <div key={bill} className="grid grid-cols-3 items-center gap-4">
                            <FormLabel className="text-right font-semibold">{formatCurrency(bill)}</FormLabel>
                            <FormField
                              control={form.control}
                              name={fieldName}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="text-center"
                                      {...field}
                                      value={field.value || ''}
                                      onChange={e => field.onChange(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10)))}
                                      onFocus={() => setActiveField(fieldName)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <span className="text-right text-muted-foreground">{formatCurrency(subtotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="mb-4 text-lg font-medium text-primary">Monedas (C$)</h3>
                    <div className="space-y-4">
                      {denominations.coins.map((coin) => {
                        const fieldName = `denominations.d_${String(coin).replace('.', '_')}` as const;
                        const quantity = watchedDenominations?.[`d_${String(coin).replace('.', '_')}`] ?? 0;
                        const subtotal = coin * quantity;

                        return (
                          <div key={coin} className="grid grid-cols-3 items-center gap-4">
                            <FormLabel className="text-right font-semibold">{formatCurrency(coin)}</FormLabel>
                            <FormField
                              control={form.control}
                              name={fieldName}
                              render={({ field }) => (
                                <FormItem>
                                  <FormControl>
                                    <Input
                                      type="number"
                                      placeholder="0"
                                      className="text-center"
                                      {...field}
                                      value={field.value || ''}
                                      onChange={e => field.onChange(e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10)))}
                                      onFocus={() => setActiveField(fieldName)}
                                    />
                                  </FormControl>
                                </FormItem>
                              )}
                            />
                            <span className="text-right text-muted-foreground">{formatCurrency(subtotal)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  <div className="bg-green-50 p-4 rounded-xl border border-green-100">
                    <h3 className="mb-4 text-lg font-medium text-green-700">Fondo Inicial en Dólares ($)</h3>
                    <div className="grid grid-cols-2 items-center gap-4">
                      <FormLabel className="text-right font-semibold text-green-700">Total USD</FormLabel>
                      <FormField
                        control={form.control}
                        name="initialAmountUSD"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                className="text-center font-bold border-green-300 focus-visible:ring-green-500"
                                {...field}
                                value={field.value || ''}
                                onChange={e => field.onChange(e.target.value === '' ? 0 : parseFloat(e.target.value))}
                                onFocus={() => setActiveField('initialAmountUSD')}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>
            </CardContent>
            <CardFooter className="flex-shrink-0 flex-col items-stretch space-y-4 border-t pt-6">
              <div className='flex justify-between items-center'>
                <span className='text-xl font-bold text-primary'>Total Inicial</span>
                <span className='text-2xl font-bold'>{formatCurrency(totalAmount)}</span>
              </div>
              <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isSubmitting ? 'Abriendo...' : 'Confirmar y Abrir Caja'}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <div className="hidden md:block">
        <div className="sticky top-24">
          <div className="flex justify-center">
            <Numpad
              onInput={handleNumpadInput}
              onBackspace={handleNumpadBackspace}
              onClear={handleNumpadClear}
              showPayButton={false}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

