import{j as e}from"./router-CslgxoCA.js";import{z as j,E as b,a5 as r,l as T}from"./index-C7l1QfyR.js";import{a as q}from"./addDays-Dxy-SE8U.js";import"./charts-D3gs8ybn.js";const U=({businessName:N,address:f,phone:n,rfc:l,quoteNumber:u,date:d,expirationDays:c,customerName:i,customerPhone:o,cashierName:v,items:y,subtotal:C,total:g,notes:p,footerMessage:x,website:m,logoSvg:h,previewMode:s=!1,currencySymbol:a="C$"})=>{const w=q(d,c);return e.jsxs("div",{id:s?"quote-receipt-preview":"quote-receipt-print",className:T("p-2 text-xs font-mono w-[80mm] mx-auto text-black",s?"bg-white border text-left":"fixed -left-[1000px] top-0 opacity-0 pointer-events-none print:static print:opacity-100 print:visible"),children:[e.jsxs("div",{className:"text-center mb-4",children:[h&&e.jsx("div",{className:"flex justify-center mb-2",children:e.jsx("div",{dangerouslySetInnerHTML:{__html:h},className:"w-12 h-12 flex items-center justify-center [&>svg]:w-full [&>svg]:h-full [&>svg]:max-w-full [&>svg]:max-h-full",style:{maxWidth:"48px",maxHeight:"48px"}})}),e.jsx("h2",{className:"text-lg font-bold uppercase",children:N}),e.jsx("p",{className:"whitespace-pre-line",children:f}),n&&e.jsx("p",{children:n}),l&&e.jsxs("p",{children:["RFC: ",l]})]}),e.jsxs("div",{className:"border-2 border-dashed border-black p-2 mb-3 text-center",children:[e.jsx("p",{className:"text-sm font-bold uppercase",children:"PRESUPUESTO / COTIZACION"}),e.jsx("p",{className:"text-[10px] italic mt-1",children:"No valido como comprobante fiscal / factura"})]}),e.jsxs("div",{className:"mb-2",children:[e.jsxs("p",{children:["No. Cotizacion: ",u]}),e.jsxs("p",{children:["Fecha: ",j(d,"dd/MM/yyyy HH:mm",{locale:b})]}),e.jsxs("p",{children:["Vigencia hasta: ",j(w,"dd/MM/yyyy",{locale:b})," (",c," dias)"]}),e.jsxs("p",{children:["Atendido por: ",v]}),i&&i!=="Cliente General"&&e.jsxs(e.Fragment,{children:[e.jsxs("p",{children:["Cliente: ",i]}),o&&e.jsxs("p",{children:["Tel: ",o]})]})]}),e.jsx("div",{className:"border-b border-black border-dashed my-2"}),e.jsxs("table",{className:"w-full text-left",children:[e.jsx("thead",{children:e.jsxs("tr",{children:[e.jsx("th",{className:"w-8",children:"Cant"}),e.jsx("th",{children:"Desc"}),e.jsx("th",{className:"text-right",children:"P.Unit"}),e.jsx("th",{className:"text-right",children:"Total"})]})}),e.jsx("tbody",{children:y.map((t,k)=>e.jsxs("tr",{children:[e.jsx("td",{children:t.quantity}),e.jsx("td",{children:t.description}),e.jsxs("td",{className:"text-right",children:[a," ",r(t.price)]}),e.jsxs("td",{className:"text-right",children:[a," ",r(t.total)]})]},k))})]}),e.jsx("div",{className:"border-b border-black border-dashed my-2"}),e.jsxs("div",{className:"flex justify-between font-bold text-sm",children:[e.jsx("span",{children:"TOTAL:"}),e.jsxs("span",{children:[a," ",r(g)]})]}),p&&e.jsx("div",{className:"mt-2 text-[10px] italic",children:e.jsxs("p",{children:["Nota: ",p]})}),e.jsxs("div",{className:"mt-4 text-center border-t border-dashed border-black pt-3",children:[e.jsx("p",{className:"text-[10px] font-bold",children:"*** PRESUPUESTO NO VENDA ***"}),e.jsx("p",{className:"text-[10px] mt-1",children:"Presente este documento al momento de facturar."}),e.jsx("p",{className:"text-[10px]",children:"Los precios pueden variar sin previo aviso."}),x&&e.jsx("p",{className:"whitespace-pre-line mt-2",children:x}),m&&e.jsx("p",{children:m})]}),!s&&e.jsx("style",{children:`
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
                            position: absolute;
                            left: 0;
                            top: 0;
                            width: 100% !important;
                            padding: 0 2mm 15mm 2mm !important;
                            opacity: 1 !important;
                            box-shadow: none !important;
                            border: none !important;
                            overflow: visible !important;
                            page-break-inside: avoid !important;
                            break-inside: avoid !important;
                        }
                    }
                `})]})};export{U as QuoteReceiptTemplate};
