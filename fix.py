import re

file_path = 'src/app/(app)/pos/client.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

fix_block = '''            <QuickSwitchModal
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
                            ?? Imprimir Ticket
                        </Button>
                        <Button
                            size="sm"
                            variant={printFormat === 'invoice' ? 'default' : 'outline'}
                            onClick={() => setPrintFormat('invoice')}
                        >
                            ?? Imprimir Factura (Hoja Completa)
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
    pharmacyName: settings.ticketHeader.name,'''

pattern = re.compile(r'            <QuickSwitchModal[\s\S]*?pharmacyName: settings\.ticketHeader\.name,')
content_new = pattern.sub(fix_block, content, count=1)

if content != content_new:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content_new)
    print("Fixed!")
else:
    print("No match found!")

