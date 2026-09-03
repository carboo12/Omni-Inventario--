import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Keyboard, MousePointerClick, Monitor } from "lucide-react";

interface HelpDialogProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpDialog({ isOpen, onClose }: HelpDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold flex items-center gap-2">
                        <Monitor className="w-6 h-6" /> Centro de Ayuda POS
                    </DialogTitle>
                    <DialogDescription>
                        Guía rápida de atajos, botones y funciones del sistema.
                    </DialogDescription>
                </DialogHeader>

                <Tabs defaultValue="shortcuts" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="shortcuts">Atajos de Teclado</TabsTrigger>
                        <TabsTrigger value="buttons">Botones y Acciones</TabsTrigger>
                        <TabsTrigger value="screens">Pantallas</TabsTrigger>
                    </TabsList>

                    <TabsContent value="shortcuts" className="mt-4">
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[150px]">Tecla</TableHead>
                                        <TableHead>Acción</TableHead>
                                        <TableHead>Descripción</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    <TableRow>
                                        <TableCell className="font-bold"><kbd className="bg-gray-100 px-2 py-1 rounded border">F1</kbd></TableCell>
                                        <TableCell className="font-medium text-green-600">Cobrar</TableCell>
                                        <TableCell>Abre la ventana de pago para finalizar la venta actual.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-bold"><kbd className="bg-gray-100 px-2 py-1 rounded border">F2</kbd></TableCell>
                                        <TableCell className="font-medium text-purple-600">Poner en Espera</TableCell>
                                        <TableCell>Guarda temporalmente la venta actual para atender a otro cliente.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-bold"><kbd className="bg-gray-100 px-2 py-1 rounded border">F3</kbd></TableCell>
                                        <TableCell className="font-medium text-red-600">Nota de Crédito</TableCell>
                                        <TableCell>Inicia el proceso de devolución (requiere autorización admin).</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-bold"><kbd className="bg-gray-100 px-2 py-1 rounded border">F10</kbd></TableCell>
                                        <TableCell className="font-medium">Ver Facturas en Espera</TableCell>
                                        <TableCell>Muestra la lista de ventas guardadas para retomarlas.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-bold"><kbd className="bg-gray-100 px-2 py-1 rounded border">Delete</kbd></TableCell>
                                        <TableCell className="font-medium text-orange-600">Limpiar / Borrar</TableCell>
                                        <TableCell>Elimina todos los productos del carrito actual.</TableCell>
                                    </TableRow>
                                    <TableRow>
                                        <TableCell className="font-bold"><kbd className="bg-gray-100 px-2 py-1 rounded border">Enter</kbd></TableCell>
                                        <TableCell className="font-medium">Agregar / Confirmar</TableCell>
                                        <TableCell>Agrega producto buscado o confirma acciones en diálogos.</TableCell>
                                    </TableRow>
                                </TableBody>
                            </Table>
                        </div>
                    </TabsContent>

                    <TabsContent value="buttons" className="mt-4">
                        <div className="grid gap-4 md:grid-cols-2">
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h3 className="font-bold text-lg mb-2 text-orange-600 flex items-center gap-2">
                                    <MousePointerClick className="w-4 h-4" /> LIMPIAR
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Vacía completamente el carrito de compras. Útil si el cliente desiste de la compra o si se cometió un error mayor.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h3 className="font-bold text-lg mb-2 text-purple-600 flex items-center gap-2">
                                    <MousePointerClick className="w-4 h-4" /> PONER EN ESPERA
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Permite "pausar" la venta actual. El sistema guardará los items y liberará la pantalla para atender a la siguiente persona en la fila.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h3 className="font-bold text-lg mb-2 text-red-600 flex items-center gap-2">
                                    <MousePointerClick className="w-4 h-4" /> NOTA DE CRÉDITO
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Módulo exclusivo para devoluciones. Permite buscar una factura anterior y devolver productos al inventario, ajustando el efectivo en caja.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4 bg-gray-50">
                                <h3 className="font-bold text-lg mb-2 text-blue-600 flex items-center gap-2">
                                    <MousePointerClick className="w-4 h-4" /> CAMBIO DE USUARIO
                                </h3>
                                <p className="text-sm text-gray-600">
                                    Cierra la sesión del cajero actual y vuelve a la pantalla de login/PIN. Ideal para cambios de turno rápidos.
                                </p>
                            </div>
                        </div>
                    </TabsContent>

                    <TabsContent value="screens" className="mt-4">
                        <div className="space-y-4">
                            <div className="border rounded-lg p-4">
                                <h3 className="font-bold text-lg mb-2">Punto de Venta (Principal)</h3>
                                <p className="text-sm text-gray-600">
                                    Es la pantalla predeterminada.
                                    <br />- <strong>Izquierda:</strong> Ticket actual, cliente asignado y botones de acción rápida.
                                    <br />- <strong>Derecha:</strong> Catálogo de productos y buscador.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4">
                                <h3 className="font-bold text-lg mb-2">Cierre de Caja</h3>
                                <p className="text-sm text-gray-600">
                                    Ubicado en el menú lateral. Permite ver el resumen financiero del turno.
                                    <br />- **Dinero Esperado:** Cálculo automático (Inicio + Ventas - Salidas - Devoluciones).
                                    <br />- **Pre-Cierre:** Imprime un reporte preliminar sin cerrar el turno.
                                    <br />- **Cerrar Turno:** Finaliza la sesión y genera el reporte Z final.
                                </p>
                            </div>
                            <div className="border rounded-lg p-4">
                                <h3 className="font-bold text-lg mb-2">Reportes X y Z</h3>
                                <p className="text-sm text-gray-600">
                                    <strong>Reporte X:</strong> Corte parcial informativo. No resetea totales.<br />
                                    <strong>Reporte Z:</strong> Corte final del día. Resetea totales para el siguiente turno.
                                </p>
                            </div>
                        </div>
                    </TabsContent>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
