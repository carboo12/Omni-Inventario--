import{j as e,a as d}from"./router-CslgxoCA.js";import{Z as _,t as Q,a as Y,D as M,g as z,h as H,i as U,aq as W,B as F,W as ee,k as V,a6 as te,l as f,n as ae}from"./index-DKqHx3fv.js";import{T as se,a as ie,b as O}from"./tabs-ByBXQvuR.js";import{r as ne}from"./customers-yav459Nv.js";import{D as re}from"./dollar-sign-DTAX4ddY.js";import{C as le}from"./credit-card-_mcK6vOt.js";import{A as ce}from"./arrow-left-DroajLwH.js";import{D as oe}from"./delete-BoguFaF8.js";function G({businessName:c,address:o,phone:a,rfc:w,receiptId:A,date:C,cashierName:B,customerName:r,previousBalance:u,amountPaid:s,newBalance:k,paymentMethod:x,footerMessage:m,website:y,logoSvg:j,previewMode:v=!1}){return e.jsxs("div",{className:`receipt-container ${v?"preview":"print-only"}`,id:"receipt-to-print",children:[e.jsx("style",{jsx:!0,children:`
                .receipt-container {
                    width: 80mm;
                    padding: 5mm;
                    font-family: 'Courier New', Courier, monospace;
                    font-size: 12px;
                    color: black;
                    background: white;
                }
                .receipt-container.preview {
                    width: 100%;
                    max-width: 350px;
                    margin: 0 auto;
                    box-shadow: 0 0 10px rgba(0,0,0,0.1);
                    border: 1px solid #eee;
                }
                .header {
                    text-align: center;
                    margin-bottom: 5mm;
                }
                .logo-container {
                    margin-bottom: 2mm;
                }
                .business-name {
                    font-weight: bold;
                    font-size: 16px;
                    text-transform: uppercase;
                }
                .divider {
                    border-top: 1px dashed black;
                    margin: 3mm 0;
                }
                .section-title {
                    text-align: center;
                    font-weight: bold;
                    text-transform: uppercase;
                    margin-bottom: 2mm;
                    background: #eee;
                    padding: 1mm;
                }
                .info-row {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1mm;
                }
                .label {
                    font-weight: bold;
                }
                .total-section {
                    margin-top: 5mm;
                }
                .balance-box {
                    border: 1px solid black;
                    padding: 2mm;
                    margin-top: 3mm;
                }
                .footer {
                    text-align: center;
                    margin-top: 8mm;
                    font-size: 10px;
                }
                @media print {
                    @page {
                        margin: 0 !important;
                        size: auto;
                    }
                    html,
                    body {
                        margin: 0 !important;
                        padding: 0 !important;
                    }
                    .ticket-container,
                    #receipt-to-print.ticket-container,
                    #receipt-to-print {
                        margin-top: 0 !important;
                        padding-top: 0 !important;
                    }
                    .print-only {
                        display: block !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #receipt-to-print, #receipt-to-print * {
                        visibility: visible;
                        color: #000000 !important;
                        text-shadow: 0 0 0.3px #000 !important;
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    #receipt-to-print {
                        display: block !important;
                        position: relative !important;
                        top: 0 !important;
                        left: 0 !important;
                        float: none !important;
                        width: 80mm !important;
                        max-width: 80mm !important;
                        min-height: 0 !important;
                        height: auto !important;
                        padding: 2mm !important;
                        margin: 0 !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                        page-break-before: avoid !important;
                        page-break-after: avoid !important;
                        break-before: avoid !important;
                        break-after: avoid !important;
                    }
                    #receipt-to-print tr,
                    #receipt-to-print li {
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                }
            `}),e.jsxs("div",{className:"header",children:[j&&e.jsx("div",{className:"logo-container",dangerouslySetInnerHTML:{__html:j.replace(/width="[^"]*"/,'width="150"').replace(/height="[^"]*"/,'height="auto"')}}),e.jsx("div",{className:"business-name",children:c}),e.jsx("div",{children:o}),e.jsxs("div",{children:["Tel: ",a]}),w&&e.jsxs("div",{children:["RFC: ",w]})]}),e.jsx("div",{className:"section-title",children:"Comprobante de Abono"}),e.jsxs("div",{className:"info-row",children:[e.jsx("span",{className:"label",children:"Folio:"}),e.jsx("span",{children:A})]}),e.jsxs("div",{className:"info-row",children:[e.jsx("span",{className:"label",children:"Fecha:"}),e.jsxs("span",{children:[C.toLocaleDateString()," ",C.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})]})]}),e.jsxs("div",{className:"info-row",children:[e.jsx("span",{className:"label",children:"Atendido por:"}),e.jsx("span",{children:B})]}),e.jsx("div",{className:"divider"}),e.jsxs("div",{className:"info-row",children:[e.jsx("span",{className:"label",children:"Cliente:"}),e.jsx("span",{style:{textAlign:"right"},children:r})]}),e.jsx("div",{className:"divider"}),e.jsxs("div",{className:"total-section",children:[e.jsxs("div",{className:"info-row",children:[e.jsx("span",{children:"Saldo Anterior:"}),e.jsx("span",{children:_(u)})]}),e.jsxs("div",{className:"info-row",style:{fontSize:"14px",fontWeight:"bold"},children:[e.jsx("span",{children:"MONTO ABONADO:"}),e.jsx("span",{children:_(s)})]}),e.jsxs("div",{className:"info-row",children:[e.jsx("span",{children:"Método de Pago:"}),e.jsx("span",{children:x})]}),e.jsx("div",{className:"balance-box",children:e.jsxs("div",{className:"info-row",style:{fontSize:"16px",fontWeight:"bold"},children:[e.jsx("span",{children:"SALDO ACTUAL:"}),e.jsx("span",{children:_(k)})]})})]}),e.jsxs("div",{className:"footer",children:[m&&e.jsx("p",{children:m}),y&&e.jsx("p",{children:y}),e.jsx("div",{className:"divider"}),e.jsx("p",{children:"¡Gracias por su pago!"}),e.jsx("p",{style:{marginTop:"10mm"},children:"__________________________"}),e.jsx("p",{children:"Firma del Cliente"})]})]})}const I=(c,o="NIO")=>o==="USD"?`$${c.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2})}`:`C$${c.toLocaleString("es-NI",{minimumFractionDigits:2,maximumFractionDigits:2})}`;function ue({isOpen:c,onClose:o,customer:a,sessionId:w,userId:A,userName:C,onSuccess:B}){const{settings:r}=Q(),{toast:u}=Y(),[s,k]=d.useState("cash-nio"),[x,m]=d.useState(!1),[y,j]=d.useState(!1),[v,$]=d.useState(null),[T,h]=d.useState(""),[D,p]=d.useState(""),[i,S]=d.useState("amount");if(d.useEffect(()=>{c&&(h(""),p(""),m(!1),j(!1),$(null),k("cash-nio"),S("amount"))},[c]),!a)return null;const n=parseFloat(T)||0,P=parseFloat(D)||0;let g=0;s==="cash-nio"?g=P-n:s==="cash-usd"&&(g=P*parseFloat(r.exchangeRate)-n);const L=n>0&&n<=a.currentBalance,Z=L&&(s==="card"||g>=0),N=t=>{t==="."&&(i==="amount"?T:D).includes(".")||(i==="amount"?h(l=>l+t):p(l=>l+t))},q=()=>{i==="amount"?h(t=>t.slice(0,-1)):p(t=>t.slice(0,-1))},K=()=>{i==="amount"?h(""):p("")},X=()=>{i==="amount"?h(a.currentBalance.toFixed(2)):p(n.toFixed(2))},b=t=>{i==="amount"?h(l=>((parseFloat(l)||0)+t).toFixed(2)):p(l=>((parseFloat(l)||0)+t).toFixed(2))},E=async()=>{if(!(!L||x)){m(!0);try{let t="Efectivo C$";s==="cash-usd"&&(t="Efectivo $"),s==="card"&&(t="Tarjeta");const l=await ne({customerId:a.id,amount:n,paymentMethod:t,sessionId:w,userId:A});if(l.success){const R={businessName:r.ticketHeader.name,address:r.ticketHeader.address,phone:r.ticketHeader.phone,rfc:r.ticketHeader.rfc,receiptId:`ABO-${Date.now().toString().slice(-6)}`,date:new Date,cashierName:C||"Cajero",customerName:a.fullName,previousBalance:a.currentBalance,amountPaid:n,newBalance:a.currentBalance-n,paymentMethod:t,footerMessage:r.ticketFooter.message,website:r.ticketFooter.website,logoSvg:r.logoSvg};$(R),j(!0),B(),u({title:"Abono Registrado",description:`Se ha aplicado un abono de ${I(n)}`})}else{const R=l.error||"No se pudo registrar el abono";u({title:"Error",description:R,variant:"destructive"})}}catch{u({title:"Error",description:"Ocurrió un error inesperado",variant:"destructive"})}finally{m(!1)}}},J=()=>{setTimeout(()=>{window.print(),o()},100)};return y&&v?e.jsxs(M,{open:c,onOpenChange:o,children:[e.jsxs(z,{className:"max-w-md",children:[e.jsx(H,{children:e.jsxs(U,{className:"flex items-center gap-2 text-[#8BC34A]",children:[e.jsx(W,{className:"h-6 w-6"}),"Abono Registrado Exitosamente"]})}),e.jsx("div",{className:"flex flex-col items-center p-4 bg-gray-50 rounded-xl border border-dashed",children:e.jsx(G,{...v,previewMode:!0})}),e.jsxs("div",{className:"grid grid-cols-2 gap-3 mt-4",children:[e.jsx(F,{variant:"outline",onClick:o,className:"h-12 font-bold rounded-xl",children:"CERRAR"}),e.jsx(F,{onClick:J,className:"h-12 font-black rounded-xl bg-[#673AB7] hover:bg-[#5E35B1] text-white shadow-lg",children:"IMPRIMIR TICKET"})]})]}),e.jsx(G,{...v})]}):e.jsx(M,{open:c,onOpenChange:x?void 0:o,children:e.jsx(z,{className:"max-w-[95vw] sm:max-w-[1100px] p-0 overflow-hidden border-none shadow-2xl",children:e.jsxs("div",{className:"flex flex-col md:flex-row h-[90vh] md:h-[750px] bg-white",children:[e.jsxs("div",{className:"w-full md:w-[42%] p-6 flex flex-col border-r bg-gray-50/50",children:[e.jsx(H,{className:"mb-4",children:e.jsxs(U,{className:"flex items-center gap-2 text-2xl font-black text-[#673AB7]",children:[e.jsx(ee,{className:"h-7 w-7"}),"ABONO DE CLIENTE"]})}),e.jsxs("div",{className:"space-y-4 flex-1",children:[e.jsxs("div",{className:"p-4 rounded-xl bg-white border shadow-sm space-y-1",children:[e.jsx("p",{className:"text-[10px] font-black text-gray-400 uppercase tracking-widest",children:"Cliente Seleccionado"}),e.jsx("p",{className:"text-lg font-bold truncate",children:a.fullName}),e.jsxs("div",{className:"pt-2 flex justify-between items-end",children:[e.jsx("span",{className:"text-xs font-bold text-destructive uppercase",children:"Saldo Pendiente"}),e.jsx("span",{className:"text-2xl font-black text-destructive",children:I(a.currentBalance)})]})]}),e.jsxs("div",{className:f("p-4 rounded-xl border-2 transition-all cursor-pointer",i==="amount"?"border-[#673AB7] bg-[#673AB7]/5 ring-4 ring-[#673AB7]/10":"border-transparent bg-white shadow-sm"),onClick:()=>S("amount"),children:[e.jsx(V,{className:"text-xs font-black uppercase mb-2 block",children:"Monto a Abonar (C$)"}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(te,{className:f("h-6 w-6",i==="amount"?"text-[#673AB7]":"text-gray-300")}),e.jsx("span",{className:"text-3xl font-mono font-black",children:T||"0.00"})]}),n>a.currentBalance&&e.jsx("p",{className:"text-[10px] text-destructive font-bold mt-1 uppercase",children:"Excede el saldo"})]}),e.jsxs(se,{value:s,onValueChange:k,className:"w-full",children:[e.jsxs(ie,{className:"grid w-full grid-cols-3 h-12 bg-gray-200 p-1 rounded-xl",children:[e.jsx(O,{value:"cash-nio",className:"rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#673AB7] font-bold",children:"C$"}),e.jsx(O,{value:"cash-usd",className:"rounded-lg data-[state=active]:bg-white data-[state=active]:text-[#03A9F4] font-bold",children:"$"}),e.jsx(O,{value:"card",className:"rounded-lg data-[state=active]:bg-white data-[state=active]:text-blue-600 font-bold",children:"Tarjeta"})]}),e.jsx("div",{className:"mt-4",children:s!=="card"?e.jsxs("div",{className:f("p-4 rounded-xl border-2 transition-all cursor-pointer",i==="received"?"border-[#03A9F4] bg-[#03A9F4]/5 ring-4 ring-[#03A9F4]/10":"border-transparent bg-white shadow-sm"),onClick:()=>S("received"),children:[e.jsxs(V,{className:"text-xs font-black uppercase mb-2 block",children:["Recibido (",s==="cash-nio"?"C$":"$",")"]}),e.jsxs("div",{className:"flex items-center justify-between",children:[e.jsx(re,{className:f("h-6 w-6",i==="received"?"text-[#03A9F4]":"text-gray-300")}),e.jsx("span",{className:"text-3xl font-mono font-black",children:D||"0.00"})]})]}):e.jsxs("div",{className:"p-8 border-2 border-dashed border-blue-200 rounded-xl bg-blue-50 flex flex-col items-center justify-center text-center",children:[e.jsx(le,{className:"h-12 w-12 text-blue-500 mb-2"}),e.jsx("p",{className:"text-sm font-bold text-blue-700",children:"Confirmar pago con tarjeta"})]})})]}),s!=="card"&&n>0&&e.jsxs("div",{className:f("p-4 rounded-xl flex justify-between items-center animate-in zoom-in-95",g<0?"bg-red-50 text-red-700 border border-red-200":"bg-green-50 text-green-700 border border-green-200"),children:[e.jsx("span",{className:"font-black text-xs uppercase",children:g<0?"Faltante":"Cambio"}),e.jsx("span",{className:"text-2xl font-black",children:I(Math.abs(g))})]})]}),e.jsxs("div",{className:"mt-4 grid grid-cols-2 gap-2",children:[e.jsx(F,{variant:"outline",onClick:o,className:"h-12 font-bold rounded-xl",children:"CANCELAR"}),e.jsx(F,{className:"h-12 font-black rounded-xl bg-[#8BC34A] hover:bg-[#7CB342] text-white shadow-lg disabled:opacity-50",disabled:!Z||x,onClick:E,children:x?e.jsx(ae,{className:"animate-spin"}):"CONFIRMAR"})]})]}),e.jsxs("div",{className:"flex-1 bg-white p-2 flex flex-col",children:[e.jsxs("div",{className:f("p-2 rounded-t-lg text-white font-black flex justify-between items-center transition-colors",i==="amount"?"bg-[#673AB7]":"bg-[#03A9F4]"),children:[e.jsx("span",{className:"text-sm uppercase tracking-widest",children:i==="amount"?"Editando: MONTO ABONO":"Editando: EFECTIVO RECIBIDO"}),e.jsx("span",{className:"text-xs opacity-80",children:"TOUCH INTERFACE"})]}),e.jsxs("div",{className:"flex-1 grid grid-cols-4 grid-rows-4 gap-2 mt-2",children:[e.jsxs("div",{className:"bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center transition-all active:scale-95",onClick:K,children:[e.jsx(ce,{className:"w-8 h-8 mb-1"}),e.jsx("span",{className:"font-black text-xs",children:"BORRAR"})]}),[1,4,7].map(t=>e.jsx("div",{className:"bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95",onClick:()=>N(t.toString()),children:t},t)),e.jsx("div",{className:"bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black text-center p-2 transition-all active:scale-95 leading-tight",onClick:X,children:e.jsxs("span",{className:"text-sm",children:["PAGO",e.jsx("br",{}),"EXACTO"]})}),[2,5,8].map(t=>e.jsx("div",{className:"bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95",onClick:()=>N(t.toString()),children:t},t)),e.jsx("div",{className:"bg-[#FF5722] hover:bg-[#F4511E] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:q,children:e.jsx(oe,{className:"w-8 h-8"})}),[3,6,9].map(t=>e.jsx("div",{className:"bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95",onClick:()=>N(t.toString()),children:t},t)),e.jsx("div",{className:"bg-[#4CAF50] hover:bg-[#388E3C] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-2xl transition-all active:scale-95",onClick:E,children:e.jsx(W,{className:"w-10 h-10"})}),s==="cash-nio"?e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:()=>b(10),children:[e.jsx("span",{className:"text-xs opacity-70",children:"C$"}),e.jsx("span",{className:"text-xl",children:"10"})]}),e.jsxs("div",{className:"bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:()=>b(50),children:[e.jsx("span",{className:"text-xs opacity-70",children:"C$"}),e.jsx("span",{className:"text-xl",children:"50"})]}),e.jsxs("div",{className:"bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:()=>b(100),children:[e.jsx("span",{className:"text-xs opacity-70",children:"C$"}),e.jsx("span",{className:"text-xl",children:"100"})]})]}):e.jsxs(e.Fragment,{children:[e.jsxs("div",{className:"bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:()=>b(1),children:[e.jsx("span",{className:"text-xs opacity-70",children:"$"}),e.jsx("span",{className:"text-xl",children:"1"})]}),e.jsxs("div",{className:"bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:()=>b(5),children:[e.jsx("span",{className:"text-xs opacity-70",children:"$"}),e.jsx("span",{className:"text-xl",children:"5"})]}),e.jsxs("div",{className:"bg-[#FF9800] hover:bg-[#F57C00] text-white rounded-lg cursor-pointer flex flex-col items-center justify-center font-black transition-all active:scale-95",onClick:()=>b(20),children:[e.jsx("span",{className:"text-xs opacity-70",children:"$"}),e.jsx("span",{className:"text-xl",children:"20"})]})]})]}),e.jsxs("div",{className:"h-20 grid grid-cols-4 gap-2 mt-2",children:[e.jsx("div",{className:"bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95",onClick:()=>N("."),children:"."}),e.jsx("div",{className:"bg-[#03A9F4] hover:bg-[#0288D1] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-4xl transition-all active:scale-95",onClick:()=>N("0"),children:"0"}),e.jsx("div",{className:"col-span-2 bg-[#8BC34A] hover:bg-[#7CB342] text-white rounded-lg cursor-pointer flex items-center justify-center font-black text-xl transition-all active:scale-95",onClick:E,children:"TOTALIZAR ABONO"})]})]})]})})})}export{ue as C};
