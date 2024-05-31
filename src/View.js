import { BaseView } from "./BaseView";

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
                return ff === undefined ? { x: null, y: null } : this.modelToCanvasXY(ff);
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

    isMouseOverMarker = ({ x, y, mouseX, mouseY }) => {
        return (Math.abs(mouseX - x) < this.settings.markerSize / 2) && (Math.abs(mouseY - y) < this.settings.markerSize / 2);
    };

    drawLines = (ctx, { mouseX, mouseY }) => {
        const points = this.vm.getPoints();
        const firstPoint = this.modelToCanvasXY(points[0]);
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        if (points[0].hasTransition()) {
            // skipping for now if the first point has transition
        }
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < points.length; i++) {
            const canvasPoint = this.modelToCanvasXY(points[i]);
            if (points[i].hasTransition()) {
                const { p1, p3 } = this.vm.getTransitionPoints(i);
                const cp1 = this.modelToCanvasXY(p1);
                ctx.lineTo(cp1.x, cp1.y);
                const cp3 = this.modelToCanvasXY(p3);
                ctx.bezierCurveTo(cp1.x, cp1.y, canvasPoint.x, canvasPoint.y, cp3.x, cp3.y);
            }
            else {
                ctx.lineTo(canvasPoint.x, canvasPoint.y);
            }
        }
        const point = this.modelToCanvasXY({ x: points[0].x + this.vm.period, y: points[0].y });
        ctx.lineTo(point.x, point.y);
        ctx.stroke();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'black';
    };

    drawMarkers = (ctx, { mouseX, mouseY }) => {
        const points = this.vm.getPoints();
        let conditionMet = false;
        for (let i = 0; i < points.length; i++) {
            if (points[i].hasTransition()) {
                const { p1, p3 } = this.vm.getTransitionPoints(i);
                ({ conditionMet } = this.newMethod(p1, mouseX, mouseY, i, conditionMet, ctx, 'controlHandleBefore'));
                ({ conditionMet } = this.newMethod(p3, mouseX, mouseY, i, conditionMet, ctx, 'controlHandleAfter'));
            }
            ({ conditionMet } = this.newMethod(points[i], mouseX, mouseY, i, conditionMet, ctx, 'handle'));
        }

        this.canv.style.cursor = conditionMet ? 'pointer' : 'default';
    };

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
