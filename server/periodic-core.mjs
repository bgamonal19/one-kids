// Numbers and symbols: IUPAC https://iupac.org/what-we-do/periodic-table-of-elements/
// Spanish educational names. No atomic weights are inferred or generated.
const rows = `H Hidrógeno
He Helio
Li Litio
Be Berilio
B Boro
C Carbono
N Nitrógeno
O Oxígeno
F Flúor
Ne Neón
Na Sodio
Mg Magnesio
Al Aluminio
Si Silicio
P Fósforo
S Azufre
Cl Cloro
Ar Argón
K Potasio
Ca Calcio
Sc Escandio
Ti Titanio
V Vanadio
Cr Cromo
Mn Manganeso
Fe Hierro
Co Cobalto
Ni Níquel
Cu Cobre
Zn Zinc
Ga Galio
Ge Germanio
As Arsénico
Se Selenio
Br Bromo
Kr Kriptón
Rb Rubidio
Sr Estroncio
Y Itrio
Zr Circonio
Nb Niobio
Mo Molibdeno
Tc Tecnecio
Ru Rutenio
Rh Rodio
Pd Paladio
Ag Plata
Cd Cadmio
In Indio
Sn Estaño
Sb Antimonio
Te Telurio
I Yodo
Xe Xenón
Cs Cesio
Ba Bario
La Lantano
Ce Cerio
Pr Praseodimio
Nd Neodimio
Pm Prometio
Sm Samario
Eu Europio
Gd Gadolinio
Tb Terbio
Dy Disprosio
Ho Holmio
Er Erbio
Tm Tulio
Yb Iterbio
Lu Lutecio
Hf Hafnio
Ta Tántalo
W Wolframio
Re Renio
Os Osmio
Ir Iridio
Pt Platino
Au Oro
Hg Mercurio
Tl Talio
Pb Plomo
Bi Bismuto
Po Polonio
At Astato
Rn Radón
Fr Francio
Ra Radio
Ac Actinio
Th Torio
Pa Protactinio
U Uranio
Np Neptunio
Pu Plutonio
Am Americio
Cm Curio
Bk Berkelio
Cf Californio
Es Einstenio
Fm Fermio
Md Mendelevio
No Nobelio
Lr Lawrencio
Rf Rutherfordio
Db Dubnio
Sg Seaborgio
Bh Bohrio
Hs Hasio
Mt Meitnerio
Ds Darmstatio
Rg Roentgenio
Cn Copernicio
Nh Nihonio
Fl Flerovio
Mc Moscovio
Lv Livermorio
Ts Teneso
Og Oganesón`;
export const ELEMENTS = rows.split('\n').map((row, i) => {
  const [symbol, name] = row.split(' ');
  const z = i + 1;
  let period, column;
  if (z <= 2) { period = 1; column = z === 1 ? 1 : 18; }
  else if (z <= 18) { period = z <= 10 ? 2 : 3; const n = z - (period === 2 ? 3 : 11); column = n < 2 ? n + 1 : n + 11; }
  else if (z <= 54) { period = z <= 36 ? 4 : 5; column = z - (period === 4 ? 18 : 36); }
  else if (z <= 86) { period = z <= 56 || z >= 72 ? 6 : 8; column = z <= 56 ? z - 54 : z <= 71 ? z - 54 : z - 68; }
  else { period = z <= 88 || z >= 104 ? 7 : 9; column = z <= 88 ? z - 86 : z <= 103 ? z - 86 : z - 100; }
  return { z, symbol, name, period, column };
});

// Explicit requests, or a short follow-up to the immediately preceding table topic.
export function wantsPeriodicTable(req) {
  if (req.action === 'read') return false;
  if (/tabla peri[oó]dica|periodic table/i.test(req.message)) return true;
  const recent = req.history.slice(-2).map(t => t.content).join(' ');
  return /tabla peri[oó]dica|periodic table/i.test(recent) && /^(pero |y |ahora |por favor )*(completa|con (sus |los )?nombres|agr[eé]ga.*nombres|dib[uú]jala|mu[eé]strala)/i.test(req.message.trim());
}

export function periodicVisual() {
  const shapes = [];
  const text = (x, y, value, size) => shapes.push({ s: 'text', x, y, text: value, size, color: 'black', fill: false });
  for (let group = 1; group <= 18; group++) text(2.5 + (group - 1) * 5.35, 2, String(group), 1.1);
  for (const e of ELEMENTS) {
    const x = (e.column - 1) * 5.35;
    const y = 3 + (e.period - 1) * 7 + (e.period >= 8 ? 3 : 0);
    shapes.push({ s: 'rect', x, y, w: 5.1, h: 6.7, strokeWidth: 0.12, color: e.period >= 8 ? 'purple' : e.column === 18 ? 'blue' : e.column <= 2 ? 'orange' : 'green', fill: false });
    text(x + 2.55, y + 1.3, String(e.z), 1.05);
    text(x + 2.55, y + 3.7, e.symbol, 2);
    text(x + 2.55, y + 5.6, e.name, Math.min(0.93, 8.1 / e.name.length));
  }
  text(13.2, 41.3, '57–71', 1);
  text(13.2, 48.3, '89–103', 1);
  text(10, 57, 'Lantánidos', 1.3);
  text(10, 64, 'Actínidos', 1.3);
  text(48, 70, '118 elementos · Número atómico, símbolo y nombre · Referencia: IUPAC', 1.2);
  return { type: 'sketch', title: 'Tabla periódica completa', reference: 'periodic-table', aspect: 0.72, shapes };
}
