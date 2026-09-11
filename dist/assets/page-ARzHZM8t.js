import{a,j as e}from"./router-CslgxoCA.js";import{s as j,q as f,r as u,o as b,B as i,C as N,f as v}from"./index-BeIe05t8.js";import{P as w}from"./printer-BABDh7kU.js";import"./charts-D3gs8ybn.js";function R(){const{activeSession:s}=j(),{user:E}=f(),n=u(),[r,d]=a.useState(0),[l,c]=a.useState([]);if(a.useEffect(()=>{s&&b(s.id).then(t=>{c(t);const h=t.reduce((m,p)=>m+p.amount,0);d(h)})},[s]),!s)return e.jsxs("div",{className:"flex flex-col items-center justify-center p-12",children:[e.jsx("p",{children:"Cargando datos de sesiÃ³n..."}),e.jsx(i,{variant:"link",onClick:()=>n.push("/cash-count"),children:"Volver"})]});const o=()=>{window.print()},x=(s.initialAmount||0)+(s.salesCash||0)+(s.salesAbonos||0)-r-(s.totalReturns||0);return e.jsxs("div",{className:"flex flex-col items-center p-6 space-y-6",children:[e.jsxs("div",{className:"w-full max-w-2xl flex justify-between items-center print:hidden",children:[e.jsx("h1",{className:"text-2xl font-bold",children:"Reporte Z (Pre-Cierre)"}),e.jsxs("div",{className:"space-x-2",children:[e.jsx(i,{variant:"outline",onClick:()=>n.push("/cash-count"),children:"Volver"}),e.jsxs(i,{onClick:o,children:[e.jsx(w,{className:"mr-2 h-4 w-4"})," Imprimir"]})]})]}),e.jsx(N,{className:"w-full max-w-sm bg-white shadow-lg print:shadow-none",id:"print-area",children:e.jsxs(v,{className:"p-4 font-mono text-sm space-y-4",children:[e.jsxs("div",{className:"text-center border-b border-dashed pb-4 border-gray-400",children:[e.jsx("h2",{className:"text-xl font-bold",children:"Omni Inventario +"}),e.jsx("p",{children:"Sucursal Central"}),e.jsx("p",{children:"RUC: J0310000000000"}),e.jsx("h3",{className:"text-lg font-bold mt-4",children:"REPORTE Z (PARCIAL)"}),e.jsx("p",{className:"text-xs",children:"NO REDUCE TOTALES FISCALES"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"CAJA:"}),e.jsx("span",{children:"01"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"CAJERO:"}),e.jsx("span",{children:s.cashierName})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"APERTURA:"}),e.jsx("span",{children:new Date(s.openingTime).toLocaleString()})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"IMPRESION:"}),e.jsx("span",{children:new Date().toLocaleString()})]})]}),e.jsx("div",{className:"border-t border-dashed border-gray-400 pt-2 space-y-1",children:e.jsxs("div",{className:"flex justify-between font-bold",children:[e.jsx("span",{children:"DESCRIPCION"}),e.jsx("span",{children:"VALOR"})]})}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"FONDO INICIAL:"}),e.jsx("span",{children:s.initialAmount?.toFixed(2)})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS EFECTIVO:"}),e.jsx("span",{children:s.salesCash?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS TARJETA:"}),e.jsx("span",{children:s.salesCard?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS DOLARES:"}),e.jsx("span",{children:s.salesUSD?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"SALIDAS/RECIBOS:"}),e.jsxs("span",{children:["-",r.toFixed(2)]})]})]}),l.length>0&&e.jsxs("div",{className:"border-t border-dashed border-gray-400 pt-2",children:[e.jsx("div",{className:"font-bold",children:"DETALLE SALIDAS / RETIROS"}),e.jsx("div",{className:"space-y-1 mt-1",children:l.map(t=>e.jsxs("div",{className:"text-xs",children:[e.jsxs("div",{children:[new Date(t.createdAt).toLocaleTimeString()," ",new Date(t.createdAt).toLocaleDateString()]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"flex-1",children:t.reason}),e.jsxs("span",{children:["-",Number(t.amount).toFixed(2)]})]}),e.jsxs("div",{className:"text-gray-500",children:["Usuario: ",s.cashierName]})]},t.id))})]}),e.jsxs("div",{className:"border-t border-dashed border-gray-400 pt-2",children:[e.jsxs("div",{className:"flex justify-between text-lg font-bold",children:[e.jsx("span",{children:"TOTAL VENTAS:"}),e.jsx("span",{children:s.totalSales?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between font-semibold mt-2",children:[e.jsx("span",{children:"EFECTIVO ESPERADO:"}),e.jsx("span",{children:x.toFixed(2)})]})]}),e.jsx("div",{className:"pt-8 text-center text-xs",children:e.jsx("p",{children:"*** FIN DEL REPORTE ***"})})]})}),e.jsx("style",{jsx:!0,global:!0,children:`
                @media print {
                    @page {
                        margin: 0;
                        size: 80mm auto !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    #print-area, #print-area * {
                        visibility: visible;
                        color: #000000 !important;
                        text-shadow: 0 0 0.3px #000 !important;
                        print-color-adjust: exact !important;
                        -webkit-print-color-adjust: exact !important;
                    }
                    #print-area {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100% !important;
                        padding: 0 2mm 15mm 2mm !important;
                        box-shadow: none !important;
                        border: none !important;
                        overflow: visible !important;
                        page-break-inside: avoid !important;
                        break-inside: avoid !important;
                    }
                    .no-print {
                        display: none;
                    }
                }
            `})]})}export{R as default};
