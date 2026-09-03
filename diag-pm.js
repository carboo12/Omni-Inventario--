function normalize(value){return (value||'').toUpperCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');}
function bucket(pm){const m=normalize(pm);
  const isUsd=/USD|DOLAR/.test(m)||(m.includes('$')&&!m.includes('C$'));
  if(isUsd)return 'usd';
  if(/CASH|EFECTIVO|CONTADO/.test(m))return 'cash';
  if(/CARD|TARJETA|TRANSF|PAGO MOVIL|SINPE/.test(m))return 'card';
  if(/CREDIT|FIADO/.test(m))return 'credit';
  return 'other';}
const tests=['Efectivo C$','Efectivo $','Tarjeta','Efectivo','Dolares','Credito','CASH','EFECTIVO','CONTADO','CASH_NIO','CASH_USD','CARD','TARJETA','TRANSFER','TRANSFERENCIA','PAGO MOVIL'];
for(const t of tests){console.log(t.padEnd(15),'=>',bucket(t));}
