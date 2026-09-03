import React from 'react';
import { CartItem } from '@/lib/types';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn, formatNumber } from '@/lib/utils';
import { useSettings } from '@/hooks/use-settings';

interface CartTicketProps {
    cart: CartItem[];
    subtotal: number;
    tax: number;
    total: number;
    currency?: 'NIO' | 'USD';
    onRemoveItem?: (productId: string) => void;
    onUpdateQuantity?: (productId: string, quantity: number) => void;
    selectedItemId?: string | null;
    onSelectItem?: (itemId: string) => void;
    onEditItem?: (item: CartItem) => void;
    getProductPrice?: (product: any, priceLevel: number) => number;
    priceLevel?: number;
}

export const CartTicket = ({
    cart,
    subtotal,
    tax,
    total,
    currency = 'NIO',
    onRemoveItem,
    onUpdateQuantity,
    selectedItemId,
    onSelectItem,
    onEditItem,
    getProductPrice,
    priceLevel = 1,
}: CartTicketProps) => {

    const { settings } = useSettings();

    const formatCurrencyDisplay = (amount: number) => {
        return `C$${formatNumber(amount)}`;
    };

    const formatUSD = (amount: number) => {
        const rate = parseFloat(settings.exchangeRate) || 36.5; 
        return `$${formatNumber(amount / rate)}`;
    };

    return (
        <div className="flex flex-col h-full bg-white text-black border-r shadow-lg">
            {/* Header */}
            <div className="bg-gray-800 text-white p-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 sm:gap-2 text-xs font-bold min-h-[50px]">
                <div className="flex items-center gap-2 overflow-hidden w-full sm:w-auto">
                    {settings?.logoSvg && (
                        <div 
                            dangerouslySetInnerHTML={{ __html: settings.logoSvg }} 
                            className="w-8 h-8 flex-shrink-0 flex items-center justify-center p-0.5 [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full"
                            style={{ 
                                maxWidth: '32px', 
                                maxHeight: '32px',
                                fill: 'white'
                            }}
                        />
                    )}
                    <span className="truncate">FACTURA: CONTADO</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                    <input type="checkbox" className="accent-blue-500 h-3.5 w-3.5" />
                    <span className="text-[10px] sm:text-xs">Selección Múltiple</span>
                </div>
            </div>

            {/* Column Headers */}
            <div className="grid grid-cols-12 gap-1 px-2 py-3 text-[10px] font-black border-b bg-gray-100 tracking-normal uppercase">
                <div className="col-span-3">Producto</div>
                <div className="col-span-2 text-center">Cant</div>
                <div className="col-span-3 text-right">Precio</div>
                <div className="col-span-2 text-right">Desc</div>
                <div className="col-span-2 text-right">Total</div>
            </div>

            {/* Cart Items */}
            <ScrollArea className="flex-1 min-h-0 bg-white">
                <div className="flex flex-col">
                    {cart.length === 0 ? (
                        <div className="p-12 text-center text-gray-400 text-sm font-medium uppercase tracking-widest">
                            NO HAY ARTÍCULOS
                        </div>
                    ) : (
                        cart.map((item, index) => (
                            <div 
                                key={item.id}
                                onClick={() => onEditItem ? onEditItem(item) : onSelectItem?.(item.id)}
                                className={cn(
                                    "grid grid-cols-12 gap-1 p-2 text-[11px] border-b cursor-pointer hover:bg-blue-50 transition-colors",
                                    selectedItemId === item.id ? "bg-gray-800 text-white hover:bg-gray-700" : (index % 2 === 0 ? "bg-white" : "bg-gray-50")
                                )}
                            >
                                <div className="col-span-3 truncate font-medium">
                                    <div className="font-bold text-[9px] opacity-70 truncate">{item.product.barcode || '0000'}</div>
                                    <div className="truncate font-black uppercase text-[10px]">{item.product.name}</div>
                                </div>
                                <div className="col-span-2 text-center flex items-center justify-center font-bold">
                                    {item.quantity.toFixed(2)}
                                </div>
                                <div className="col-span-3 text-right flex items-center justify-end">
                                    {formatNumber(getProductPrice ? getProductPrice(item.product, priceLevel) : item.product.priceNIO)}
                                </div>
                                <div className="col-span-2 text-right flex items-center justify-end text-red-500">
                                    0.0
                                </div>
                                <div className="col-span-2 text-right font-black flex items-center justify-end">
                                    {formatNumber((getProductPrice ? getProductPrice(item.product, priceLevel) : item.product.priceNIO) * item.quantity)}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </ScrollArea>

            {/* Footer Totals */}
            <div className="bg-white border-t p-3 space-y-2">
                <div className="flex justify-between text-[11px] text-gray-600 font-bold uppercase tracking-tight">
                    <div className="flex gap-3">
                        <span>Servicio: <span className="text-black">0.00</span></span>
                        <span>Imp: <span className="text-black">{formatNumber(tax)}</span></span>
                    </div>
                    <div>
                        Sub: <span className="text-black">{formatNumber(subtotal)}</span>
                    </div>
                </div>

                <div className="flex justify-between items-center mt-1 py-2 border-t border-b-2 border-gray-100">
                    <div className="text-xl font-black text-[#673AB7] tracking-tighter">TOTAL NIO</div>
                    <div className="text-3xl font-black text-[#673AB7]">{formatNumber(total)}</div>
                </div>

                <div className="flex justify-between items-center text-sm font-black uppercase">
                    <div className="text-gray-500">Total $</div>
                    <div className="text-gray-900">{formatUSD(total)}</div>
                </div>

                <div className="flex justify-between text-[11px] text-gray-600 font-black uppercase mt-2 bg-gray-50 p-2 rounded border border-gray-100">
                    <span className="opacity-50">{settings.exchangeRate} NIO/USD</span>
                    <div className="flex gap-4">
                        <span>LIN: {cart.length}</span>
                        <span>PZ: {cart.reduce((acc, item) => acc + item.quantity, 0)}</span>
                    </div>
                </div>
            </div>
            
            {/* Receipt Zigzag Effect */}
            <div className="h-2 bg-gray-800 w-full relative overflow-hidden">
                 <div className="absolute top-0 left-0 w-full h-full bg-repeat-x" style={{
                     backgroundImage: 'linear-gradient(45deg, transparent 33.333%, #333 33.333%, #333 66.667%, transparent 66.667%), linear-gradient(-45deg, transparent 33.333%, #333 33.333%, #333 66.667%, transparent 66.667%)',
                     backgroundSize: '10px 20px',
                     backgroundPosition: '0 -10px'
                 }}></div>
            </div>
        </div>
    );
};
