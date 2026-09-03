import{a as m,j as e}from"./router-CslgxoCA.js";import{a as O}from"./charts-D3gs8ybn.js";import{l as o,z as U,a5 as t,E as z}from"./index-C7l1QfyR.js";const L=({pharmacyName:h,address:j,phone:n,rfc:r,ticketId:b,date:f,cashierName:N,clientName:g,items:u,subtotal:v,tax:E,total:d,paymentMethod:y,amountPaid:w,change:k,footerMessage:A,website:x,logoSvg:l,previewMode:i=!1,currencySymbol:s="C$",exchangeRate:c=36.5,showTotalUSD:C=!1,hasEncargoItems:T=!1,isReprint:R=!1})=>{const D=d/c,[I,P]=m.useState(!1);m.useEffect(()=>{P(!0)},[]);const p=e.jsxs("div",{id:i?"receipt-preview":"ticket-print-area",className:o("p-2 text-[13px] w-[80mm] mx-auto text-black",i?"bg-white border text-left":"fixed left-0 top-0 w-[80mm] bg-white text-black z-[-9999] opacity-0 print:opacity-100 print:z-[9999] print:visible"),children:[e.jsxs("div",{className:"text-center",children:[l&&e.jsx("div",{className:"flex justify-center mb-1",children:e.jsx("div",{dangerouslySetInnerHTML:{__html:l},className:"w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full",style:{maxWidth:"48px",maxHeight:"48px"}})}),e.jsxs("div",{className:o(l&&"mt-1"),children:[e.jsx("h2",{className:"text-[19px] leading-tight font-extrabold uppercase",children:h}),e.jsx("p",{className:"whitespace-pre-line text-[13px] leading-tight",children:j}),n&&e.jsx("p",{className:"text-[13px] leading-tight",children:n}),r&&e.jsxs("p",{className:"text-[13px] leading-tight",children:["RFC: ",r]})]}),R&&e.jsx("p",{className:"mt-1 font-black text-[12px] border-2 border-black rounded px-1 py-0.5 inline-block",children:"*** REIMPRESIÓN DE TICKET ***"})]}),e.jsxs("div",{className:"mt-2",children:[e.jsxs("p",{className:"text-[13px] leading-tight",children:["Ticket: ",b]}),e.jsxs("p",{className:"text-[13px] leading-tight",children:["Fecha: ",U(f,"dd/MM/yyyy HH:mm",{locale:z})]}),e.jsxs("p",{className:"text-[13px] leading-tight",children:["Cajero: ",N]}),e.jsxs("p",{className:"text-[13px] leading-tight",children:["Cliente: ",g||"Cliente Genérico"]})]}),e.jsx("div",{className:"border-b border-black border-dashed my-2"}),e.jsx("table",{className:"w-full text-left",children:e.jsx("tbody",{children:u.map((a,G)=>e.jsx("tr",{children:e.jsxs("td",{className:"py-0.5 text-[13px] font-semibold leading-snug",children:[e.jsxs("div",{className:"text-[13px] font-semibold leading-snug",children:[a.quantity,a.unit?` ${a.unit.toUpperCase()}`:""," - ",a.description," - P.U ",s," ",t(a.price)," - ",s," ",t(a.total)]}),a.pending&&e.jsx("div",{className:"text-[11px] font-bold text-[#FF5722] uppercase leading-tight",children:"* ENCARGO / ENTREGA PENDIENTE"})]})},G))})}),T&&e.jsx("div",{className:"my-2 border-2 border-black rounded p-1 text-center font-bold text-[12px] leading-tight",children:"ARTÍCULO ENCARGADO / PENDIENTE DE ENTREGA - PAGADO"}),e.jsx("div",{className:"border-b border-black border-dashed my-2"}),e.jsxs("div",{className:"flex justify-between text-[14px] font-semibold",children:[e.jsx("span",{children:"Subtotal:"}),e.jsxs("span",{children:[s," ",t(v)]})]}),e.jsxs("div",{className:"flex justify-between text-[14px] font-semibold",children:[e.jsx("span",{children:"IVA:"}),e.jsxs("span",{children:[s," ",t(E)]})]}),e.jsxs("div",{className:"flex justify-between font-black text-[20px] mt-1 leading-tight",children:[e.jsx("span",{children:"TOTAL:"}),e.jsxs("span",{children:[s," ",t(d)]})]}),C&&e.jsxs("div",{className:"flex justify-between text-[12px] italic",children:[e.jsxs("span",{children:["Equiv. USD (Tasa: ",c,"):"]}),e.jsxs("span",{children:["$ ",t(D)]})]}),e.jsx("div",{className:"border-b border-black border-dashed my-2"}),e.jsxs("div",{className:"flex justify-between text-[14px]",children:[e.jsxs("span",{children:["Pago (",y,"):"]}),e.jsxs("span",{children:[s," ",t(w)]})]}),e.jsxs("div",{className:"flex justify-between text-[14px]",children:[e.jsx("span",{children:"Cambio:"}),e.jsxs("span",{children:[s," ",t(k)]})]}),e.jsxs("div",{className:"mt-4 text-center",children:[e.jsx("p",{className:"whitespace-pre-line text-[13px]",children:A}),x&&e.jsx("p",{className:"text-[13px]",children:x}),e.jsx("p",{className:"mt-2 font-bold text-[13px]",children:"*** GRACIAS POR SU COMPRA ***"})]}),!i&&e.jsx("style",{jsx:!0,global:!0,children:`
                    @media print {
                        @page {
                            size: 80mm auto !important;
                            margin: 0mm !important;
                        }
                        html, body {
                            margin: 0 !important;
                            padding: 0 !important;
                            width: 80mm !important;
                        }
                        body * {
                            visibility: hidden !important;
                        }
                        #ticket-print-area, #ticket-print-area * {
                            visibility: visible !important;
                            box-sizing: border-box !important;
                        }
                        #ticket-print-area {
                            position: absolute !important;
                            left: 0 !important;
                            top: 0 !important;
                            width: 100% !important;
                            max-width: 80mm !important;
                            padding: 0mm 2mm 2mm 2mm !important;
                            margin: 0 !important;
                        }
                    }
                `})]});return i?p:I?O.createPortal(p,document.body):null};export{L as ReceiptTemplate};
