
export function interpolate(p1, p2, x) {
    return (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x) + p1.y;
}

export function interpolateT(p1, p2, t) {
    return { x: p1.x + t * (p2.x - p1.x), y: p1.y + t * (p2.y - p1.y) };
}