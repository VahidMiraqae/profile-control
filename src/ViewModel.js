import { Command } from "./Command";
import { ProfilePoint } from "./ProfilePoint";
import { interpolate } from "./interpolate";

export class ViewModel {
    constructor() {

        // making commands
        this.addHandleCommand = new Command(this.addHandle, this.canAddHandle);
        this.removeHandleCommand = new Command(this.removeHandle, this.canRemoveHandle);
        this.moveHandleCommand = new Command(this.moveHandle, this.canMoveHandle);
        this.applySmoothTransitionCommand = new Command(this.applySmoothTransition, this.canApplySmoothTransition);
        this.removeSmoothTransitionCommand = new Command(this.removeSmoothTransition, this.canRemoveSmoothTransition);
        this.moveSmoothTransitionHandleCommand = new Command(this.moveSmoothTransitionHandle, this.canMoveSmoothTransitionHandle);
        this.moveStartCommand = new Command(this.moveStartCommand, this.canMoveStartCommand);
        // end of making commands
        this.period = 360;
        this.points = [
            new ProfilePoint(0, 0, { before: 15, after: 5 }),
            new ProfilePoint(16, 1, { before: 5, after: 15 }),
            new ProfilePoint(180, 1, { before: 15, after: 5 }),
            new ProfilePoint(196, 0, { before: 5, after: 15 }),
        ];
        this.start = 10;
    }

    getPoints = () => this.points;

    addHandle = ({ x, y }) => {
        for (let id = 0; id < this.points.length - 1; id++) {
            const point = this.points[id];
            if (x > point.x && x < this.points[id + 1].x) {
                y = y > 0.5 ? 1 : 0;
                this.points.splice(id + 1, 0, new ProfilePoint(x, y, null));
                break;
            }
        }
    };

    canAddHandle = ({ x, y }) => {
        return true;
    };

    removeHandle = ({ handleId }) => {
        this.points.splice(handleId, 1);
    };

    canRemoveHandle = ({ handleId }) => {
        return handleId !== null
            && handleId !== 0
            && handleId !== this.points.length - 1;
    };

    moveHandle = ({ id, newX, newY }) => {
        const current = this.points[id];
        const y = newY > 0.5 ? 1 : 0;
        let x = newX;
        if (id > 0) {
            let minControl = 0, maxControl = 0;
            if (current.hasTransition()) {
                minControl = x - current.transition.before;
                maxControl = x + current.transition.after;
            } else {
                minControl = x;
                maxControl = x;
            }
            const previous = this.points[id - 1];
            let minX = previous.x + (previous.hasTransition() ? previous.transition.after : 0)
            let maxX = 0;
            if (id < this.points.length - 1) {
                const next = this.points[id + 1];
                maxX = next.x - (next.hasTransition() ? next.transition.before : 0)
            }
            else if (this.points[0].hasTransition() && this.getTransitionPoints(0).p1.x < 0) {
                maxX = this.getTransitionPoints(0).p1.x + this.period;
            }
            else {
                maxX = this.period;
            }

            minX += 5;
            maxX -= 5;

            if (minControl < minX)
                x = minX + (current.hasTransition() ? current.transition.before : 0);
            else if (maxControl > maxX)
                x = maxX - (current.hasTransition() ? current.transition.after : 0);
        }
        else {
            x = 0;
        }
        this.points[id] = { ...current, x: x, y: y };
    };

    canMoveHandle = ({ id, newX, newY }) => {
        return newX >= 0 && newX <= 360;
    };

    applySmoothTransition = ({ handleId }) => {
        const aa = this.points[handleId];
        this.points[handleId] = new ProfilePoint(aa.x, aa.y, { before: 5, after: 5 });
    };

    canApplySmoothTransition = ({ handleId }) => {
        return handleId !== null && this.points[handleId].transition === null;
    };

    removeSmoothTransition = ({ handleId }) => {
        const aa = this.points[handleId];
        this.points[handleId] = new ProfilePoint(aa.x, aa.y, null);
    };

    canRemoveSmoothTransition = ({ handleId }) => {
        return handleId !== null && this.points[handleId].transition !== null;
    };

    moveSmoothTransitionHandle = ({ id, beforeOrAfter, newX, newY }) => {
        const thePoint = this.points[id];
        if (beforeOrAfter === 'before') {
            if (thePoint.x - thePoint.transition.before < 0) {
                if (newX > this.period - 5)
                    newX = this.period - 5;

                const minX = this.getTransitionPoints(this.points.length - 1).p3.x;
                if (newX < minX + 5)
                    newX = minX + 5;
                this.points[id].transition.before = thePoint.x + (this.period - newX);
            } else {
                if (this.points[id - 1].hasTransition()) {
                    const { p1, p3 } = this.getTransitionPoints(id - 1);
                    if (newX <= p3.x + 5)
                        newX = p3.x + 5;
                } else {
                    if (newX <= 5)
                        newX = 5
                }
                let before = thePoint.x - newX;
                if (before < 5)
                    before = 5;
                this.points[id].transition.before = before;
            }
        }
        else if (beforeOrAfter === 'after') {
            if (id === this.points.length - 1) {
                const maxX = this.getTransitionPoints(0).p1.x < 0
                    ? this.getTransitionPoints(0).p1.x + this.period
                    : this.period;

                if (newX > maxX - 5)
                    newX = maxX - 5;

                let after = newX - thePoint.x;
                if (after < 5)
                    after = 5;
                this.points[id].transition.after = after;
            } else {
                if (this.points[id + 1].hasTransition()) {
                    const { p1, p3 } = this.getTransitionPoints(id + 1);
                    if (newX > p1.x - 5)
                        newX = p1.x - 5;

                } else {
                    if (newX > this.points[id + 1].x - 5)
                        newX = this.points[id + 1].x - 5
                }
                let after = newX - thePoint.x;
                if (after < 5)
                    after = 5;
                this.points[id].transition.after = after;
            }
        }
    };

    canMoveSmoothTransitionHandle = ({ id, beforeOrAfter, newX, newY }) => {
        return true;
    };

    getTransitionPoints = (i) => {
        if (this.points[i].hasTransition() && i > 0 && i < this.points.length - 1) {
            const previousPoint = this.points[i - 1];
            const thisPoint = this.points[i];
            const nextPoint = this.points[i + 1];
            const xBefore = thisPoint.x - thisPoint.transition.before;
            const yBefore = interpolate(previousPoint, thisPoint, xBefore);
            const xAfter = thisPoint.x + thisPoint.transition.after;
            const yAfter = interpolate(thisPoint, nextPoint, xAfter);
            return { p1: { x: xBefore, y: yBefore }, p3: { x: xAfter, y: yAfter } };
        }
        if (this.points[i].hasTransition() && i === 0) {
            const lastPoint = this.points[this.points.length - 1];
            const previousPoint = { x: lastPoint.x - this.period, y: lastPoint.y };
            const thisPoint = this.points[i];
            const nextPoint = this.points[i + 1];
            const xBefore = thisPoint.x - thisPoint.transition.before;
            const yBefore = interpolate(previousPoint, thisPoint, xBefore);
            const xAfter = thisPoint.x + thisPoint.transition.after;
            const yAfter = interpolate(thisPoint, nextPoint, xAfter);
            return { p1: { x: xBefore, y: yBefore }, p3: { x: xAfter, y: yAfter } };
        }
        if (this.points[i].hasTransition() && i === this.points.length - 1) {
            const firstPoint = this.points[0];
            const previousPoint = this.points[i - 1];
            const thisPoint = this.points[i];
            const nextPoint = { x: this.period + firstPoint.x, y: firstPoint.y };
            const xBefore = thisPoint.x - thisPoint.transition.before;
            const yBefore = interpolate(previousPoint, thisPoint, xBefore);
            const xAfter = thisPoint.x + thisPoint.transition.after;
            const yAfter = interpolate(thisPoint, nextPoint, xAfter);
            return { p1: { x: xBefore, y: yBefore }, p3: { x: xAfter, y: yAfter } };
        }
        return null;
    };

    moveStartCommand = ({ newX }) => {
        this.start = newX;
    }

    canMoveStartCommand = ({ newX }) => {
        return newX >= 0 && newX < 360;
    }
}
