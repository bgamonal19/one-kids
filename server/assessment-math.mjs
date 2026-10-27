// Verify linear equations with a small arithmetic parser, never eval or generated code.
export function linearEquation(source) {
  const tokens = source.replace(/,/g, '.').match(/\d+(?:\.\d+)?|[x()+*/-]/gi);
  if (!tokens || tokens.join('') !== source.replace(/,/g, '.').replace(/\s/g, '').toLowerCase()) return null;
  let at = 0;
  const add = (u, v, sign) => ({ a: u.a + sign * v.a, b: u.b + sign * v.b });
  const multiply = (u, v) => {
    if (u.a && v.a) throw Error('nonlinear');
    return { a: u.a * v.b + v.a * u.b, b: u.b * v.b };
  };
  function atom() {
    const t = tokens[at++];
    if (t === '+' || t === '-') { const value = atom(); return t === '-' ? { a: -value.a, b: -value.b } : value; }
    if (t === '(') { const value = sum(); if (tokens[at++] !== ')') throw Error('parenthesis'); return value; }
    if (t?.toLowerCase() === 'x') return { a: 1, b: 0 };
    if (t && /^\d/.test(t)) return { a: 0, b: Number(t) };
    throw Error('atom');
  }
  function product() {
    let value = atom();
    while (at < tokens.length) {
      const t = tokens[at];
      if (t === '+' || t === '-' || t === ')') break;
      if (t === '*') { at++; value = multiply(value, atom()); }
      else if (t === '/') {
        at++; const divisor = atom();
        if (divisor.a || !divisor.b) throw Error('division');
        value = { a: value.a / divisor.b, b: value.b / divisor.b };
      } else value = multiply(value, atom());
    }
    return value;
  }
  function sum() {
    let value = product();
    while (tokens[at] === '+' || tokens[at] === '-') { const sign = tokens[at++] === '+' ? 1 : -1; value = add(value, product(), sign); }
    return value;
  }
  try { const result = sum(); return at === tokens.length && Number.isFinite(result.a) && Number.isFinite(result.b) ? result : null; }
  catch { return null; }
}
const optionValue = option => {
  const value = option.replace(/\s/g, '').replace(/^x=/i, '').replace(/,/g, '.');
  if (!/^-?\d+(?:\.\d+)?(?:\/-?\d+(?:\.\d+)?)?$/.test(value)) return null;
  const [a, b = 1] = value.split('/').map(Number);
  return Number.isFinite(a / b) ? a / b : null;
};
const number = value => String(Number(value.toFixed(8)));
export function verifyLinearQuestion(question) {
  const values = question.options.map(optionValue);
  if (values.some(value => value === null)) return question;
  const match = question.q.match(/([0-9xX+\-*/()÷×.,\s]+=[0-9xX+\-*/()÷×.,\s]+)/);
  if (!match || !/x/i.test(match[0])) return question;
  const [l, r] = match[0].replace(/[.,\s]+$/, '').replace(/÷/g, '/').replace(/×/g, '*').split('=');
  const left = linearEquation(l.trim()), right = linearEquation(r.trim());
  if (!left || !right) return question;
  const a = left.a - right.a, b = right.b - left.b;
  if (Math.abs(a) < 1e-10) return question;
  const value = b / a;
  if (!Number.isFinite(value)) return question;
  const matches = values.flatMap((v, i) => Math.abs(v - value) < 1e-8 ? [i] : []);
  const options = [...question.options];
  let answer = matches[0];
  if (matches.length !== 1) {
    // Repair a missing answer or equivalent duplicate distractors.
    answer = Number.isInteger(question.answer) && question.answer >= 0 && question.answer < 4 ? question.answer : 0;
    options[answer] = `x = ${number(value)}`;
    const used = new Set([number(value)]);
    options.forEach((option, i) => {
      if (i === answer) return;
      let v = optionValue(option);
      if (used.has(number(v))) { v = value + i + 1; while (used.has(number(v))) v++; options[i] = `x = ${number(v)}`; }
      used.add(number(v));
    });
  }
  return { ...question, options, answer, why: `Al simplificar y reunir los términos: ${number(a)}x = ${number(b)}. Dividimos entre ${number(a)}: x = ${number(value)}. Al sustituir x en la ecuación original, ambos lados valen ${number(left.a * value + left.b)}.` };
}
