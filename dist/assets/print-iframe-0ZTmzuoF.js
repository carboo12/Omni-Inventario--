import{P as vt}from"./route-settlement-D1THazM2.js";import{b as yt,a as wt,f as ut}from"./use-receipt-settings-b8nwPCV6.js";import{A as B,G as Y}from"./index-B7AFj8_X.js";import{a as bt}from"./addDays-CqtAQi2K.js";const X="print-receipt-iframe",St=24,Et=25,Ct=250;function Dt(n){if(typeof document>"u")return;document.getElementById(X)?.remove();const e=document.createElement("iframe");e.id=X,e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.background="transparent",e.setAttribute("aria-hidden","true"),e.setAttribute("title","impresion-ticket");let x;const o=()=>{window.clearTimeout(x);try{e.parentNode&&e.parentNode.removeChild(e)}catch{}};(document.body||document.documentElement).appendChild(e);let c=0,l=!1;const r=()=>{if(l)return;l=!0,window.clearTimeout(m),e.removeEventListener("load",r);const d=e.contentWindow,a=e.contentDocument||d?.document;if(!d||!a){console.error("No se pudo acceder al documento del iframe de impresión."),o();return}if(a.open(),a.write(Tt(n)),a.close(),!a.body||a.body.innerHTML.trim().length===0){o();return}window.setTimeout(()=>{try{d.focus(),d.print()}catch{}x=window.setTimeout(o,1e3)},Ct)};let m;const f=()=>{if(!l){if(e.contentWindow){r();return}if(++c>=St){console.error("No se pudo acceder al documento del iframe de impresión."),l=!0,o();return}m=window.setTimeout(f,Et)}};e.addEventListener("load",r,{once:!0}),f()}function Tt(n){return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
<style>
  @page {
    margin: 0 !important;
    size: auto !important; /* Mantiene la bobina de papel como rollo continuo */
  }
  @media print {
    html, body {
      width: 80mm !important;
      max-width: 80mm !important;
      height: auto !important;
      min-height: 100% !important;
      max-height: none !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    .ticket-container {
      width: 100% !important;
      max-width: 80mm !important;
      height: auto !important;
      min-height: 100% !important;
      max-height: none !important;
      overflow: visible !important;
    }
    .item-row {
      page-break-inside: avoid !important; /* Evita que un producto individual se corte a la mitad */
      break-inside: avoid !important;
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
    min-height: 100% !important;
    max-height: none !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: visible !important;
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Arial, sans-serif;
    font-size: 12px;
    line-height: 1.2;
    background: #fff;
    color: #000;
  }

  .ticket-container,
  .ticket-item,
  .item-row,
  .ticket-container tr,
  .ticket-container td,
  .ticket-totals,
  .total-row,
  .payment-info,
  .ticket-footer {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .ticket-container {
    width: 100% !important;
    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;
    overflow: visible !important;
    padding: 4mm 2mm;
  }

  .text-center { text-align: center; }
  .text-right { text-align: right; }
  .bold { font-weight: bold; }
  .dashed-line {
    border-bottom: 1px dashed #000;
    margin: 6px 0;
  }

  .detalle-factura-header {
    text-align: center;
    font-weight: bold;
    text-transform: uppercase;
    font-size: 13px;
    letter-spacing: 0.5px;
    border-top: 1px solid #000;
    border-bottom: 1px solid #000;
    padding: 3px 0;
    margin: 8px 0 6px 0;
  }

  .col-cant { width: 12%; text-align: left; font-weight: bold; }
  .col-prod { width: 48%; word-break: break-word; overflow-wrap: break-word; }
  .col-price { width: 20%; text-align: right; }
  .col-total { width: 20%; text-align: right; }

  .ticket-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: auto;
    font-size: 12px;
  }

  .ticket-table th {
    font-weight: bold;
    padding: 3px 1px;
    border-bottom: 1px solid #000;
  }

  .ticket-table td {
    vertical-align: top;
    padding: 4px 1px;
  }

  .item-row {
    border-top: 1px dashed #000;
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }

  .flex-row {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
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
    font-size: 19px;
    margin-top: 4px;
    line-height: 1.2;
  }

  .usd-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    font-style: italic;
  }

  .info-line {
    font-size: 12px;
    line-height: 1.2;
    margin: 0;
  }

  .pharmacy-name {
    font-size: 18px;
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
    font-size: 12px;
  }

  .thanks {
    margin-top: 8px;
    font-weight: bold;
    font-size: 13px;
  }
</style>
</head>
<body>
${n}
</body>
</html>`}function t(n){return n==null?"":String(n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function i(n){const e=typeof n=="string"?parseFloat(n):n;return e==null||isNaN(Number(e))?"0.00":Number(e).toLocaleString("es-NI",{minimumFractionDigits:2,maximumFractionDigits:2})}function It(n,e){const{pharmacyName:x,address:o,phone:c,rfc:l,ticketId:r,date:m,cashierName:f,clientName:d,clientPhone:a,items:h,subtotal:$,tax:v,total:w,paymentMethod:R,amountPaid:k,change:N,validityDays:g,notes:E,footerMessage:C,website:T,logoSvg:O,currencySymbol:u="C$",exchangeRate:A=36.5,showTotalUSD:P=!1,isReprint:F=!1,documentKind:L="sale"}=n,s=e||{},M=s.fontFamily==="sans-serif"?"Arial, 'Helvetica Neue', sans-serif":"'Courier New', Courier, monospace";s.ticketWidth;const H=s.lineHeight??1.2,U=s.paddingX??0,j=s.fontSizeTitle??18,b=s.fontSizeHeader??12,p=s.fontSizeBody??12,y=s.fontSizePresentation??10,D=s.fontSizeTotals??12,G=s.fontSizeFooter??12,Z=s.presentationLayout==="INLINE_QTY",tt=s.presentationLayout==="CUSTOM",et=s.showClientInfo!==!1,it=s.showEquivalenceUsd!==!1,nt=s.showLogo!==!1,J=s.footerMessage!==void 0?s.footerMessage||"":C||"",I=L==="quotation",st=w/A,V=B(m,"dd/MM/yyyy HH:mm",{locale:Y}),at=nt&&O?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;">${O}</div>`:"",ot=F?'<p class="reprint-badge">*** REIMPRESIÓN DE TICKET ***</p>':"",lt=n.pendingCollection?`<p class="pending-collection-badge" style="font-weight:900;font-size:${Math.max(9,p-1)}px;border:2px solid #000;border-radius:3px;padding:1px 3px;display:inline-block;margin-top:2px;">${t(vt)}</p>`:"",pt=P&&it?`<div class="usd-row" style="font-size:${G}px;">
            <span>Equiv. USD (Tasa: ${t(String(A))}):</span>
            <span>$ ${i(st)}</span>
          </div>`:"",rt=h.map(S=>{const K=`vertical-align:top;text-align:right;padding:4px 1px;white-space:nowrap;font-size:${p}px;`,W=`<td class="col-cant" style="vertical-align:top;text-align:left;padding:4px 1px;font-weight:bold;white-space:nowrap;font-size:${p}px;">${t(S.quantity)}</td>`,_=`<td class="col-price" style="${K}">${i(S.price)}</td>`,q=`<td class="col-total" style="${K}">${i(S.total)}</td>`;if(tt){const z=yt(s.presentationCustomFormat,S);return`<tr class="item-row" style="border-top:1px dashed #000;">
            <td class="col-cant" style="vertical-align:top;text-align:left;padding:4px 1px;font-weight:bold;white-space:nowrap;font-size:${p}px;"></td>
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;font-size:${p}px;">${t(z)}</td>
            ${_}
            ${q}
        </tr>`}if(Z){const z=wt(S.description,S.unit),$t=z.presentation?`<span class="item-presentation" style="font-size:${y}px;margin:0 3px;">${t(z.presentation)}</span>`:"";return`<tr class="item-row" style="border-top:1px dashed #000;">
            ${W}
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;">
                <div style="font-size:${p}px;">${$t}<span class="item-name">${t(z.name)}</span></div>
            </td>
            ${_}
            ${q}
        </tr>`}const Q=ut(S.unit),ht=Q?`<div style="font-size:${y}px;font-style:italic;font-weight:normal;color:#444;">${t(Q)}</div>`:"";return`<tr class="item-row" style="border-top:1px dashed #000;">
            ${W}
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;">
                <div style="font-size:${p}px;">${t(S.description)}</div>
                ${ht}
            </td>
            ${_}
            ${q}
        </tr>`}).join(`
`),dt=I&&g?`<p class="info-line">Vigencia: ${B(bt(m,g),"dd/MM/yyyy",{locale:Y})} (${g} días)</p>`:"",ct=I?`<p class="info-line">No. Cotización: ${t(r)}</p>
           <p class="info-line">Fecha: ${V}</p>
           ${dt}
           <p class="info-line">Atendido por: ${t(f)}</p>
           <p class="info-line">Cliente: ${t(d||"Cliente Genérico")}</p>
           ${a?`<p class="info-line">Tel: ${t(a)}</p>`:""}`:`<p class="info-line">Ticket: ${t(r)}</p>
           <p class="info-line">Fecha: ${V}</p>
           <p class="info-line">Cajero: ${t(f)}</p>
           <p class="info-line">Cliente: ${t(d||"Cliente Genérico")}</p>`,mt=I?"PRESUPUESTO / COTIZACIÓN":"Detalle Factura",ft=I?"":`<div class="payment-info">
             <div class="flex-row">
               <span>Pago (${t(R)}):</span>
               <span>${u} ${i(k)}</span>
             </div>
             <div class="flex-row">
               <span>Cambio:</span>
               <span>${u} ${i(N)}</span>
             </div>
           </div>`,gt=I&&E?`<p class="info-line" style="font-style:italic;margin-top:6px;white-space:pre-line;">Nota: ${t(E)}</p>`:"",xt=I?'<p class="thanks">*** PRESUPUESTO NO VALIDO COMO FACTURA ***</p>':'<p class="thanks">*** GRACIAS POR SU COMPRA ***</p>';return`<div class="ticket-container" style="font-family:${M};font-size:${p}px;line-height:${H};padding:4mm ${U+2}px;">
  <div class="ticket-header text-center">
    ${at}
    <p class="pharmacy-name" style="font-size:${j}px;">${t(x)}</p>
    <p class="info-line" style="white-space:pre-line;font-size:${b}px;">${t(o)}</p>
    ${c?`<p class="info-line" style="font-size:${b}px;">${t(c)}</p>`:""}
    ${l?`<p class="info-line" style="font-size:${b}px;">RFC: ${t(l)}</p>`:""}
    ${ot}
    ${lt}
  </div>

  ${et?`<div style="margin-top:8px;">
    ${ct.replace(/class="info-line"/g,`class="info-line" style="font-size:${b}px;"`)}
  </div>`:`<div style="margin-top:4px;font-size:${b}px;">
    <p style="margin:0;">Ticket: ${t(r)}</p>
    <p style="margin:0;">Fecha: ${V}</p>
    <p style="margin:0;">Cajero: ${t(f)}</p>
  </div>`}

  <div class="detalle-factura-header">${mt}</div>

  <table class="ticket-table">
    <thead>
      <tr>
        <th class="col-cant" style="text-align:left;padding:3px 1px;width:12%;font-weight:bold;font-size:${p}px;">Cant</th>
        <th class="col-prod" style="text-align:left;padding:3px 1px;width:48%;font-size:${p}px;">Producto</th>
        <th class="col-price" style="text-align:right;padding:3px 1px;width:20%;font-size:${p}px;">P. Unit</th>
        <th class="col-total" style="text-align:right;padding:3px 1px;width:20%;font-size:${p}px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rt}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div class="ticket-totals">
    <div class="flex-row sum-row" style="font-size:${D}px;">
      <span>Subtotal:</span>
      <span>${u} ${i($)}</span>
    </div>
    <div class="flex-row sum-row" style="font-size:${D}px;">
      <span>IVA:</span>
      <span>${u} ${i(v)}</span>
    </div>
    <div class="total-row" style="font-size:${D+6}px;">
      <span>TOTAL:</span>
      <span>${u} ${i(w)}</span>
    </div>
    ${pt}
  </div>

  ${gt}

  <div class="dashed-line"></div>

  ${ft}

  <div class="ticket-footer text-center" style="margin-top:16px;font-size:${G}px;">
    ${J?`<p class="footer-msg">${t(J)}</p>`:""}
    ${T?`<p class="info-line">${t(T)}</p>`:""}
    ${xt}
  </div>
</div>`}function zt(n){const{pharmacyName:e,address:x,phone:o,rfc:c,cashierName:l,openingTime:r,closingTime:m,initialAmount:f,salesCash:d,salesCard:a,salesServices:h,salesAbonos:$,outflows:v=[],totalReturns:w=0,totalSales:R,finalAmount:k,actualCash:N,difference:g,initialAmountUSD:E,salesUSD:C,actualUSD:T,differenceUSD:O,footerMessage:u,website:A}=n,P=new Date(r).toLocaleString(),F=m?new Date(m).toLocaleString():"",L=new Date().toLocaleString(),s=h&&h>0?`<div class="flex-row" style="color:#6d28d9;">
            <span>SERVICIOS JOYERIA:</span>
            <span>C$ ${i(h)}</span>
          </div>`:"",M=$&&$>0?`<div class="flex-row" style="color:#1d4ed8;">
            <span>ABONOS CRÉDITOS:</span>
            <span>C$ ${i($)}</span>
          </div>`:"",H=v.reduce((y,D)=>y+Number(D.amount),0),U=v.length>0?`<div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px;">
            <div style="font-weight:700;">DETALLE SALIDAS / RETIROS</div>
            ${v.map(y=>`
              <div style="margin-top:4px;">
                <div>${new Date(y.createdAt).toLocaleTimeString()} ${new Date(y.createdAt).toLocaleDateString()}</div>
                <div class="flex-row">
                  <span style="flex:1;">${t(y.reason)}</span>
                  <span>-C$ ${i(y.amount)}</span>
                </div>
                <div style="color:#6b7280;">Usuario: ${t(l)}</div>
              </div>`).join("")}
          </div>`:"",j=(E||0)+(C||0),b=g!==void 0&&g<0?"#dc2626":"#16a34a",p=g!==void 0&&g>0?"+":"";return`<div class="ticket-container">
  <div class="ticket-header text-center">
    <p class="pharmacy-name">${t(e)}</p>
    <p class="info-line" style="white-space:pre-line;">${t(x)}</p>
    ${o?`<p class="info-line">${t(o)}</p>`:""}
    ${c?`<p class="info-line">RFC: ${t(c)}</p>`:""}
    <p class="info-line" style="font-weight:700;margin-top:8px;font-size:14px;">REPORTE DE CIERRE DE CAJA</p>
    <p class="info-line" style="font-weight:700;">REIMPRESIÓN TICKET Z</p>
  </div>

  <div style="margin-top:8px;">
    <div class="flex-row"><span>CAJA:</span><span>01</span></div>
    <div class="flex-row"><span>CAJERO:</span><span>${t(l)}</span></div>
    <div class="flex-row"><span>APERTURA:</span><span>${P}</span></div>
    ${F?`<div class="flex-row"><span>CIERRE:</span><span>${F}</span></div>`:""}
    <div class="flex-row"><span>IMPRESION:</span><span>${L}</span></div>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row sum-row">
    <span>DESCRIPCION</span>
    <span>VALOR</span>
  </div>

  <div class="flex-row"><span>FONDO INICIAL:</span><span>C$ ${i(f)}</span></div>
  <div class="flex-row"><span>VENTAS EFECTIVO:</span><span>C$ ${i(d)}</span></div>
  <div class="flex-row"><span>VENTAS TARJETA:</span><span>C$ ${i(a)}</span></div>
  ${s}
  ${M}
  <div class="flex-row" style="color:#dc2626;">
    <span>SALIDAS/RECIBOS:</span>
    <span>-C$ ${i(H)}</span>
  </div>
  <div class="flex-row" style="color:#dc2626;">
    <span>DEVOLUCIONES:</span>
    <span>-C$ ${i(w)}</span>
  </div>
  ${U}

  <div class="dashed-line"></div>

  <div class="flex-row" style="font-weight:700;">
    <span>TOTAL VENTAS:</span>
    <span>C$ ${i(R)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO ESPERADO:</span>
    <span>C$ ${i(k)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO REAL:</span>
    <span>C$ ${i(N)}</span>
  </div>
  <div class="flex-row" style="font-weight:700;color:${b};">
    <span>DIFERENCIA C$:</span>
    <span>${p}${i(g)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row"><span>FONDO INICIAL USD:</span><span>$ ${i(E)}</span></div>
  <div class="flex-row"><span>VENTAS USD:</span><span>$ ${i(C)}</span></div>
  <div class="flex-row sum-row"><span>ESPERADO USD:</span><span>$ ${i(j)}</span></div>
  <div class="flex-row sum-row"><span>REAL USD:</span><span>$ ${i(T)}</span></div>
  <div class="flex-row" style="font-weight:700;color:${b};">
    <span>DIFERENCIA USD:</span>
    <span>$ ${i(O)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:12px;">
    ${u?`<p class="footer-msg">${t(u)}</p>`:""}
    ${A?`<p class="info-line">${t(A)}</p>`:""}
    <p style="margin-top:8px;font-weight:700;">*** FIN DEL REPORTE ***</p>
  </div>
</div>`}function Ot(n){const{pharmacyName:e,address:x,phone:o,rfc:c,ticketId:l,date:r,cashierName:m,amount:f,reason:d,footerMessage:a,website:h,logoSvg:$}=n,v=B(r,"dd/MM/yyyy HH:mm",{locale:Y});return`<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${$?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${$}</div>`:""}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${t(e)}</p>
    <p style="white-space:pre-line;margin:0;">${t(x)}</p>
    ${o?`<p style="margin:0;">${t(o)}</p>`:""}
    ${c?`<p style="margin:0;">RFC: ${t(c)}</p>`:""}
    <p style="font-size:14px;font-weight:bold;text-transform:uppercase;margin-top:8px;">Retiro / Salida de Efectivo</p>
  </div>

  <div style="margin-bottom:8px;">
    <p style="margin:0;">Recibo: ${t(l)}</p>
    <p style="margin:0;">Fecha: ${v}</p>
    <p style="margin:0;">Cajero: ${t(m)}</p>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row">
    <span>Monto:</span>
    <span>C$ ${i(f)}</span>
  </div>
  <div class="flex-row" style="margin-top:4px;">
    <span>Concepto / Motivo:</span>
    <span style="max-width:55%;text-align:right;">${t(d)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:16px;">
    ${a?`<p class="footer-msg">${t(a)}</p>`:""}
    ${h?`<p style="margin:0;">${t(h)}</p>`:""}
    <p style="margin-top:8px;">*** FIN DEL COMPROBANTE ***</p>
  </div>
</div>`}function Ft(n,e){const{businessName:x,address:o,phone:c,rfc:l,quoteNumber:r,date:m,expirationDays:f,customerName:d,customerPhone:a,cashierName:h,items:$,subtotal:v,total:w,notes:R,footerMessage:k,website:N,logoSvg:g,currencySymbol:E,exchangeRate:C,showTotalUSD:T}=n;return It({pharmacyName:x,address:o,phone:c,rfc:l,ticketId:r,date:m,cashierName:h,clientName:d,clientPhone:a,items:$,subtotal:v,tax:n.tax??Math.max(0,w-v),total:w,paymentMethod:"",amountPaid:0,change:0,validityDays:f,notes:R,footerMessage:k,website:N,logoSvg:g,currencySymbol:E,exchangeRate:C,showTotalUSD:T,documentKind:"quotation"},e)}export{It as a,zt as b,Ft as c,Ot as d,Dt as p};
