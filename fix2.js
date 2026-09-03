const fs = require('fs');
const file = 'src/app/(app)/pos/client.tsx';
let content = fs.readFileSync(file, 'utf8');

const fixBlock = `            <ItemEditDialog
                item={editingItem}
                onClose={() => setEditingItem(null)}
                onSave={handleSaveItemEdit}
                onRemove={handleRemoveItem}
            />

            <QuickSwitchModal
                open={showQuickSwitch}
                onOpenChange={setShowQuickSwitch}
            />

            {printFormat === 'invoice'
                ? (lastSale && <FullPageInvoiceTemplate {...lastSale} />)
                : (lastSale && <ReceiptTemplate {...lastSale} />)}
            <Dialog open={!!lastSale} onOpenChange={(open: boolean) => { if (!open) setLastSale(null); }}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Vista Previa de Factura</DialogTitle>
                    </DialogHeader>
                    <div className="flex items-center justify-center gap-2 py-2">
                        <Button
                            size="sm"
                            variant={printFormat === 'ticket' ? 'default' : 'outline'}
                            onClick={() => setPrintFormat('ticket')}
                        >
                            🧾 Imprimir Ticket
                        </Button>
                        <Button
                            size="sm"
                            variant={printFormat === 'invoice' ? 'default' : 'outline'}
                            onClick={() => setPrintFormat('invoice')}
                        >
                            📄 Imprimir Factura (Hoja Completa)
                        </Button>
                    </div>
                    <div className="flex justify-center p-4 max-h-[60vh] overflow-y-auto">
                        {lastSale && printFormat === 'invoice'
                            ? <FullPageInvoiceTemplate {...lastSale} previewMode />
                            : (lastSale && <ReceiptTemplate {...lastSale} previewMode />)}
                    </div>
                    <DialogFooter>
                        <Button onClick={() => {
                            savePreferredPrintFormat(printFormat);
                            setTimeout(() => {
                                window.print();
                                setTimeout(() => setLastSale(null), 500);
                            }, 200);
                        }}>Imprimir</Button>
                        <Button variant="outline" onClick={() => setLastSale(null)}>Cerrar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <RetiroDialog
                isOpen={isRetiroOpen}
                onClose={() => setIsRetiroOpen(false)}
                onConfirm={handleRetiroConfirm}
                isLoading={isRetiroSaving}
            />
            {lastRetiro && <RetiroReceiptTemplate {...lastRetiro} />}
        </div>
    );
};
// #endregion

import { AdminAuthDialog } from '@/components/pos/admin-auth-dialog';
import { CreditNoteDialog } from '@/components/pos/credit-note-dialog';
import { HelpDialog } from '@/components/pos/help-dialog';
import { HelpCircle, FolderOpen, Printer } from 'lucide-react';
import { OpenDrawerTemplate } from '@/components/pos/open-drawer-template';
import { createOutflowAction } from '@/lib/actions/cash-register';
import { RetiroDialog } from '@/components/pos/retiro-dialog';
import { RetiroReceiptTemplate } from '@/components/pos/retiro-receipt-template';

// Prepara los datos del comprobante de retiro/salida de efectivo.
const prepareRetiroReceiptData = (settings: any, user: any, activeSession: any, result: any, amount: number, reason: string) => ({
    pharmacyName: settings.ticketHeader.name,
    address: settings.ticketHeader.address,
    phone: settings.ticketHeader.phone,
    rfc: settings.ticketHeader.rfc,
    ticketId: \`#\${result.receiptNumber}\`,
    date: new Date(),
    cashierName: user?.name || activeSession?.cashierName || 'Cajero',
    amount,
    reason,
    footerMessage: settings.ticketFooter.message,
    website: settings.ticketFooter.website,
    logoSvg: settings.logoSvg,
});

// CashierOnlyPOS component - This is the main one to redesign as per screenshots
const CashierOnlyPOS = ({ products, inventory }: POSComponentProps) => {
    const { user } = useAuth();
    const { mode } = useBusinessMode();`;

const regex = /            <ItemEditDialog[\s\S]*?const { mode } = useBusinessMode\(\);/m;
const match = content.match(regex);
if (match) {
    content = content.replace(regex, fixBlock);
    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed successfully');
} else {
    console.log('Match not found');
}
