export type AngleUnit = 'DEG' | 'RAD';
export function calculate(expression: string, unit: AngleUnit = 'DEG', answer = 0): number {
  const input = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-').replace(/π/g, 'pi');
  if (input.length > 500) throw new Error('La operación es demasiado larga.');
  const tokens = input.match(/(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?|[A-Za-z]+|[()+\-*/^!%,]/g) || [];
  if (tokens.join('') !== input.replace(/\s/g, '')) throw new Error('La operación contiene símbolos no reconocidos.');
  let index = 0, depth = 0;
  const peek = () => tokens[index];
  const take = () => tokens[index++];
  const finite = (n: number) => { if (!Number.isFinite(n)) throw new Error('No hay un resultado real finito. Revisa los valores y las divisiones entre cero.'); return n; };
  const toRadians = (x: number) => unit === 'DEG' ? x * Math.PI / 180 : x;
  const fromRadians = (x: number) => unit === 'DEG' ? x * 180 / Math.PI : x;
  const integer = (x: number, max: number) => { if (!Number.isInteger(x) || x < 0 || x > max) throw new Error(`Usa un entero entre 0 y ${max}.`); };
  const factorial = (x: number) => { integer(x, 170); let r = 1; for (let i = 2; i <= x; i++) r *= i; return r; };
  function fn(name: string, args: number[]) {
    const x = args[0], y = args[1];
    const two = ['root', 'nCr', 'nPr', 'logb'].includes(name);
    if (args.length !== (two ? 2 : 1)) throw new Error(`${name} necesita ${two ? 'dos valores separados por coma' : 'un valor'}.`);
    switch (name) {
      case 'sin': return Math.sin(toRadians(x)); case 'cos': return Math.cos(toRadians(x));
      case 'tan': if (Math.abs(Math.cos(toRadians(x))) < 1e-14) throw new Error('La tangente no está definida en ese ángulo.'); return Math.tan(toRadians(x));
      case 'asin': return fromRadians(Math.asin(x)); case 'acos': return fromRadians(Math.acos(x)); case 'atan': return fromRadians(Math.atan(x));
      case 'sinh': return Math.sinh(x); case 'cosh': return Math.cosh(x); case 'tanh': return Math.tanh(x);
      case 'asinh': return Math.asinh(x); case 'acosh': return Math.acosh(x); case 'atanh': return Math.atanh(x);
      case 'sqrt': return Math.sqrt(x); case 'cbrt': return Math.cbrt(x);
      case 'root': if (y === 0) throw new Error('El índice de la raíz no puede ser cero.'); return x < 0 && Number.isInteger(y) && Math.abs(y % 2) === 1 ? -Math.pow(-x, 1 / y) : Math.pow(x, 1 / y);
      case 'ln': return Math.log(x); case 'log': return Math.log10(x); case 'logb': if (y <= 0 || y === 1) throw new Error('La base debe ser positiva y distinta de 1.'); return Math.log(x) / Math.log(y);
      case 'exp': return Math.exp(x); case 'abs': return Math.abs(x); case 'floor': return Math.floor(x); case 'ceil': return Math.ceil(x); case 'round': return Math.round(x);
      case 'nCr': case 'nPr': {
        integer(x, 10000); integer(y, x);
        const k = name === 'nCr' ? Math.min(y, x - y) : y;
        let result = 1; for (let i = 0; i < k; i++) result = finite(result * (x - i) / (name === 'nCr' ? i + 1 : 1));
        return result;
      }
      default: throw new Error(`Función desconocida: ${name}.`);
    }
  }
  function primary(): number {
    if (++depth > 50) throw new Error('Hay demasiados paréntesis anidados.');
    try {
      const token = take();
      if (!token) throw new Error('Completa la operación.');
      if (/^(?:\d|\.)/.test(token)) return Number(token);
      if (token === 'pi') return Math.PI; if (token === 'e') return Math.E; if (token === 'Ans') return answer;
      if (token === '(') { const value = sum(); if (take() !== ')') throw new Error('Falta cerrar un paréntesis.'); return value; }
      if (/^[A-Za-z]+$/.test(token)) {
        if (take() !== '(') throw new Error(`Escribe ${token}(valor).`);
        const args = [sum()]; while (peek() === ',') { take(); args.push(sum()); }
        if (take() !== ')') throw new Error('Falta cerrar un paréntesis.');
        return finite(fn(token, args));
      }
      throw new Error('Revisa el orden de los números y operadores.');
    } finally { depth--; }
  }
  function postfix(): number {
    let value = primary();
    while (peek() === '!' || peek() === '%') value = take() === '!' ? factorial(value) : value / 100;
    return value;
  }
  function power(): number { const left = postfix(); return peek() === '^' ? (take(), finite(Math.pow(left, unary()))) : left; }
  function unary(): number { if (peek() === '+') { take(); return unary(); } if (peek() === '-') { take(); return -unary(); } return power(); }
  function product(): number {
    let value = unary();
    while (peek() === '*' || peek() === '/' || (peek() && /^(?:\d|\.|[A-Za-z]|\()/.test(peek()))) {
      const op = peek() === '*' || peek() === '/' ? take() : '*';
      const right = unary(); value = finite(op === '*' ? value * right : value / right);
    }
    return value;
  }
  function sum(): number { let value = product(); while (peek() === '+' || peek() === '-') { const op = take(); const right = product(); value = finite(op === '+' ? value + right : value - right); } return value; }
  if (!tokens.length) throw new Error('Escribe una operación.');
  const result = sum();
  if (index !== tokens.length) throw new Error('Revisa los paréntesis y las comas.');
  return finite(result);
}
export function formatCalculation(value: number): string { return String(Number(value.toPrecision(12))); }
