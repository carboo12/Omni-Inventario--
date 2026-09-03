
'use client';

import { Button } from '@/components/ui/button';
import { Eraser, Delete, ArrowUpRightFromSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface NumpadProps {
  onInput: (value: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onPay?: () => void;
  className?: string;
  showPayButton?: boolean;
  payButtonText?: string;
  isPayButtonDisabled?: boolean;
}

export function Numpad({ 
    onInput, 
    onBackspace, 
    onClear,
    onPay,
    className, 
    showPayButton = true,
    payButtonText = "Pagar",
    isPayButtonDisabled = false
}: NumpadProps) {
  const keys = ['7', '8', '9', '4', '5', '6', '1', '2', '3'];

  return (
    <div className={cn("flex flex-col gap-2 w-full", className)}>
        <div className="grid grid-cols-3 gap-2 flex-1">
            {keys.map((key) => (
                <Button
                key={key}
                onClick={() => onInput(key)}
                className="h-full text-2xl font-bold"
                variant="outline"
                >
                {key}
                </Button>
            ))}
        </div>
        <div className="grid grid-cols-3 gap-2 flex-1">
             <Button
                onClick={() => onInput('0')}
                className="h-full text-2xl font-bold col-span-2"
                variant="outline"
            >
                0
            </Button>
            <Button onClick={onBackspace} className="h-full" variant="outline">
                <Delete className="h-6 w-6" />
            </Button>
        </div>
        
        {showPayButton && (
            <div className="flex-1">
                 <Button
                    onClick={onPay}
                    className="h-full w-full text-lg font-bold"
                    disabled={isPayButtonDisabled}
                >
                    {isPayButtonDisabled && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {payButtonText}
                </Button>
            </div>
        )}
    </div>
  );
}
