import{a as c,j as e}from"./router-CslgxoCA.js";import{s as p,q as m,r as f,o as u,B as r,C as b,f as N}from"./index-DKqHx3fv.js";import{P as v}from"./printer-ZcmORV8z.js";import"./charts-DR60U-1e.js";function S(){const{activeSession:s}=p(),{user:w}=m(),l=f(),[a,o]=c.useState([]);if(c.useEffect(()=>{s&&u(s.id).then(o)},[s]),!s)return e.jsxs("div",{className:"flex flex-col items-center justify-center p-12",children:[e.jsx("p",{children:"Cargando datos de sesión..."}),e.jsx(r,{variant:"link",onClick:()=>l.push("/cash-count"),children:"Volver"})]});const x=()=>{window.print()},d=a.reduce((n,j)=>n+Number(j.amount||0),0),i=s?.totalReturns||0,t=Number(s?.salesAbonosCard)||0,h=(s?.initialAmount||0)+(s?.salesCash||0)+((s?.salesAbonos||0)-t)-d-i;return e.jsxs("div",{className:"flex flex-col items-center p-6 space-y-6",children:[e.jsxs("div",{className:"w-full max-w-2xl flex justify-between items-center print:hidden",children:[e.jsx("h1",{className:"text-2xl font-bold",children:"Reporte X (Solo Lectura)"}),e.jsxs("div",{className:"space-x-2",children:[e.jsx(r,{variant:"outline",onClick:()=>l.push("/cash-count"),children:"Volver"}),e.jsxs(r,{onClick:x,children:[e.jsx(v,{className:"mr-2 h-4 w-4"})," Imprimir"]})]})]}),e.jsx(b,{className:"w-full max-w-sm bg-white shadow-lg print:shadow-none",id:"print-area",children:e.jsxs(N,{className:"p-4 font-mono text-sm space-y-4",children:[e.jsxs("div",{className:"text-center border-b border-dashed pb-4 border-gray-400",children:[e.jsx("h2",{className:"text-xl font-bold",children:"Omni Inventario +"}),e.jsx("p",{children:"Sucursal Central"}),e.jsx("p",{children:"RUC: J0310000000000"}),e.jsx("h3",{className:"text-lg font-bold mt-4",children:"CIERRE X"})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"CAJA:"}),e.jsx("span",{children:"01"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"CAJERO:"}),e.jsx("span",{children:s.cashierName})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"APERTURA:"}),e.jsx("span",{children:new Date(s.openingTime).toLocaleString()})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"IMPRESION:"}),e.jsx("span",{children:new Date().toLocaleString()})]})]}),e.jsx("div",{className:"border-t border-dashed border-gray-400 pt-2 space-y-1",children:e.jsxs("div",{className:"flex justify-between font-bold",children:[e.jsx("span",{children:"DESCRIPCION"}),e.jsx("span",{children:"VALOR"})]})}),e.jsxs("div",{className:"space-y-1",children:[e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"FONDO INICIAL:"}),e.jsx("span",{children:s.initialAmount?.toFixed(2)})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS EFECTIVO:"}),e.jsx("span",{children:s.salesCash?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS TARJETA:"}),e.jsx("span",{children:s.salesCard?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"VENTAS DOLARES:"}),e.jsx("span",{children:s.salesUSD?.toFixed(2)||"0.00"})]}),s?.salesAbonos>0&&e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"ABONOS EFECTIVO:"}),e.jsx("span",{children:Number(s?.salesAbonos||0).toFixed(2)})]}),t>0&&e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{children:"ABONOS TARJETA:"}),e.jsx("span",{children:t.toFixed(2)})]}),e.jsxs("div",{className:"flex justify-between text-red-500",children:[e.jsx("span",{children:"SALIDAS / RETIROS:"}),e.jsxs("span",{children:["-",d.toFixed(2)]})]}),i>0&&e.jsxs("div",{className:"flex justify-between text-red-500",children:[e.jsx("span",{children:"DEVOLUCIONES:"}),e.jsxs("span",{children:["-",i.toFixed(2)]})]})]}),a.length>0&&e.jsxs("div",{className:"border-t border-dashed border-gray-400 pt-2",children:[e.jsx("div",{className:"font-bold",children:"DETALLE SALIDAS / RETIROS"}),e.jsx("div",{className:"space-y-1 mt-1",children:a.map(n=>e.jsxs("div",{className:"text-xs",children:[e.jsxs("div",{children:[new Date(n.createdAt).toLocaleTimeString()," ",new Date(n.createdAt).toLocaleDateString()]}),e.jsxs("div",{className:"flex justify-between",children:[e.jsx("span",{className:"flex-1",children:n.reason}),e.jsxs("span",{children:["-",Number(n.amount).toFixed(2)]})]}),e.jsxs("div",{className:"text-gray-500",children:["Usuario: ",s.cashierName]})]},n.id))})]}),e.jsxs("div",{className:"border-t border-dashed border-gray-400 pt-2",children:[e.jsxs("div",{className:"flex justify-between text-lg font-bold",children:[e.jsx("span",{children:"TOTAL VENTAS:"}),e.jsx("span",{children:s.totalSales?.toFixed(2)||"0.00"})]}),e.jsxs("div",{className:"flex justify-between font-semibold mt-2",children:[e.jsx("span",{children:"EFECTIVO EN CAJA:"}),e.jsx("span",{children:h.toFixed(2)})]})]}),e.jsx("div",{className:"pt-8 text-center text-xs",children:e.jsx("p",{children:"*** FIN DEL REPORTE ***"})})]})}),e.jsx("style",{jsx:!0,global:!0,children:`
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
            `})]})}export{S as default};
