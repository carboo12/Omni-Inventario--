import{j as t}from"./router-CslgxoCA.js";import{z as j,E as b,a5 as s,l as q}from"./index-BeIe05t8.js";import{a as T}from"./addDays-DBbQPuVc.js";import"./charts-D3gs8ybn.js";const U=({businessName:f,address:v,phone:n,rfc:o,quoteNumber:u,date:l,expirationDays:d,customerName:i,customerPhone:p,cashierName:N,items:g,subtotal:C,total:y,notes:c,footerMessage:m,website:x,logoSvg:h,previewMode:a=!1,currencySymbol:r="C$"})=>{const k=T(l,d);return t.jsxs("div",{id:a?"quote-receipt-preview":"quote-receipt-print",className:q("p-2 text-xs font-mono w-[80mm] mx-auto text-black",a?"bg-white border text-left":"fixed -left-[1000px] top-0 opacity-0 pointer-events-none print:static print:opacity-100 print:visible"),children:[t.jsxs("div",{className:"text-center mb-4",children:[h&&t.jsx("div",{className:"flex justify-center mb-2",children:t.jsx("div",{dangerouslySetInnerHTML:{__html:h},className:"w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full",style:{maxWidth:"48px",maxHeight:"48px"}})}),t.jsx("h2",{className:"text-lg font-bold uppercase",children:f}),t.jsx("p",{className:"whitespace-pre-line",children:v}),n&&t.jsx("p",{children:n}),o&&t.jsxs("p",{children:["RFC: ",o]})]}),t.jsxs("div",{className:"border-2 border-dashed border-black p-2 mb-3 text-center",children:[t.jsx("p",{className:"text-sm font-bold uppercase",children:"PRESUPUESTO / COTIZACION"}),t.jsx("p",{className:"text-[10px] italic mt-1",children:"No valido como comprobante fiscal / factura"})]}),t.jsxs("div",{className:"mb-2",children:[t.jsxs("p",{children:["No. Cotizacion: ",u]}),t.jsxs("p",{children:["Fecha: ",j(l,"dd/MM/yyyy HH:mm",{locale:b})]}),t.jsxs("p",{children:["Vigencia hasta: ",j(k,"dd/MM/yyyy",{locale:b})," (",d," dias)"]}),t.jsxs("p",{children:["Atendido por: ",N]}),i&&i!=="Cliente General"&&t.jsxs(t.Fragment,{children:[t.jsxs("p",{children:["Cliente: ",i]}),p&&t.jsxs("p",{children:["Tel: ",p]})]})]}),t.jsx("div",{className:"border-b border-black border-dashed my-2"}),t.jsxs("table",{className:"w-full text-left",children:[t.jsx("thead",{children:t.jsxs("tr",{children:[t.jsx("th",{className:"w-8",children:"Cant"}),t.jsx("th",{children:"Desc"}),t.jsx("th",{className:"text-right",children:"P.Unit"}),t.jsx("th",{className:"text-right",children:"Total"})]})}),t.jsx("tbody",{children:g.map((e,w)=>t.jsxs("tr",{children:[t.jsx("td",{children:e.quantity}),t.jsx("td",{children:e.description}),t.jsxs("td",{className:"text-right",children:[r," ",s(e.price)]}),t.jsxs("td",{className:"text-right",children:[r," ",s(e.total)]})]},w))})]}),t.jsx("div",{className:"border-b border-black border-dashed my-2"}),t.jsxs("div",{className:"flex justify-between font-bold text-sm",children:[t.jsx("span",{children:"TOTAL:"}),t.jsxs("span",{children:[r," ",s(y)]})]}),c&&t.jsx("div",{className:"mt-2 text-[10px] italic",children:t.jsxs("p",{children:["Nota: ",c]})}),t.jsxs("div",{className:"mt-4 text-center border-t border-dashed border-black pt-3",children:[t.jsx("p",{className:"text-[10px] font-bold",children:"*** PRESUPUESTO NO VENDA ***"}),t.jsx("p",{className:"text-[10px] mt-1",children:"Presente este documento al momento de facturar."}),t.jsx("p",{className:"text-[10px]",children:"Los precios pueden variar sin previo aviso."}),m&&t.jsx("p",{className:"whitespace-pre-line mt-2",children:m}),x&&t.jsx("p",{children:x})]}),!a&&t.jsx("style",{children:`
                    @media print {
                        @page {
                            margin: 0 !important;
                            size: 80mm auto !important;
                        }
                        html,
                        body {
                            margin: 0 !important;
                            padding: 0 !important;
                        }
                        .ticket-container,
                        #quote-receipt-print.ticket-container,
                        #quote-receipt-print {
                            margin-top: 0 !important;
                            padding-top: 0 !important;
                        }
                        body * {
                            visibility: hidden;
                        }
                        #quote-receipt-print, #quote-receipt-print * {
                            visibility: visible;
                            color: #000000 !important;
                            text-shadow: 0 0 0.3px #000 !important;
                            print-color-adjust: exact !important;
                            -webkit-print-color-adjust: exact !important;
                        }
                        #quote-receipt-print {
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
                            opacity: 1 !important;
                            box-shadow: none !important;
                            border: none !important;
                            overflow: visible !important;
                            page-break-before: avoid !important;
                            page-break-after: avoid !important;
                            break-before: avoid !important;
                            break-after: avoid !important;
                        }
                        #quote-receipt-print tr,
                        #quote-receipt-print li {
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                    }
                `})]})};export{U as QuoteReceiptTemplate};
