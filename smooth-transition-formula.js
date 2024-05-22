

const A = x1 - 2*x2 + x3;
const B = y1 - 2*y2 + y3;
const C = A*x - x3*x1 + x2*x2;

const f = x1 - x2 + (true? 1 : -1) * Math.sqrt(C);

const y = B * f * f / A / A - 2 * (y1 - y2) * f / A + y1;