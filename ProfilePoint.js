export class ProfilePoint {
    constructor(x, y, transition) {
        this.x = x;
        this.y = y;
        this.transition = transition;
    }

    hasTransition = () => this.transition !== null;
}
