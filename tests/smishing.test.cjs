// Ejecutar: node tests/smishing.test.cjs
const assert=require('node:assert/strict');
const {analyze}=require('../engine.js');
const cases=[
 ["entrega SMS",'Hola, notamos que tu direccion no esta completa. Necesitamos que la actualices para enviar tu pedido sin ningun tipo de inconveniente. https://bit.ly/46TgWzX','alto',['paqueteria','acortador_tramite']],
 ["multa falsa SMS",'<Multas MX> Su placa tiene una sancion. Pague en linea y evite la retencion de su vehiculo: https://amxzvrf.shop/ETC','alto',['multa','sitio_cobro']],
 ["multa sin URL",'<Multas MX> Su placa tiene una sancion. Pague en linea y evite la retencion de su vehiculo.','alto',['multa','amenaza']],
 ["mensaje corriente",'Hola, te aviso que llego el pedido. Nos vemos manana.','indeterminado',[]]
];
for(const [name,text,expected,signals] of cases){
 const result=analyze(text);
 assert.equal(result.level,expected,name+': nivel');
 for(const id of signals)assert.ok(result.signals.some(s=>s.id===id),name+': señal '+id);
 console.log('OK',name,result.level,result.score);
}
