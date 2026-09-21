import{a as t,j as e}from"./router-CslgxoCA.js";import{s as u,q as b,r as N,o as v,B as r,C as w,f as A}from"./index-DKqHx3fv.js";import{P as E}from"./printer-ZcmORV8z.js";import"./charts-DR60U-1e.js";function g(){const{activeSession:s}=u(),{user:y}=b(),l=N(),[d,o]=t.useState(0),[c,x]=t.useState([]);if(t.useEffect(()=>{s&&v(s.id).then(a=>{x(a);const p=a.reduce((m,f)=>m+f.amount,0);o(p)})},[s]),!s)return e.jsxs("div",{className:"flex flex-col items-center justify-center p-12",children:[e.jsx("p",{children:"Cargando datos de sesión..."}),e.jsx(r,{variant:"link",onClick:()=>l.push("/cash-count"),children:"Volver"})]});const h=()=>{window.print()},n=Number(s?.salesAbonos||0),i=Number(s?.salesAbonosCard||0),j=(s.initialAmount||0)+(s.salesCash||0)+(n-i)-d-(s.totalReturns||0);return e.jsxs("div",{className:"flex flex-col items-center p-6 space-y-6",children:[e.jsxs("div",{className:"w-full max-w-2xl flex justify-between items-center print:hidden",children:[e.jsx("h1",{className:"text-2xl font-bold",children:"Reporte Z (Pre-Cierre)"}),e.jsxs("div",{className:"space-x-2",children:[e.jsx(r,{variant:"outline",onClick:()=>l.push("/cash-count"),children:"Volver"}),e.jsxs(r,{onClick:h,children:[e.jsx(E,{className:"mr-2 h-4 w-4"})," Imprimir"]})]})]}),e.jsx(w,{className:"w-full max-w-sm bg-white shadow-lg print:shadow-none",id:"print-area",children:e.jsxs(A,{className:"p-4 font-mono text-sm space-y-4",children:[e.jsxs("div",{className:"text-center border-b border-dashed pb-4 border-gray-400",children:[e.jsx("h2",{className:"text-xl font-bold",children:"Omni Inventario +"}),e.jsx("p",{children:"Sucursal Central"}),e.jsx("p",{children:"RUC: J0310000000000"}),e.jsx("h3",{className:"text-lg font-bold mt-4",children:"REPORTE Z (PARCIAL)"}),e.jsx("p",{className:"text-xs",children:"NO REDUCE TOTALES FISCALES"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"CAJA:"}),e.jsx("span",{children:"01"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"CAJERO:"}),e.jsx("span",{children:s.cashierName})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"APERTURA:"}),e.jsx("span",{children:new Date(s.openingTime).toLocaleString()})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"IMPRESION:"}),e.jsx("span",{children:new Date().toLocaleString()})]})]}),e.jsx("div",{className:"border-t border-dashed border-gray-400 pt-2 space-y-1",children:e.jsxs("div",{className:"flex justify-between font-bold",children:[e.jsx("span",{children:"DESCRIPCION"}),e.jsx("span",{children:"VALOR"})]})}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"FONDO INICIAL:"}),e.jsx("span",{children:s.initialAmount?.toFixed(2)})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS EFECTIVO:"}),e.jsx("span",{children:s.salesCash?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS TARJETA:"}),e.jsx("span",{children:s.salesCard?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS DOLARES:"}),e.jsx("span",{children:s.salesUSD?.toFixed(2)||"0.00"})]}),n>0&&e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"ABONOS EFECTIVO:"}),e.jsx("span",{children:n.toFixed(2)})]}),i>0&&e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"ABONOS TARJETA:"}),e.jsx("span",{children:i.toFixed(2)})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"SALIDAS/RECIBOS:"}),e.jsxs("span",{children:["-",d.toFixed(2)]})]})]}),c.length>0&&e.jsxs("div",{className:"border-t border-dashed border-gray-400 pt-2",children:[e.jsx("div",{className:"font-bold",children:"DETALLE SALIDAS / RETIROS"}),e.jsx("div",{className:"space-y-1 mt-1",children:c.map(a=>e.jsxs("div",{className:"text-xs",children:[e.jsxs("div",{children:[new Date(a.createdAt).toLocaleTimeString()," ",new Date(a.createdAt).toLocaleDateString()]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"flex-1",children:a.reason}),e.jsxs("span",{children:["-",Number(a.amount).toFixed(2)]})]}),e.jsxs("div",{className:"text-gray-500",children:["Usuario: ",s.cashierName]})]},a.id))})]}),e.jsxs("div",{className:"border-t border-dashed border-gray-400 pt-2",children:[e.jsxs("div",{className:"flex justify-between text-lg font-bold",children:[e.jsx("span",{children:"TOTAL VENTAS:"}),e.jsx("span",{children:s.totalSales?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between font-semibold mt-2",children:[e.jsx("span",{children:"EFECTIVO ESPERADO:"}),e.jsx("span",{children:j.toFixed(2)})]})]}),e.jsx("div",{className:"pt-8 text-center text-xs",children:e.jsx("p",{children:"*** FIN DEL REPORTE ***"})})]})}),e.jsx("style",{jsx:!0,global:!0,children:`
                @media print {
                    @page {
                        margin: 0;
                        size: auto;
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
            `})]})}export{g as default};
