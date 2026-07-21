/**
 * Validación del motor contra los valores CACHEADOS del Excel v7
 * (caso Comercio minorista, 3 productos de ejemplo).
 * Correr: npx tsx tests/validar-vs-excel.ts
 */
import {
  Inputs, calcMargenes, calcPrecioNuevo, calcPrecios, calcResultados,
  calcCaja, calcForecast, calcDescuento, calcAlertas, calcMatriz, simular,
} from '../lib/calc';

const inp: Inputs = {
  params: {
    comisionPct: 0.06, iibbPct: 0.035, financieroPct: 0.02,
    diasStock: 45, diasCobro: 10.85, diasPago: 30, // días de cobro/pago ponderados del mix FLUJO del Excel
    ivaPct: 0.21, margenObjetivo: 0.2,
  },
  costosFijos: 5_900_000,
  productos: [
    { nombre: 'Producto A', precio: 25000, costo: 14000, unidades: 300 },
    { nombre: 'Producto B', precio: 48000, costo: 31000, unidades: 120 },
    { nombre: 'Producto C', precio: 12000, costo: 5500, unidades: 800 },
  ],
};

let fallos = 0;
function check(nombre: string, actual: number, esperado: number, tol = 0.01) {
  const ok = Math.abs(actual - esperado) <= Math.max(tol, Math.abs(esperado) * 1e-9);
  if (!ok) fallos++;
  console.log(`${ok ? '✔' : '✘'} ${nombre}: ${actual}  (Excel: ${esperado})`);
}

console.log('=== MARGENES / DASHBOARD ===');
const { productos, totales } = calcMargenes(inp);
check('Facturación mensual', totales.facturacion, 22_860_000);
check('Contribución total', totales.contribucionTotal, 7_911_100);
check('Margen ponderado', totales.margenPonderado, 0.346067366579178, 1e-9);
check('Peso fijos s/ventas', totales.pesoFijos, 0.258092738407699, 1e-9);
check('Resultado operativo', totales.resultadoOperativo, 2_011_100);
check('Punto de equilibrio', totales.puntoEquilibrio, 17_048_703.7200895);
check('Margen de seguridad', totales.margenSeguridad, 0.254212435691623, 1e-9);

console.log('\n=== Semáforos MARGENES (Excel: 0 🔴, 1 🟡) ===');
check('Pierden plata', productos.filter(p => p.semaforo === 'pierde').length, 0);
check('No absorben fijos', productos.filter(p => p.semaforo === 'no_absorbe').length, 1);

console.log('\n=== PRECIOS: calculadora rápida (costo 10.000, margen 20%) ===');
const calc = calcPrecioNuevo(10_000, 0.2, inp.params);
check('Precio necesario', calc.precioNecesario!, 14_598.540146);
check('Precio final con IVA', calc.precioFinalConIva!, 17_664.233577);
check('Margen real con markup mal hecho', calc.margenRealConMarkupMal, (10000 * 1.2 * (1 - 0.115) - 10000) / (10000 * 1.2), 1e-9);

console.log('\n=== PRECIOS por producto ===');
const precios = calcPrecios(inp);
check('A: precio necesario', precios[0].precioNecesario!, 20_437.956204);
check('A: sugerido con IVA', precios[0].precioSugeridoConIva!, 24_729.927007);
check('A: diferencia', precios[0].diferenciaPct!, -0.182482, 1e-5);
check('C: precio necesario', precios[2].precioNecesario!, 8_029.19708);

console.log('\n=== RESULTADOS (EERR) ===');
const eerr = calcResultados(inp, 0.3);
check('Ventas', eerr.ventas, 22_860_000);
check('Costos variables', eerr.costosVariables, -12_320_000);
check('Margen bruto', eerr.margenBruto, 10_540_000);
check('Comisiones', eerr.comisiones, -1_371_600);
check('IIBB', eerr.iibb, -800_100);
check('Financiero', eerr.financiero, -457_200);
check('Margen contribución', eerr.margenContribucion, 7_911_100);
check('Resultado operativo', eerr.resultadoOperativo, 2_011_100);
check('Impuesto ganancias', eerr.impuestoGanancias, -603_330);
check('Resultado neto', eerr.resultadoNeto, 1_407_770);

console.log('\n=== CAJA ===');
const caja = calcCaja(inp);
check('Ciclo de caja (días)', caja.cicloCaja, 25.85);
check('CMV mensual', caja.cmvMensual, 12_320_000);
check('Plata en stock', caja.plataEnStock, 18_480_000);
check('Plata en la calle', caja.plataEnLaCalle, 10_003_917, 1);
check('Financiación proveedores', caja.financiacionProveedores, -14_907_200);
check('Capital de trabajo', caja.capitalTrabajo, 13_576_717, 1);
check('% atrapado en stock', caja.pctAtrapadoEnStock, 0.64878717347758, 1e-9);
check('Costo financiero anual (3% mensual)', caja.costoFinancieroAnual(0.03), 4_887_618.12, 1);

console.log('\n=== FORECAST (ventas +3%, costos +4%, precios +3% mensual) ===');
const fc = calcForecast(inp, 0.03, 0.04, 0.03);
check('Mes 1: ventas', fc[0].ventas, 22_860_000);
check('Mes 1: resultado', fc[0].resultado, 2_011_100);
check('Mes 2: ventas', fc[1].ventas, 23_545_800);
check('Mes 2: margen %', fc[1].margenContribucionPct, 0.340835010914898, 1e-9);
check('Mes 2: resultado', fc[1].resultado, 1_889_233, 1);
check('Mes 2: acumulado', fc[1].acumulado, 3_900_333, 1);
check('Mes 12: resultado (DASHBOARD)', fc[11].resultado, -44_279.044047, 0.01);

console.log('\n=== DESCUENTOS ===');
const d10 = calcDescuento(totales.margenPonderado, 0.10);
check('10% dto → volumen extra', d10.volumenExtraNecesario!, 0.10 / (0.346067366579178 - 0.10), 1e-9);

console.log('\n=== ALERTAS (Excel: 2 activas) ===');
const alertas = calcAlertas(inp, { forecast: fc, caja, saldoMinimoFlujo: 13_584_870 });
const activas = alertas.filter(a => !a.ok);
check('Alertas activas', activas.length, 2);
console.log('  Activas:', activas.map(a => `#${a.id} ${a.control}`).join(' | '));

console.log('\n=== MATRIZ ===');
const matriz = calcMatriz(inp);
matriz.forEach(m => console.log(`  ${m.nombre}: ${m.cuadrante}`));

console.log('\n=== SIMULADOR (+5% precio, 0% volumen) ===');
const sim = simular(inp, 0.05, 0);
console.log(`  Resultado base ${sim.base.resultado} → simulado ${Math.round(sim.simulado.resultado)} (Δ ${Math.round(sim.deltaResultado)})`);

console.log(`\n${fallos === 0 ? '🟢 TODOS LOS CHECKS PASARON — el motor replica el Excel 1:1' : `🔴 ${fallos} checks fallaron`}`);
process.exit(fallos === 0 ? 0 : 1);
