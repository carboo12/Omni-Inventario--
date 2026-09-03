import{a as m,j as t}from"./router-CslgxoCA.js";import{a as O}from"./charts-D3gs8ybn.js";import{l as c,z as U,a5 as e,E as z}from"./index-9xoa_jsE.js";const L=({pharmacyName:h,address:b,phone:n,rfc:l,ticketId:j,date:f,cashierName:g,clientName:u,items:N,subtotal:v,tax:k,total:d,paymentMethod:y,amountPaid:E,change:w,footerMessage:A,website:p,logoSvg:r,previewMode:s=!1,currencySymbol:a="C$",exchangeRate:o=36.5,showTotalUSD:C=!1,hasEncargoItems:T=!1,isReprint:R=!1})=>{const D=d/o,[I,P]=m.useState(!1);m.useEffect(()=>{P(!0)},[]);const x=t.jsxs("div",{id:s?"receipt-preview":"ticket-print-area",className:c("p-2 text-[13px] w-[80mm] max-w-[80mm] mx-auto text-black",s?"bg-white border text-left":"fixed left-0 top-0 w-[80mm] max-w-[80mm] bg-white text-black z-[-9999] opacity-0 print:opacity-100 print:z-[9999] print:visible print:static print:m-0 print:p-0"),children:[t.jsxs("div",{className:"text-center",children:[r&&t.jsx("div",{className:"flex justify-center mb-1",children:t.jsx("div",{dangerouslySetInnerHTML:{__html:r},className:"w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full",style:{maxWidth:"48px",maxHeight:"48px"}})}),t.jsxs("div",{className:c(r&&"mt-1"),children:[t.jsx("h2",{className:"text-[19px] leading-tight font-extrabold uppercase",children:h}),t.jsx("p",{className:"whitespace-pre-line text-[13px] leading-tight",children:b}),n&&t.jsx("p",{className:"text-[13px] leading-tight",children:n}),l&&t.jsxs("p",{className:"text-[13px] leading-tight",children:["RFC: ",l]})]}),R&&t.jsx("p",{className:"mt-1 font-black text-[12px] border-2 border-black rounded px-1 py-0.5 inline-block",children:"*** REIMPRESIÓN DE TICKET ***"})]}),t.jsxs("div",{className:"mt-2",children:[t.jsxs("p",{className:"text-[13px] leading-tight",children:["Ticket: ",j]}),t.jsxs("p",{className:"text-[13px] leading-tight",children:["Fecha: ",U(f,"dd/MM/yyyy HH:mm",{locale:z})]}),t.jsxs("p",{className:"text-[13px] leading-tight",children:["Cajero: ",g]}),t.jsxs("p",{className:"text-[13px] leading-tight",children:["Cliente: ",u||"Cliente Genérico"]})]}),t.jsx("div",{className:"border-b border-black border-dashed my-2"}),t.jsx("table",{className:"w-full text-left",children:t.jsx("tbody",{children:N.map((i,G)=>t.jsx("tr",{children:t.jsxs("td",{className:"py-0.5 text-[13px] font-semibold leading-snug",children:[t.jsxs("div",{className:"text-[13px] font-semibold leading-snug",children:[i.quantity,i.unit?` ${i.unit.toUpperCase()}`:""," - ",i.description," - P.U ",a," ",e(i.price)," - ",a," ",e(i.total)]}),i.pending&&t.jsx("div",{className:"text-[11px] font-bold text-[#FF5722] uppercase leading-tight",children:"* ENCARGO / ENTREGA PENDIENTE"})]})},G))})}),T&&t.jsx("div",{className:"my-2 border-2 border-black rounded p-1 text-center font-bold text-[12px] leading-tight",children:"ARTÍCULO ENCARGADO / PENDIENTE DE ENTREGA - PAGADO"}),t.jsx("div",{className:"border-b border-black border-dashed my-2"}),t.jsxs("div",{className:"flex justify-between text-[14px] font-semibold",children:[t.jsx("span",{children:"Subtotal:"}),t.jsxs("span",{children:[a," ",e(v)]})]}),t.jsxs("div",{className:"flex justify-between text-[14px] font-semibold",children:[t.jsx("span",{children:"IVA:"}),t.jsxs("span",{children:[a," ",e(k)]})]}),t.jsxs("div",{className:"flex justify-between font-black text-[20px] mt-1 leading-tight",children:[t.jsx("span",{children:"TOTAL:"}),t.jsxs("span",{children:[a," ",e(d)]})]}),C&&t.jsxs("div",{className:"flex justify-between text-[12px] italic",children:[t.jsxs("span",{children:["Equiv. USD (Tasa: ",o,"):"]}),t.jsxs("span",{children:["$ ",e(D)]})]}),t.jsx("div",{className:"border-b border-black border-dashed my-2"}),t.jsxs("div",{className:"flex justify-between text-[14px]",children:[t.jsxs("span",{children:["Pago (",y,"):"]}),t.jsxs("span",{children:[a," ",e(E)]})]}),t.jsxs("div",{className:"flex justify-between text-[14px]",children:[t.jsx("span",{children:"Cambio:"}),t.jsxs("span",{children:[a," ",e(w)]})]}),t.jsxs("div",{className:"mt-4 text-center",children:[t.jsx("p",{className:"whitespace-pre-line text-[13px]",children:A}),p&&t.jsx("p",{className:"text-[13px]",children:p}),t.jsx("p",{className:"mt-2 font-bold text-[13px]",children:"*** GRACIAS POR SU COMPRA ***"})]}),!s&&t.jsx("style",{jsx:!0,global:!0,children:`
                    @media print {
                        @page {
                            size: auto !important;
                            margin: 0 !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 100% !important;
                            height: auto !important;
                            min-height: 0 !important;
                            overflow: visible !important;
                            background: #ffffff !important;
                        }
                        [role="dialog"], [data-radix-portal], .radix-dialog-overlay, .radix-dialog-content {
                            display: none !important;
                            visibility: hidden !important;
                        }
                        body * {
                            visibility: hidden !important;
                        }
                        #ticket-print-area, #ticket-print-area * {
                            visibility: visible !important;
                            box-sizing: border-box !important;
                            color: #000000 !important;
                            text-shadow: 0 0 0.3px #000 !important;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        #ticket-print-area table,
                        #ticket-print-area tbody,
                        #ticket-print-area tr,
                        #ticket-print-area td {
                            page-break-inside: auto !important;
                            break-inside: auto !important;
                            page-break-after: auto !important;
                            break-after: auto !important;
                            page-break-before: auto !important;
                            break-before: auto !important;
                        }
                        #ticket-print-area {
                            position: static !important;
                            float: none !important;
                            width: 80mm !important;
                            max-width: 80mm !important;
                            min-height: 0 !important;
                            height: auto !important;
                            padding: 2mm 2mm 5mm 2mm !important;
                            margin: 0 auto !important;
                            overflow: visible !important;
                            display: block !important;
                        }
                    }
                `})]});return s?x:I?O.createPortal(x,document.body):null};export{L as ReceiptTemplate};
