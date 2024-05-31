
export function interpolate(p1, p2, x) {
    return (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x) + p1.y;
}
