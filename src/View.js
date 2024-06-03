import { BaseView } from "./BaseView";
import { interpolateT } from "./interpolate";

export class View extends BaseView {
    constructor(root, settings, vm) {
        super(root, settings);
        this.vm = vm;

        this.contextMenu.bindMenuItem('Add', this.vm.addHandleCommand, this.contextToXYConverter);
        this.contextMenu.bindMenuItem('Remove', this.vm.removeHandleCommand, this.contextToHandleIdConverter);
        this.contextMenu.bindMenuItem('Apply Transition', this.vm.applySmoothTransitionCommand, this.contextToHandleIdConverter);
        this.contextMenu.bindMenuItem('Remove Transition', this.vm.removeSmoothTransitionCommand, this.contextToHandleIdConverter);
        this.bindMouseDragMarker('handle',
            () => this.vm.getPoints().map(a => this.modelToCanvasXY(a)),
            this.isMouseOverMarker,
            this.vm.moveHandleCommand,
            (id) => {
                const result = this.canvasToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
                return { id, newX: result.x, newY: result.y };
            }
        );
        this.bindMouseDragMarker('controlHandleBefore',
            () => this.vm.getPoints().map((a, b) => {
                const ff = this.vm.getTransitionPoints(b)?.p1;
                return ff === undefined ? { x: null, y: null } : this.modelToCanvasXY(this.correctX(ff));
            }),
            this.isMouseOverMarker,
            this.vm.moveSmoothTransitionHandleCommand,
            (id) => {
                const result = this.canvasToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
                return { id, beforeOrAfter: 'before', newX: result.x, newY: result.y };
            }
        );
        this.bindMouseDragMarker('controlHandleAfter',
            () => this.vm.getPoints().map((a, b) => {
                const ff = this.vm.getTransitionPoints(b)?.p3;
                return ff === undefined ? { x: null, y: null } : this.modelToCanvasXY(ff);
            }),
            this.isMouseOverMarker,
            this.vm.moveSmoothTransitionHandleCommand,
            (id) => {
                const result = this.canvasToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
                return { id, beforeOrAfter: 'after', newX: result.x, newY: result.y };
            }
        );
        this.bindMouseDragMarker('startHandle',
            () => [this.modelToCanvasXY({x: this.vm.start, y: -0.05})],
            this.isMouseOverMarker,
            this.vm.moveStartCommand,
            (id) => {
                const result = this.canvasToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
                return { newX: result.x };
            }
        );
        this.registerDrawer(this.drawAxes);
        this.registerDrawer(this.drawLines);
        this.registerDrawer(this.drawMarkers);
    }

    contextToXYConverter = (context) => {
        return this.canvasToModelXY({ x: context.lastMousePosition.offsetX, y: context.lastMousePosition.offsetY });
    };

    contextToHandleIdConverter = (context) => {
        return { handleId: context.objectManager.currentObjectId['handle'] };
    };

    canvasToModelXY = ({ x, y }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();
        return {
            x: this.vm.period * ((x - origin.x) / plotSize.width),
            y: (origin.y - y) / plotSize.height
        };
    };

    modelToCanvasXY = ({ x, y }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();
        return {
            x: (x * plotSize.width / this.vm.period) + origin.x,
            y: origin.y - y * plotSize.height
        };
    };

    translateX_ = ({ x, y }) => {
        let f = (x + this.settings.translation) % this.vm.period;
        f = f < 0 ? f + this.vm.period : f;
        return { x: f, y: y };
    } 

    isMouseOverMarker = ({ x, y, mouseX, mouseY }) => {
        return (Math.abs(mouseX - x) < this.settings.markerSize / 2) && (Math.abs(mouseY - y) < this.settings.markerSize / 2);
    };

    drawLines = (ctx, { mouseX, mouseY }) => {
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;

        const points = this.vm.getPoints();
        let point1 = {}, point15 = {}, pCut = {};
        if (points[0].hasTransition()) {
            const p2 = points[0];
            const { p1, p3 } = this.vm.getTransitionPoints(0);
            point1 = p1;
            if (point1.x < 0) {
                const B = point1.x - 2 * p2.x + p3.x;
                let t = 0.5;
                if (B !== 0) {
                    const A = Math.sqrt(point1.x * p2.x - p3.x * point1.x - p2.x * p2.x + p3.x * p2.x);
                    const t1 = (point1.x - p2.x + A) / B;
                    const t2 = (point1.x - p2.x - A) / B;
                    t = t1 < 0 || t1 > 1 ? t2 : t1;
                }
                point15 = interpolateT(point1, p2, t);
                const p25 = interpolateT(p2, p3, t);
                pCut = interpolateT(point15, p25, t);
                const cpCut = this.modelToCanvasXY(pCut);
                const cp25 = this.modelToCanvasXY(p25);
                const cp3 = this.modelToCanvasXY(p3);
                ctx.moveTo(cpCut.x, cpCut.y);
                ctx.bezierCurveTo(cpCut.x, cpCut.y, cp25.x, cp25.y, cp3.x, cp3.y);
            }
        }else {
            const p0 = this.modelToCanvasXY(points[0])
            ctx.moveTo(p0.x, p0.y);
        }
        for (let i = 1; i < points.length; i++) {
            const cPoint = this.modelToCanvasXY(points[i]);
            if (points[i].hasTransition()) {
                const { p1, p3 } = this.vm.getTransitionPoints(i);
                const cp1 = this.modelToCanvasXY(p1);
                ctx.lineTo(cp1.x, cp1.y);
                const cp3 = this.modelToCanvasXY(p3);
                ctx.bezierCurveTo(cp1.x, cp1.y, cPoint.x, cPoint.y, cp3.x, cp3.y);
            }
            else {
                ctx.lineTo(cPoint.x, cPoint.y);
            }
        }
        if (points[0].hasTransition()) {
            const cPoint15 = this.modelToCanvasXY({ x: this.vm.period + point15.x, y: point15.y });
            const cPoint1 = this.modelToCanvasXY({ x: this.vm.period + point1.x, y: point1.y });
            const cPCut = this.modelToCanvasXY({ x: this.vm.period + pCut.x, y: pCut.y });
            ctx.lineTo(cPoint1.x, cPoint1.y)
            ctx.bezierCurveTo(cPoint1.x, cPoint1.y, cPoint15.x, cPoint15.y, cPCut.x, cPCut.y);

        } else {
            const p0 = this.modelToCanvasXY({ x: this.vm.period + points[0].x, y: points[0].y })
            ctx.lineTo(p0.x, p0.y);
        }
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';

        const startBottom = this.modelToCanvasXY({x: this.vm.start, y: -0.05});
        const startTop = this.modelToCanvasXY({x: this.vm.start, y: 1});
        ctx.beginPath();
        ctx.moveTo(startBottom.x, startBottom.y);
        ctx.lineTo(startTop.x, startTop.y);
        ctx.stroke();


    };

    drawMarkers = (ctx, { mouseX, mouseY }) => {
        const points = this.vm.getPoints();
        let conditionMet = false;
        for (let i = 0; i < points.length; i++) {
            if (points[i].hasTransition()) {
                const { p1, p3 } = this.vm.getTransitionPoints(i);
                ({ conditionMet } = this.newMethod(this.correctX(p1), mouseX, mouseY, i, conditionMet, ctx, 'controlHandleBefore'));
                ({ conditionMet } = this.newMethod(this.correctX(p3), mouseX, mouseY, i, conditionMet, ctx, 'controlHandleAfter'));
            }
            ({ conditionMet } = this.newMethod(this.correctX(points[i]), mouseX, mouseY, i, conditionMet, ctx, 'handle'));
        }
        ({ conditionMet } = this.newMethod(this.correctX({x:this.vm.start,y:-0.05}), mouseX, mouseY, 0, conditionMet, ctx, 'startHandle'));
        this.canv.style.cursor = conditionMet ? 'pointer' : 'default';
    };

    correctX = ({ x, y }) => {
        let f = x % this.vm.period;
        f = f < 0 ? f + this.vm.period : f;
        return { x: f, y: y };
    }

    drawAxes = (ctx, { mouseX, mouseY }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();


        let lines = [
            { dashedLine: true, }
        ];


        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(plotSize.width + origin.x, origin.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y);
        ctx.lineTo(origin.x, origin.y - plotSize.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([5, 3]);
        ctx.moveTo(origin.x, origin.y - plotSize.height);
        ctx.lineTo(plotSize.width + origin.x, origin.y - plotSize.height);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.font = "12px Segoe UI";
        ctx.strokeText('0', origin.x, origin.y + 1.3 * this.settings.markerSize);

        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.strokeText('360', plotSize.width + origin.x, origin.y + 1.3 * this.settings.markerSize);

    };


    newMethod(p1, mouseX, mouseY, i, conditionMet, ctx, draggingObjectName) {
        let point = this.modelToCanvasXY(p1);
        let hover = this.isMouseOverMarker({ x: point.x, y: point.y, mouseX, mouseY })
            || (this.draggingObject !== null && this.draggingObject.id === i && this.draggingObject.name === draggingObjectName);
        conditionMet = conditionMet || hover;
        if (hover) {
            ctx.fillStyle = 'purple';
        } else {
            ctx.fillStyle = 'black';
        }
        ctx.beginPath();
        ctx.arc(point.x, point.y, this.settings.markerSize / 2, 0, 2 * Math.PI);
        ctx.fill();
        return { conditionMet };
    }
}
