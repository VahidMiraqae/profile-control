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
        // end of making commands
        this.period = 360;
        this.points = [
            new ProfilePoint(0, 0, { before: 10, after: 20 }),
            new ProfilePoint(45, 1, { before: 10, after: 10 }),
            new ProfilePoint(90, 0, { before: 10, after: 10 }),
            new ProfilePoint(135, 1, { before: 10, after: 10 }),
            new ProfilePoint(180, 0, { before: 10, after: 10 }),
            new ProfilePoint(225, 1, { before: 10, after: 10 }),
            new ProfilePoint(270, 1, { before: 10, after: 10 }),
            new ProfilePoint(320, 0, { before: 10, after: 20 })
        ];
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
            const min = this.points[id - 1].x + 10;
            const xx = id === this.points.length - 1 ? this.period : this.points[id + 1].x;
            const max = xx - 10;
            x = newX < min ? min : (newX > max ? max : newX);
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
        this.points[handleId].transition = { before: 5, after: 5 };
        console.log(this.points);
    };

    canApplySmoothTransition = ({ handleId }) => {
        return handleId !== null && this.points[handleId].transition === null;
    };

    removeSmoothTransition = ({ handleId }) => {
    };

    canRemoveSmoothTransition = ({ handleId }) => {
        return handleId !== null && this.points[handleId].transition !== null;
    };

    moveSmoothTransitionHandle = ({ id, beforeOrAfter, newX, newY }) => {
        const thePoint = this.points[id];
        if (beforeOrAfter === 'before') {
            this.points[id].transition.before = thePoint.x - newX;
        }
        else if (beforeOrAfter === 'after') {
            this.points[id].transition.after = newX - thePoint.x;
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
            const nextPoint = { x: this.period + firstPoint.x , y: firstPoint.y };
            const xBefore = thisPoint.x - thisPoint.transition.before;
            const yBefore = interpolate(previousPoint, thisPoint, xBefore);
            const xAfter = thisPoint.x + thisPoint.transition.after;
            const yAfter = interpolate(thisPoint, nextPoint, xAfter);
            return { p1: { x: xBefore, y: yBefore }, p3: { x: xAfter, y: yAfter } };
        }
        return null;
    };
}
