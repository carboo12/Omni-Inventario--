import nodemailer from 'nodemailer';
import db from './db';

async function getTransporter() {
    const settings = await db.systemSettings.findFirst();
    
    if (!settings || !settings.emailNotificationsEnabled || !settings.smtpEmail || !settings.smtpPassword) {
        return null;
    }

    return nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: settings.smtpEmail,
            pass: settings.smtpPassword,
        },
    });
}

export async function sendSessionOpening(sessionId: string) {
    try {
        const transporter = await getTransporter();
        if (!transporter) return;

        const settings = await db.systemSettings.findFirst();
        const session = await db.cashRegisterSession.findUnique({
            where: { id: sessionId },
            include: { cashier: true }
        });

        if (!session || !settings?.adminEmail) return;

        const mailOptions = {
            from: `"Sistema JoyeriaPlus" <${settings.smtpEmail}>`,
            to: settings.adminEmail,
            subject: `🔔 Apertura de Caja - ${session.cashierName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">Apertura de Caja Detectada</h2>
                    <p>Se ha iniciado una nueva sesión de caja.</p>
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Cajero:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${session.cashierName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Hora de Apertura:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${new Date(session.openingTime).toLocaleString()}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Monto Inicial:</strong></td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">C$ ${session.initialAmount.toFixed(2)}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 12px; color: #666;">Este es un correo automático generado por JoyeriaPlus.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending session opening email:', error);
    }
}

export async function sendSessionReport(sessionId: string) {
    try {
        const transporter = await getTransporter();
        if (!transporter) return;

        const settings = await db.systemSettings.findFirst();
        const session = await db.cashRegisterSession.findUnique({
            where: { id: sessionId },
            include: {
                cashier: true,
                salesInvoices: {
                    include: { items: true }
                },
                outflows: true,
                jewelryServices: {
                    orderBy: { createdAt: 'asc' }
                }
            }
        });

        if (!session || !settings?.adminEmail) return;

        const totalOutflows = session.outflows.reduce((sum, o) => sum + o.amount, 0);
        
        // FIX: usar inv.totalAmount (precio real en C$ cobrado) en lugar del precio del item en USD
        let salesHtml = '';
        session.salesInvoices.forEach(inv => {
            const itemsList = inv.items.map(item => `${item.quantity}x ${item.productName}`).join(', ');
            salesHtml += `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">#${inv.invoiceNumber}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${itemsList}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${inv.paymentMethod}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">C$ ${inv.totalAmount.toFixed(2)}</td>
                </tr>
            `;
        });

        // Sección de Servicios de Joyería
        const totalServices = (session.jewelryServices || []).reduce((sum, s) => sum + s.amount, 0);
        let servicesHtml = '';

        if (session.jewelryServices && session.jewelryServices.length > 0) {
            const servicesRows = session.jewelryServices.map(s => `
                <tr>
                    <td style="padding: 8px; border-bottom: 1px solid #eee;">${s.description}</td>
                    <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: bold;">C$ ${s.amount.toFixed(2)}</td>
                </tr>
            `).join('');

            servicesHtml = `
                <h3 style="color: #1e293b; margin-top: 20px;">&#9881;&#65039; Servicios de Joyería (${session.jewelryServices.length})</h3>
                <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                        <tr style="background-color: #f3e8ff;">
                            <th style="padding: 8px; text-align: left; border-bottom: 2px solid #c4b5fd;">Descripción del Servicio</th>
                            <th style="padding: 8px; text-align: right; border-bottom: 2px solid #c4b5fd;">Monto (C$)</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${servicesRows}
                        <tr style="background-color: #f3e8ff; font-weight: bold;">
                            <td style="padding: 8px;">TOTAL SERVICIOS:</td>
                            <td style="padding: 8px; text-align: right;">C$ ${totalServices.toFixed(2)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        }

        const outflowsHtml = session.outflows.length > 0 ? `
            <h3 style="color: #1e293b; margin-top: 20px;">Salidas de Caja (Gastos)</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <thead>
                    <tr style="background-color: #f1f5f9;">
                        <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Motivo</th>
                        <th style="padding: 8px; text-align: right; border-bottom: 2px solid #cbd5e1;">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${session.outflows.map(o => `
                        <tr>
                            <td style="padding: 8px; border-bottom: 1px solid #eee;">${o.reason}</td>
                            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">C$ ${o.amount.toFixed(2)}</td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        ` : '';

        const mailOptions = {
            from: `"Sistema JoyeriaPlus" <${settings.smtpEmail}>`,
            to: settings.adminEmail,
            subject: `📝 Cierre de Caja Detallado - ${session.cashierName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333;">
                    <h2 style="color: #2563eb;">Reporte de Cierre de Caja</h2>
                    <p>Resumen detallado del turno de <strong>${session.cashierName}</strong>.</p>
                    
                    <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                        <h3 style="margin-top: 0; color: #1e293b;">Resumen de Sesión</h3>
                        <table style="width: 100%;">
                            <tr><td><strong>Apertura:</strong></td><td>${new Date(session.openingTime).toLocaleString()}</td></tr>
                            <tr><td><strong>Cierre:</strong></td><td>${session.closingTime ? new Date(session.closingTime).toLocaleString() : 'N/A'}</td></tr>
                            <tr><td><strong>Monto Inicial:</strong></td><td>C$ ${session.initialAmount.toFixed(2)}</td></tr>
                            <tr><td><strong>Ventas Totales:</strong></td><td>C$ ${(session.totalSales || 0).toFixed(2)}</td></tr>
                            ${totalServices > 0 ? `<tr><td style="padding-left:16px;color:#7c3aed;"><strong>→ incl. Servicios:</strong></td><td style="color:#7c3aed;">C$ ${totalServices.toFixed(2)}</td></tr>` : ''}
                            <tr><td><strong>Salidas (Gastos):</strong></td><td>C$ ${totalOutflows.toFixed(2)}</td></tr>
                            <tr style="font-size: 1.1em; color: #1e40af;"><td><strong>Efectivo Esperado:</strong></td><td>C$ ${(session.finalAmount || 0).toFixed(2)}</td></tr>
                            <tr style="font-size: 1.1em; color: #1e40af;"><td><strong>Efectivo Real:</strong></td><td>C$ ${(session.actualCash || 0).toFixed(2)}</td></tr>
                            <tr style="font-weight: bold; color: ${ (session.difference || 0) < 0 ? '#dc2626' : '#16a34a' };">
                                <td><strong>Diferencia:</strong></td><td>C$ ${(session.difference || 0).toFixed(2)}</td>
                            </tr>
                        </table>
                    </div>

                    <h3 style="color: #1e293b;">Detalle de Ventas</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <thead>
                            <tr style="background-color: #f1f5f9;">
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Factura</th>
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Productos</th>
                                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1;">Pago</th>
                                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #cbd5e1;">Total (C$)</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${salesHtml || '<tr><td colspan="4" style="text-align: center; padding: 10px;">No hubo ventas en este turno.</td></tr>'}
                        </tbody>
                    </table>

                    ${servicesHtml}
                    ${outflowsHtml}

                    <p style="margin-top: 30px; font-size: 12px; color: #666; text-align: center;">
                        Reporte generado automáticamente por JoyeriaPlus v2.0
                    </p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending session report email:', error);
    }
}

export async function sendActivationNotification(licenseKey: string, businessName: string, licenseType: string = 'Desconocida') {
    try {
        const settings = await db.systemSettings.findFirst();
        
        let user = settings?.smtpEmail || 'carboo12@gmail.com';
        let pass = settings?.smtpPassword || 'labg afco vyui dubo';

        if (!settings?.smtpEmail || !settings?.smtpPassword) {
            user = 'carboo12@gmail.com';
            pass = 'labg afco vyui dubo';
        }

        const transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: { user, pass },
        });

        const mailOptions = {
            from: `"JoyeriaPlus Sentinel" <${user}>`,
            to: 'carboo12@gmail.com',
            subject: `🚀 Nueva Activación/Renovación: ${businessName}`,
            html: `
                <div style="font-family: sans-serif; padding: 20px; color: #333; border: 2px solid #673AB7; border-radius: 10px;">
                    <h2 style="color: #673AB7;">Alerta de Licencia JoyeriaPlus</h2>
                    <p>Se ha procesado una activación o renovación en el sistema.</p>
                    <hr style="border: 1px solid #eee;" />
                    <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
                        <tr>
                            <td style="padding: 8px;"><strong>Negocio:</strong></td>
                            <td style="padding: 8px;">${businessName}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>Tipo de Licencia:</strong></td>
                            <td style="padding: 8px;"><span style="background: #e9d5ff; color: #6b21a8; padding: 4px 8px; border-radius: 4px; font-weight: bold;">${licenseType}</span></td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>Código/ID:</strong></td>
                            <td style="padding: 8px; font-family: monospace; background: #f4f4f4;">${licenseKey}</td>
                        </tr>
                        <tr>
                            <td style="padding: 8px;"><strong>Fecha:</strong></td>
                            <td style="padding: 8px;">${new Date().toLocaleString()}</td>
                        </tr>
                    </table>
                    <p style="margin-top: 20px; font-size: 11px; color: #999;">Notificación automática de seguridad.</p>
                </div>
            `,
        };

        await transporter.sendMail(mailOptions);
    } catch (error) {
        console.error('Error sending activation notification:', error);
    }
}
