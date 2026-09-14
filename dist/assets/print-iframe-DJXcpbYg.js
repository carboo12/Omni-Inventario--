import{a3 as M,z as k,E as T}from"./index-CMWhpmtV.js";async function q(...a){return M("sales","createSale",a)}async function B(...a){return M("sales","getInvoiceByNumber",a)}async function J(...a){return M("sales","getLastSale",a)}const G=(a,e,p)=>{const i=a.customerName||a.customer?.name||a.customer?.fullName||"Cliente Genérico",o=(a.salesInvoiceItem||[]).map(n=>{const d=n.presentationName||n.baseUnit||"ud";return{quantity:n.quantity,description:n.productName,price:n.unitPrice,total:n.totalPrice,unit:d,priceLevel:n.priceLevel||1,pending:!!n.isEncargo}}),l=typeof a.subtotal=="number"&&a.subtotal>0?a.subtotal:o.reduce((n,d)=>n+(typeof d.total=="number"?d.total:0),0),r=typeof a.totalAmount=="number"?a.totalAmount:l,c=typeof a.tax=="number"?a.tax:Math.max(0,r-l);return{pharmacyName:e.ticketHeader.name,address:e.ticketHeader.address,phone:e.ticketHeader.phone,rfc:e.ticketHeader.rfc,ticketId:p,date:new Date(a.date),cashierName:a.user?.name||"Cajero",clientName:i,items:o,subtotal:l,tax:c,total:r,paymentMethod:a.paymentMethod,amountPaid:r,change:Math.max(0,r-l-c),hasEncargoItems:o.some(n=>n.pending),footerMessage:e.ticketFooter.message,website:e.ticketFooter.website,logoSvg:e.logoSvg,exchangeRate:parseFloat(e.exchangeRate)||36.5,showTotalUSD:!0,isReprint:!0}};function W(a){if(typeof document>"u")return;const e=document.createElement("iframe");e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.background="transparent",e.setAttribute("aria-hidden","true"),e.setAttribute("title","impresion-ticket"),e.onload=()=>{const i=e.contentWindow?.document.body;if(!(!i||!i.innerHTML||i.innerHTML.trim().length===0)){try{e.contentWindow.print()}catch{}setTimeout(()=>e.remove(),1e3)}},document.body.appendChild(e);const p=e.contentWindow.document;p.open(),p.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page {
    size: 80mm auto !important;
    margin: 0 !important;
  }
  @media print {
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      height: auto !important;
      min-height: auto !important;
      max-height: none !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
    }
    .ticket-container {
      width: 100% !important;
      max-width: 80mm !important;
      height: auto !important;
      max-height: none !important;
      overflow: visible !important;
    }
  }
  * {
    box-sizing: border-box;
    font-family: inherit;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  html, body {
    width: 80mm !important;
    height: auto !important;
    min-height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 13px;
    line-height: 1.2;
    background: #fff;
    color: #000;
  }

  .ticket-item,
  .item-row,
  .ticket-container tr,
  .ticket-container td {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .ticket-totals,
  .total-row,
  .payment-info,
  .ticket-footer {
    break-inside: auto !important;
    page-break-inside: auto !important;
  }

  .ticket-container {
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 4mm 2mm;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  .dashed-line {
    border-bottom: 1px dashed #000;
    margin: 4px 0;
  }

  .flex-row {
    display: flex;
    justify-content: space-between;
    font-size: 14px;
    font-weight: 400;
    line-height: 1.4;
  }

  .sum-row {
    font-weight: 600;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    font-weight: 900;
    font-size: 20px;
    margin-top: 4px;
    line-height: 1.2;
  }

  .usd-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-style: italic;
  }

  .item-row {
    padding: 2px 0;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.3;
  }

  .info-line {
    font-size: 13px;
    line-height: 1.2;
    margin: 0;
  }

  .pharmacy-name {
    font-size: 19px;
    line-height: 1.2;
    font-weight: 800;
    text-transform: uppercase;
    margin: 0;
  }

  .reprint-badge {
    margin-top: 4px;
    font-weight: 900;
    font-size: 12px;
    border: 2px solid #000;
    border-radius: 4px;
    padding: 2px 4px;
    display: inline-block;
  }

  .logo-img {
    width: 48px;
    height: 48px;
    margin: 0 auto 4px;
  }

  .footer-msg {
    white-space: pre-line;
    font-size: 13px;
  }

  .thanks {
    margin-top: 8px;
    font-weight: bold;
    font-size: 13px;
  }
</style>
</head>
<body>
${a}
</body>
</html>`),p.close()}function t(a){return a.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function s(a){const e=typeof a=="string"?parseFloat(a):a;return e==null||isNaN(Number(e))?"0.00":Number(e).toLocaleString("es-NI",{minimumFractionDigits:2,maximumFractionDigits:2})}function Z(a){const{pharmacyName:e,address:p,phone:i,rfc:o,ticketId:l,date:r,cashierName:c,clientName:n,items:d,subtotal:$,tax:g,total:h,paymentMethod:v,amountPaid:w,change:E,footerMessage:b,website:S,logoSvg:m,currencySymbol:f="C$",exchangeRate:x=36.5,showTotalUSD:N=!1,isReprint:A=!1}=a,C=h/x,R=k(r,"dd/MM/yyyy HH:mm",{locale:T}),D=m?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;">${m}</div>`:"",y=A?'<p class="reprint-badge">*** REIMPRESIÓN DE TICKET ***</p>':"",O=N?`<div class="usd-row">
            <span>Equiv. USD (Tasa: ${t(String(x))}):</span>
            <span>$ ${s(C)}</span>
          </div>`:"",H=d.map(u=>{const L=u.unit?` ${u.unit.toUpperCase()}`:"";return`<div class="ticket-item item-row">${u.quantity}${t(L)} - ${t(u.description)} - P.U ${f} ${s(u.price)} - ${f} ${s(u.total)}</div>`}).join(`
`);return`<div class="ticket-container">
  <div class="ticket-header text-center">
    ${D}
    <p class="pharmacy-name">${t(e)}</p>
    <p class="info-line" style="white-space:pre-line;">${t(p)}</p>
    ${i?`<p class="info-line">${t(i)}</p>`:""}
    ${o?`<p class="info-line">RFC: ${t(o)}</p>`:""}
    ${y}
  </div>

  <div style="margin-top:8px;">
    <p class="info-line">Ticket: ${t(l)}</p>
    <p class="info-line">Fecha: ${R}</p>
    <p class="info-line">Cajero: ${t(c)}</p>
    <p class="info-line">Cliente: ${t(n||"Cliente Genérico")}</p>
  </div>

  <div class="dashed-line"></div>

  <div>
    ${H}
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-totals">
    <div class="flex-row sum-row">
      <span>Subtotal:</span>
      <span>${f} ${s($)}</span>
    </div>
    <div class="flex-row sum-row">
      <span>IVA:</span>
      <span>${f} ${s(g)}</span>
    </div>
    <div class="total-row">
      <span>TOTAL:</span>
      <span>${f} ${s(h)}</span>
    </div>
    ${O}
  </div>

  <div class="dashed-line"></div>

  <div class="payment-info">
    <div class="flex-row">
      <span>Pago (${t(v)}):</span>
      <span>${f} ${s(w)}</span>
    </div>
    <div class="flex-row">
      <span>Cambio:</span>
      <span>${f} ${s(E)}</span>
    </div>
  </div>

  <div class="ticket-footer text-center" style="margin-top:16px;">
    ${b?`<p class="footer-msg">${t(b)}</p>`:""}
    ${S?`<p class="info-line">${t(S)}</p>`:""}
    <p class="thanks">*** GRACIAS POR SU COMPRA ***</p>
  </div>
</div>`}function K(a){const{pharmacyName:e,address:p,phone:i,rfc:o,cashierName:l,openingTime:r,closingTime:c,initialAmount:n,salesCash:d,salesCard:$,salesServices:g,salesAbonos:h,outflows:v=[],totalReturns:w=0,totalSales:E,finalAmount:b,actualCash:S,difference:m,initialAmountUSD:f,salesUSD:x,actualUSD:N,differenceUSD:A,footerMessage:C,website:R}=a,D=new Date(r).toLocaleString(),y=c?new Date(c).toLocaleString():"",O=new Date().toLocaleString(),H=g&&g>0?`<div class="flex-row" style="color:#6d28d9;">
            <span>SERVICIOS JOYERIA:</span>
            <span>C$ ${s(g)}</span>
          </div>`:"",u=h&&h>0?`<div class="flex-row" style="color:#1d4ed8;">
            <span>ABONOS CRÉDITOS:</span>
            <span>C$ ${s(h)}</span>
          </div>`:"",L=v.reduce((I,j)=>I+Number(j.amount),0),z=v.length>0?`<div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px;">
            <div style="font-weight:700;">DETALLE SALIDAS / RETIROS</div>
            ${v.map(I=>`
              <div style="margin-top:4px;">
                <div>${new Date(I.createdAt).toLocaleTimeString()} ${new Date(I.createdAt).toLocaleDateString()}</div>
                <div class="flex-row">
                  <span style="flex:1;">${t(I.reason)}</span>
                  <span>-C$ ${s(I.amount)}</span>
                </div>
                <div style="color:#6b7280;">Usuario: ${t(l)}</div>
              </div>`).join("")}
          </div>`:"",P=(f||0)+(x||0),U=m!==void 0&&m<0?"#dc2626":"#16a34a",F=m!==void 0&&m>0?"+":"";return`<div class="ticket-container">
  <div class="ticket-header text-center">
    <p class="pharmacy-name">${t(e)}</p>
    <p class="info-line" style="white-space:pre-line;">${t(p)}</p>
    ${i?`<p class="info-line">${t(i)}</p>`:""}
    ${o?`<p class="info-line">RFC: ${t(o)}</p>`:""}
    <p class="info-line" style="font-weight:700;margin-top:8px;font-size:14px;">REPORTE DE CIERRE DE CAJA</p>
    <p class="info-line" style="font-weight:700;">REIMPRESIÓN TICKET Z</p>
  </div>

  <div style="margin-top:8px;">
    <div class="flex-row"><span>CAJA:</span><span>01</span></div>
    <div class="flex-row"><span>CAJERO:</span><span>${t(l)}</span></div>
    <div class="flex-row"><span>APERTURA:</span><span>${D}</span></div>
    ${y?`<div class="flex-row"><span>CIERRE:</span><span>${y}</span></div>`:""}
    <div class="flex-row"><span>IMPRESION:</span><span>${O}</span></div>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row sum-row">
    <span>DESCRIPCION</span>
    <span>VALOR</span>
  </div>

  <div class="flex-row"><span>FONDO INICIAL:</span><span>C$ ${s(n)}</span></div>
  <div class="flex-row"><span>VENTAS EFECTIVO:</span><span>C$ ${s(d)}</span></div>
  <div class="flex-row"><span>VENTAS TARJETA:</span><span>C$ ${s($)}</span></div>
  ${H}
  ${u}
  <div class="flex-row" style="color:#dc2626;">
    <span>SALIDAS/RECIBOS:</span>
    <span>-C$ ${s(L)}</span>
  </div>
  <div class="flex-row" style="color:#dc2626;">
    <span>DEVOLUCIONES:</span>
    <span>-C$ ${s(w)}</span>
  </div>
  ${z}

  <div class="dashed-line"></div>

  <div class="flex-row" style="font-weight:700;">
    <span>TOTAL VENTAS:</span>
    <span>C$ ${s(E)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO ESPERADO:</span>
    <span>C$ ${s(b)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO REAL:</span>
    <span>C$ ${s(S)}</span>
  </div>
  <div class="flex-row" style="font-weight:700;color:${U};">
    <span>DIFERENCIA C$:</span>
    <span>${F}${s(m)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row"><span>FONDO INICIAL USD:</span><span>$ ${s(f)}</span></div>
  <div class="flex-row"><span>VENTAS USD:</span><span>$ ${s(x)}</span></div>
  <div class="flex-row sum-row"><span>ESPERADO USD:</span><span>$ ${s(P)}</span></div>
  <div class="flex-row sum-row"><span>REAL USD:</span><span>$ ${s(N)}</span></div>
  <div class="flex-row" style="font-weight:700;color:${U};">
    <span>DIFERENCIA USD:</span>
    <span>$ ${s(A)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:12px;">
    ${C?`<p class="footer-msg">${t(C)}</p>`:""}
    ${R?`<p class="info-line">${t(R)}</p>`:""}
    <p style="margin-top:8px;font-weight:700;">*** FIN DEL REPORTE ***</p>
  </div>
</div>`}function Y(a){const{pharmacyName:e,address:p,phone:i,rfc:o,ticketId:l,date:r,cashierName:c,amount:n,reason:d,footerMessage:$,website:g,logoSvg:h}=a,v=k(r,"dd/MM/yyyy HH:mm",{locale:T});return`<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${h?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${h}</div>`:""}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${t(e)}</p>
    <p style="white-space:pre-line;margin:0;">${t(p)}</p>
    ${i?`<p style="margin:0;">${t(i)}</p>`:""}
    ${o?`<p style="margin:0;">RFC: ${t(o)}</p>`:""}
    <p style="font-size:14px;font-weight:bold;text-transform:uppercase;margin-top:8px;">Retiro / Salida de Efectivo</p>
  </div>

  <div style="margin-bottom:8px;">
    <p style="margin:0;">Recibo: ${t(l)}</p>
    <p style="margin:0;">Fecha: ${v}</p>
    <p style="margin:0;">Cajero: ${t(c)}</p>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row">
    <span>Monto:</span>
    <span>C$ ${s(n)}</span>
  </div>
  <div class="flex-row" style="margin-top:4px;">
    <span>Concepto / Motivo:</span>
    <span style="max-width:55%;text-align:right;">${t(d)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:16px;">
    ${$?`<p class="footer-msg">${t($)}</p>`:""}
    ${g?`<p style="margin:0;">${t(g)}</p>`:""}
    <p style="margin-top:8px;">*** FIN DEL COMPROBANTE ***</p>
  </div>
</div>`}function Q(a){const{businessName:e,address:p,phone:i,rfc:o,quoteNumber:l,date:r,expirationDays:c,customerName:n,customerPhone:d,cashierName:$,items:g,subtotal:h,total:v,notes:w,footerMessage:E,website:b,logoSvg:S,currencySymbol:m="C$"}=a,f=k(r,"dd/MM/yyyy HH:mm",{locale:T}),x=new Date(r);x.setDate(x.getDate()+c);const N=k(x,"dd/MM/yyyy",{locale:T}),A=S?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${S}</div>`:"",C=n&&n!=="Cliente General"?`<p style="margin:0;">Cliente: ${t(n)}</p>
           ${d?`<p style="margin:0;">Tel: ${t(d)}</p>`:""}`:"",R=g.map(y=>`<tr>
            <td>${y.quantity}</td>
            <td>${t(y.description)}</td>
            <td class="text-right">${m} ${s(y.price)}</td>
            <td class="text-right">${m} ${s(y.total)}</td>
        </tr>`).join(`
`),D=w?`<div style="margin-top:8px;font-size:10px;font-style:italic;"><p style="margin:0;">Nota: ${t(w)}</p></div>`:"";return`<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${A}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${t(e)}</p>
    <p style="white-space:pre-line;margin:0;">${t(p)}</p>
    ${i?`<p style="margin:0;">${t(i)}</p>`:""}
    ${o?`<p style="margin:0;">RFC: ${t(o)}</p>`:""}
  </div>

  <div style="border:2px dashed #000;padding:8px;margin-bottom:12px;text-align:center;">
    <p style="font-size:14px;font-weight:bold;text-transform:uppercase;margin:0;">PRESUPUESTO / COTIZACION</p>
    <p style="font-size:10px;font-style:italic;margin-top:4px;">No valido como comprobante fiscal / factura</p>
  </div>

  <div style="margin-bottom:8px;">
    <p style="margin:0;">No. Cotizacion: ${t(l)}</p>
    <p style="margin:0;">Fecha: ${f}</p>
    <p style="margin:0;">Vigencia hasta: ${N} (${c} dias)</p>
    <p style="margin:0;">Atendido por: ${t($)}</p>
    ${C}
  </div>

  <div class="dashed-line"></div>

  <table style="width:100%;text-align:left;border-collapse:collapse;font-size:12px;">
    <thead>
      <tr>
        <th style="width:32px;">Cant</th>
        <th>Desc</th>
        <th class="text-right">P.Unit</th>
        <th class="text-right">Total</th>
      </tr>
    </thead>
    <tbody>
      ${R}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div class="ticket-totals flex-row" style="font-weight:bold;font-size:14px;">
    <span>TOTAL:</span>
    <span>${m} ${s(v)}</span>
  </div>

  ${D}

  <div class="ticket-footer text-center" style="margin-top:16px;border-top:1px dashed #000;padding-top:12px;">
    <p style="font-size:10px;font-weight:bold;margin:0;">*** PRESUPUESTO NO VENDA ***</p>
    <p style="font-size:10px;margin-top:4px;margin-bottom:0;">Presente este documento al momento de facturar.</p>
    <p style="font-size:10px;margin:0;">Los precios pueden variar sin previo aviso.</p>
    ${E?`<p class="footer-msg" style="margin-top:8px;">${t(E)}</p>`:""}
    ${b?`<p style="margin:0;">${t(b)}</p>`:""}
  </div>
</div>`}export{G as a,K as b,Z as c,J as d,Y as e,Q as f,B as g,q as h,W as p};
