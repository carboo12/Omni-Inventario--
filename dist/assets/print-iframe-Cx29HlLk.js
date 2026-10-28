import{P as $t}from"./route-settlement-D1THazM2.js";import{r as yt,b as wt,a as ut,f as bt}from"./receipt-presentation-BrCYG8jR.js";import{A as q,G}from"./index-D2vHnEMk.js";import{a as St}from"./addDays-nlHuDN7w.js";const X="print-receipt-iframe",Ct=24,Et=25,Tt=250;function Dt(n){if(typeof document>"u")return;document.getElementById(X)?.remove();const e=document.createElement("iframe");e.id=X,e.style.position="fixed",e.style.right="0",e.style.bottom="0",e.style.width="0",e.style.height="0",e.style.border="0",e.style.background="transparent",e.setAttribute("aria-hidden","true"),e.setAttribute("title","impresion-ticket");let x;const o=()=>{window.clearTimeout(x);try{e.parentNode&&e.parentNode.removeChild(e)}catch{}};(document.body||document.documentElement).appendChild(e);let r=0,l=!1;const p=()=>{if(l)return;l=!0,window.clearTimeout(c),e.removeEventListener("load",p);const d=e.contentWindow,a=e.contentDocument||d?.document;if(!d||!a){console.error("No se pudo acceder al documento del iframe de impresión."),o();return}if(a.open(),a.write(kt(n)),a.close(),!a.body||a.body.innerHTML.trim().length===0){o();return}window.setTimeout(()=>{try{d.focus(),d.print()}catch{}x=window.setTimeout(o,1e3)},Tt)};let c;const m=()=>{if(!l){if(e.contentWindow){p();return}if(++r>=Ct){console.error("No se pudo acceder al documento del iframe de impresión."),l=!0,o();return}c=window.setTimeout(m,Et)}};e.addEventListener("load",p,{once:!0}),m()}function kt(n){return`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inconsolata:wght@400;500;600;700&family=Inter:wght@400;500;600;700&family=Roboto+Mono:wght@400;500;600;700&family=VT323&display=swap" rel="stylesheet" />
<style>
  @page {
    margin: 0 !important;
    size: 80mm auto !important; /* Ancho fijo de ticket; largo continuo sin limite */
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
      page-break-inside: auto !important; /* Permite flujo continuo en rollo de mas de 100 items */
      break-inside: auto !important;
    }
    table, tbody, tr, td {
      page-break-inside: auto !important;
      break-inside: auto !important;
    }
    .ticket-container {
      page-break-after: avoid !important;
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

  /* Solo pie de ticket: el contenedor y la tabla fluyen libremente (rollo continuo). */
  .ticket-totals,
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
    /* page-break-inside: auto permite flujo continuo con 100+ items en rollo termico */
    page-break-inside: auto !important;
    break-inside: auto !important;
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
</html>`}function t(n){return n==null?"":String(n).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function i(n){const e=typeof n=="string"?parseFloat(n):n;return e==null||isNaN(Number(e))?"0.00":Number(e).toLocaleString("es-NI",{minimumFractionDigits:2,maximumFractionDigits:2})}function It(n,e){const{pharmacyName:x,address:o,phone:r,rfc:l,ticketId:p,date:c,cashierName:m,clientName:d,clientPhone:a,items:h,subtotal:v,tax:g,total:$,paymentMethod:u,amountPaid:E,change:k,validityDays:y,notes:T,footerMessage:I,website:A,logoSvg:O,currencySymbol:b="C$",exchangeRate:N=36.5,showTotalUSD:L=!1,isReprint:F=!1,documentKind:P="sale"}=n,s=e||{},_=yt(s.fontFamily);s.ticketWidth;const M=s.lineHeight??1.2,H=s.paddingX??0,U=s.fontSizeTitle??18,S=s.fontSizeHeader??12,f=s.fontSizeBody??12,w=s.fontSizePresentation??10,z=s.fontSizeTotals??12,Y=s.fontSizeFooter??12,Z=s.presentationLayout==="INLINE_QTY",tt=s.presentationLayout==="CUSTOM",et=s.showClientInfo!==!1,it=s.showEquivalenceUsd!==!1,nt=s.showLogo!==!1,J=s.footerMessage!==void 0?s.footerMessage||"":I||"",R=P==="quotation",st=$/N,j=q(c,"dd/MM/yyyy HH:mm",{locale:G}),at=nt&&O?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;">${O}</div>`:"",ot=F?'<p class="reprint-badge">*** REIMPRESIÓN DE TICKET ***</p>':"",lt=n.pendingCollection?`<p class="pending-collection-badge" style="font-weight:900;font-size:${Math.max(9,f-1)}px;border:2px solid #000;border-radius:3px;padding:1px 3px;display:inline-block;margin-top:2px;">${t($t)}</p>`:"",pt=L&&it?`<div class="usd-row" style="font-size:${Y}px;">
            <span>Equiv. USD (Tasa: ${t(String(N))}):</span>
            <span>$ ${i(st)}</span>
          </div>`:"",rt=h.map(C=>{const K=`vertical-align:top;text-align:right;padding:4px 1px;white-space:nowrap;font-size:${f}px;`,W=`<td class="col-cant" style="vertical-align:top;text-align:left;padding:4px 1px;font-weight:bold;white-space:nowrap;font-size:${f}px;">${t(C.quantity)}</td>`,V=`<td class="col-price" style="${K}">${i(C.price)}</td>`,B=`<td class="col-total" style="${K}">${i(C.total)}</td>`;if(tt){const D=wt(s.presentationCustomFormat,C);return`<tr class="item-row" style="border-top:1px dashed #000;">
            <td class="col-cant" style="vertical-align:top;text-align:left;padding:4px 1px;font-weight:bold;white-space:nowrap;font-size:${f}px;"></td>
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;font-size:${f}px;">${t(D)}</td>
            ${V}
            ${B}
        </tr>`}if(Z){const D=ut(C.description,C.unit),vt=D.presentation?`<span class="item-presentation" style="font-size:${w}px;margin:0 3px;">${t(D.presentation)}</span>`:"";return`<tr class="item-row" style="border-top:1px dashed #000;">
            ${W}
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;">
                <div style="font-size:${f}px;">${vt}<span class="item-name">${t(D.name)}</span></div>
            </td>
            ${V}
            ${B}
        </tr>`}const Q=bt(C.unit),ht=Q?`<div style="font-size:${w}px;font-style:italic;font-weight:normal;color:#444;">${t(Q)}</div>`:"";return`<tr class="item-row" style="border-top:1px dashed #000;">
            ${W}
            <td class="col-prod" style="vertical-align:top;text-align:left;padding:4px 1px;word-break:break-word;overflow-wrap:break-word;">
                <div style="font-size:${f}px;">${t(C.description)}</div>
                ${ht}
            </td>
            ${V}
            ${B}
        </tr>`}).join(`
`),dt=R&&y?`<p class="info-line">Vigencia: ${q(St(c,y),"dd/MM/yyyy",{locale:G})} (${y} días)</p>`:"",ct=R?`<p class="info-line">No. Cotización: ${t(p)}</p>
           <p class="info-line">Fecha: ${j}</p>
           ${dt}
           <p class="info-line">Atendido por: ${t(m)}</p>
           <p class="info-line">Cliente: ${t(d||"Cliente Genérico")}</p>
           ${a?`<p class="info-line">Tel: ${t(a)}</p>`:""}`:`<p class="info-line">Ticket: ${t(p)}</p>
           <p class="info-line">Fecha: ${j}</p>
           <p class="info-line">Cajero: ${t(m)}</p>
           <p class="info-line">Cliente: ${t(d||"Cliente Genérico")}</p>`,mt=R?"PRESUPUESTO / COTIZACIÓN":"Detalle Factura",ft=R?"":`<div class="payment-info">
             <div class="flex-row">
               <span>Pago (${t(u)}):</span>
               <span>${b} ${i(E)}</span>
             </div>
             <div class="flex-row">
               <span>Cambio:</span>
               <span>${b} ${i(k)}</span>
             </div>
           </div>`,gt=R&&T?`<p class="info-line" style="font-style:italic;margin-top:6px;white-space:pre-line;">Nota: ${t(T)}</p>`:"",xt=R?'<p class="thanks">*** PRESUPUESTO NO VALIDO COMO FACTURA ***</p>':'<p class="thanks">*** GRACIAS POR SU COMPRA ***</p>';return`<div class="ticket-container" style="font-family:${_};font-size:${f}px;line-height:${M};padding:4mm ${H+2}px;">
  <div class="ticket-header text-center">
    ${at}
    <p class="pharmacy-name" style="font-size:${U}px;">${t(x)}</p>
    <p class="info-line" style="white-space:pre-line;font-size:${S}px;">${t(o)}</p>
    ${r?`<p class="info-line" style="font-size:${S}px;">${t(r)}</p>`:""}
    ${l?`<p class="info-line" style="font-size:${S}px;">RFC: ${t(l)}</p>`:""}
    ${ot}
    ${lt}
  </div>

  ${et?`<div style="margin-top:8px;">
    ${ct.replace(/class="info-line"/g,`class="info-line" style="font-size:${S}px;"`)}
  </div>`:`<div style="margin-top:4px;font-size:${S}px;">
    <p style="margin:0;">Ticket: ${t(p)}</p>
    <p style="margin:0;">Fecha: ${j}</p>
    <p style="margin:0;">Cajero: ${t(m)}</p>
  </div>`}

  <div class="detalle-factura-header">${mt}</div>

  <table class="ticket-table">
    <thead>
      <tr>
        <th class="col-cant" style="text-align:left;padding:3px 1px;width:12%;font-weight:bold;font-size:${f}px;">Cant</th>
        <th class="col-prod" style="text-align:left;padding:3px 1px;width:48%;font-size:${f}px;">Producto</th>
        <th class="col-price" style="text-align:right;padding:3px 1px;width:20%;font-size:${f}px;">P. Unit</th>
        <th class="col-total" style="text-align:right;padding:3px 1px;width:20%;font-size:${f}px;">Total</th>
      </tr>
    </thead>
    <tbody>
      ${rt}
    </tbody>
  </table>

  <div class="dashed-line"></div>

  <div class="ticket-totals">
    <div class="flex-row sum-row" style="font-size:${z}px;">
      <span>Subtotal:</span>
      <span>${b} ${i(v)}</span>
    </div>
    <div class="flex-row sum-row" style="font-size:${z}px;">
      <span>IVA:</span>
      <span>${b} ${i(g)}</span>
    </div>
    <div class="total-row" style="font-size:${z+6}px;">
      <span>TOTAL:</span>
      <span>${b} ${i($)}</span>
    </div>
    ${pt}
  </div>

  ${gt}

  <div class="dashed-line"></div>

  ${ft}

  <div class="ticket-footer text-center" style="margin-top:16px;font-size:${Y}px;">
    ${J?`<p class="footer-msg">${t(J)}</p>`:""}
    ${A?`<p class="info-line">${t(A)}</p>`:""}
    ${xt}
  </div>
</div>`}function Ot(n){const{pharmacyName:e,address:x,phone:o,rfc:r,cashierName:l,openingTime:p,closingTime:c,initialAmount:m,salesCash:d,salesCard:a,salesServices:h,salesAbonos:v,outflows:g=[],totalReturns:$=0,totalSales:u,finalAmount:E,actualCash:k,difference:y,initialAmountUSD:T,salesUSD:I,actualUSD:A,differenceUSD:O,footerMessage:b,website:N}=n,L=new Date(p).toLocaleString(),F=c?new Date(c).toLocaleString():"",P=new Date().toLocaleString(),s=h&&h>0?`<div class="flex-row" style="color:#6d28d9;">
            <span>SERVICIOS JOYERIA:</span>
            <span>C$ ${i(h)}</span>
          </div>`:"",_=v&&v>0?`<div class="flex-row" style="color:#1d4ed8;">
            <span>ABONOS CRÉDITOS:</span>
            <span>C$ ${i(v)}</span>
          </div>`:"",M=g.reduce((w,z)=>w+Number(z.amount),0),H=g.length>0?`<div style="border-top:1px dashed #000;margin-top:6px;padding-top:6px;">
            <div style="font-weight:700;">DETALLE SALIDAS / RETIROS</div>
            ${g.map(w=>`
              <div style="margin-top:4px;">
                <div>${new Date(w.createdAt).toLocaleTimeString()} ${new Date(w.createdAt).toLocaleDateString()}</div>
                <div class="flex-row">
                  <span style="flex:1;">${t(w.reason)}</span>
                  <span>-C$ ${i(w.amount)}</span>
                </div>
                <div style="color:#6b7280;">Usuario: ${t(l)}</div>
              </div>`).join("")}
          </div>`:"",U=(T||0)+(I||0),S=y!==void 0&&y<0?"#dc2626":"#16a34a",f=y!==void 0&&y>0?"+":"";return`<div class="ticket-container">
  <div class="ticket-header text-center">
    <p class="pharmacy-name">${t(e)}</p>
    <p class="info-line" style="white-space:pre-line;">${t(x)}</p>
    ${o?`<p class="info-line">${t(o)}</p>`:""}
    ${r?`<p class="info-line">RFC: ${t(r)}</p>`:""}
    <p class="info-line" style="font-weight:700;margin-top:8px;font-size:14px;">REPORTE DE CIERRE DE CAJA</p>
    <p class="info-line" style="font-weight:700;">REIMPRESIÓN TICKET Z</p>
  </div>

  <div style="margin-top:8px;">
    <div class="flex-row"><span>CAJA:</span><span>01</span></div>
    <div class="flex-row"><span>CAJERO:</span><span>${t(l)}</span></div>
    <div class="flex-row"><span>APERTURA:</span><span>${L}</span></div>
    ${F?`<div class="flex-row"><span>CIERRE:</span><span>${F}</span></div>`:""}
    <div class="flex-row"><span>IMPRESION:</span><span>${P}</span></div>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row sum-row">
    <span>DESCRIPCION</span>
    <span>VALOR</span>
  </div>

  <div class="flex-row"><span>FONDO INICIAL:</span><span>C$ ${i(m)}</span></div>
  <div class="flex-row"><span>VENTAS EFECTIVO:</span><span>C$ ${i(d)}</span></div>
  <div class="flex-row"><span>VENTAS TARJETA:</span><span>C$ ${i(a)}</span></div>
  ${s}
  ${_}
  <div class="flex-row" style="color:#dc2626;">
    <span>SALIDAS/RECIBOS:</span>
    <span>-C$ ${i(M)}</span>
  </div>
  <div class="flex-row" style="color:#dc2626;">
    <span>DEVOLUCIONES:</span>
    <span>-C$ ${i($)}</span>
  </div>
  ${H}

  <div class="dashed-line"></div>

  <div class="flex-row" style="font-weight:700;">
    <span>TOTAL VENTAS:</span>
    <span>C$ ${i(u)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO ESPERADO:</span>
    <span>C$ ${i(E)}</span>
  </div>
  <div class="flex-row sum-row">
    <span>EFECTIVO REAL:</span>
    <span>C$ ${i(k)}</span>
  </div>
  <div class="flex-row" style="font-weight:700;color:${S};">
    <span>DIFERENCIA C$:</span>
    <span>${f}${i(y)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row"><span>FONDO INICIAL USD:</span><span>$ ${i(T)}</span></div>
  <div class="flex-row"><span>VENTAS USD:</span><span>$ ${i(I)}</span></div>
  <div class="flex-row sum-row"><span>ESPERADO USD:</span><span>$ ${i(U)}</span></div>
  <div class="flex-row sum-row"><span>REAL USD:</span><span>$ ${i(A)}</span></div>
  <div class="flex-row" style="font-weight:700;color:${S};">
    <span>DIFERENCIA USD:</span>
    <span>$ ${i(O)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-footer text-center" style="margin-top:12px;">
    ${b?`<p class="footer-msg">${t(b)}</p>`:""}
    ${N?`<p class="info-line">${t(N)}</p>`:""}
    <p style="margin-top:8px;font-weight:700;">*** FIN DEL REPORTE ***</p>
  </div>
</div>`}function Ft(n){const{pharmacyName:e,address:x,phone:o,rfc:r,ticketId:l,date:p,cashierName:c,amount:m,reason:d,footerMessage:a,website:h,logoSvg:v}=n,g=q(p,"dd/MM/yyyy HH:mm",{locale:G});return`<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${v?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${v}</div>`:""}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${t(e)}</p>
    <p style="white-space:pre-line;margin:0;">${t(x)}</p>
    ${o?`<p style="margin:0;">${t(o)}</p>`:""}
    ${r?`<p style="margin:0;">RFC: ${t(r)}</p>`:""}
    <p style="font-size:14px;font-weight:bold;text-transform:uppercase;margin-top:8px;">Retiro / Salida de Efectivo</p>
  </div>

  <div style="margin-bottom:8px;">
    <p style="margin:0;">Recibo: ${t(l)}</p>
    <p style="margin:0;">Fecha: ${g}</p>
    <p style="margin:0;">Cajero: ${t(c)}</p>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row">
    <span>Monto:</span>
    <span>C$ ${i(m)}</span>
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
</div>`}function Lt(n,e){const{businessName:x,address:o,phone:r,rfc:l,quoteNumber:p,date:c,expirationDays:m,customerName:d,customerPhone:a,cashierName:h,items:v,subtotal:g,total:$,notes:u,footerMessage:E,website:k,logoSvg:y,currencySymbol:T,exchangeRate:I,showTotalUSD:A}=n;return It({pharmacyName:x,address:o,phone:r,rfc:l,ticketId:p,date:c,cashierName:h,clientName:d,clientPhone:a,items:v,subtotal:g,tax:n.tax??Math.max(0,$-g),total:$,paymentMethod:"",amountPaid:0,change:0,validityDays:m,notes:u,footerMessage:E,website:k,logoSvg:y,currencySymbol:T,exchangeRate:I,showTotalUSD:A,documentKind:"quotation"},e)}function Pt(n){const{businessName:e,address:x,phone:o,rfc:r,receiptId:l,date:p,cashierName:c,customerName:m,previousBalance:d,amountPaid:a,newBalance:h,paymentMethod:v,footerMessage:g,website:$,logoSvg:u}=n,E=p.toLocaleDateString()+" "+p.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"});return`<div class="ticket-container">
  <div class="ticket-header text-center" style="margin-bottom:16px;">
    ${u?`<div class="logo-img" style="display:flex;align-items:center;justify-content:center;margin-bottom:8px;">${u}</div>`:""}
    <p style="font-size:16px;font-weight:bold;text-transform:uppercase;margin:0;">${t(e)}</p>
    <p style="white-space:pre-line;margin:0;">${t(x)}</p>
    ${o?`<p style="margin:0;">Tel: ${t(o)}</p>`:""}
    ${r?`<p style="margin:0;">RFC: ${t(r)}</p>`:""}
    <div style="text-align: center; font-weight: bold; text-transform: uppercase; margin: 8px 0; background: #eee; padding: 4px;">Comprobante de Abono</div>
  </div>

  <div style="margin-bottom:8px;">
    <div class="flex-row"><span>Folio:</span><span>${t(l)}</span></div>
    <div class="flex-row"><span>Fecha:</span><span>${E}</span></div>
    <div class="flex-row"><span>Atendido por:</span><span>${t(c)}</span></div>
  </div>

  <div class="dashed-line"></div>

  <div class="flex-row">
    <span>Cliente:</span>
    <span style="text-align:right;">${t(m)}</span>
  </div>

  <div class="dashed-line"></div>

  <div class="ticket-totals" style="margin-top: 16px;">
    <div class="flex-row">
      <span>Saldo Anterior:</span>
      <span>C$ ${i(d)}</span>
    </div>
    <div class="flex-row" style="font-size: 14px; font-weight: bold; margin-top: 4px;">
      <span>MONTO ABONADO:</span>
      <span>C$ ${i(a)}</span>
    </div>
    <div class="flex-row" style="margin-top: 4px;">
      <span>Método de Pago:</span>
      <span>${t(v)}</span>
    </div>

    <div style="border: 1px solid #000; padding: 8px; margin-top: 12px;">
      <div class="flex-row" style="font-size: 16px; font-weight: bold;">
        <span>SALDO ACTUAL:</span>
        <span>C$ ${i(h)}</span>
      </div>
    </div>
  </div>

  <div class="ticket-footer text-center" style="margin-top: 30px; font-size: 10px;">
    ${g?`<p class="footer-msg">${t(g)}</p>`:""}
    ${$?`<p style="margin:0;">${t($)}</p>`:""}
    <div class="dashed-line"></div>
    <p>¡Gracias por su pago!</p>
    <p style="margin-top: 40px;">__________________________</p>
    <p>Firma del Cliente</p>
  </div>
</div>`}export{It as a,Ot as b,Pt as c,Lt as d,Ft as e,Dt as p};
