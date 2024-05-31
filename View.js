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
            () => this.vm.getPoints().map(a => this.modelXYToCanvasXY(a)),
            this.isMouseOverMarker,
            this.vm.moveHandleCommand,
            this.xxx);
        this.bindMouseDragMarker('controlHandleBefore',
            () => this.vm.getPoints().map((a, b) => {
                const ff = this.vm.getTransitionPoints(b)?.p1;
                return ff === undefined ? { x: null, y: null } : this.modelXYToCanvasXY(ff);
            }),
            this.isMouseOverMarker,
            this.vm.moveSmoothTransitionHandleCommand,
            this.xxx1
        );
        this.bindMouseDragMarker('controlHandleAfter',
            () => this.vm.getPoints().map((a, b) => {
                const ff = this.vm.getTransitionPoints(b)?.p3;
                return ff === undefined ? { x: null, y: null } : this.modelXYToCanvasXY(ff);
            }),
            this.isMouseOverMarker,
            this.vm.moveSmoothTransitionHandleCommand,
            this.xxx2
        );
        this.registerDrawer(this.drawAxes);
        this.registerDrawer(this.drawLines);
        this.registerDrawer(this.drawMarkers);
    }

    contextToXYConverter = (context) => {
        return this.canvasXYToModelXY({ x: context.lastMousePosition.offsetX, y: context.lastMousePosition.offsetY });
    };

    contextToHandleIdConverter = (context) => {
        return { handleId: context.objectManager.currentObjectId['handle'] };
    };

    xxx = (id) => {
        const result = this.canvasXYToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
        return { id, newX: result.x, newY: result.y };
    };

    xxx1 = (id) => {
        const result = this.canvasXYToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
        return { id, beforeOrAfter: 'before', newX: result.x, newY: result.y };
    };

    xxx2 = (id) => {
        const result = this.canvasXYToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY });
        return { id, beforeOrAfter: 'after', newX: result.x, newY: result.y };
    };

    canvasXYToModelXY = ({ x, y }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();
        const position = {
            x: this.vm.period * ((x - origin.x) / plotSize.width),
            y: (origin.y - y) / plotSize.height
        };
        return position;
    };

    modelXYToCanvasXY = ({ x, y }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();
        const position = {
            x: (x * plotSize.width / this.vm.period) + origin.x,
            y: origin.y - y * plotSize.height
        };
        return position;
    };

    isMouseOverMarker = ({ x, y, mouseX, mouseY }) => {
        return (Math.abs(mouseX - x) < this.settings.markerSize / 2) && (Math.abs(mouseY - y) < this.settings.markerSize / 2);
    };

    drawLines = (ctx, { mouseX, mouseY }) => {
        const points = this.vm.getPoints();
        const firstPoint = this.modelXYToCanvasXY(points[0]);
        ctx.beginPath();
        ctx.strokeStyle = 'red';
        ctx.lineWidth = 2;
        if (points[0].hasTransition()) {
            // skipping for now if the first point has transition
        }
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < points.length; i++) {
            const canvasPoint = this.modelXYToCanvasXY(points[i]);
            if (points[i].hasTransition()) {
                const { p1, p3 } = this.vm.getTransitionPoints(i);
                const cp1 = this.modelXYToCanvasXY(p1);
                ctx.lineTo(cp1.x, cp1.y);
                const cp3 = this.modelXYToCanvasXY(p3);
                ctx.bezierCurveTo(cp1.x, cp1.y, canvasPoint.x, canvasPoint.y, cp3.x, cp3.y);
            }
            else {
                ctx.lineTo(canvasPoint.x, canvasPoint.y);
            }
        }
        const point = this.modelXYToCanvasXY({ x: points[0].x + this.vm.period, y: points[0].y });
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


                let point = this.modelXYToCanvasXY(p1);
                let hover = this.isMouseOverMarker({ x: point.x, y: point.y, mouseX, mouseY })
                    || (this.draggingObject !== null && this.draggingObject.id === i);
                conditionMet = conditionMet || hover;
                if (hover) {
                    ctx.fillStyle = 'purple';
                } else {
                    ctx.fillStyle = 'black';
                }
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.settings.markerSize / 2, 0, 2 * Math.PI);
                ctx.fill();

                point = this.modelXYToCanvasXY(p3);
                hover = this.isMouseOverMarker({ x: point.x, y: point.y, mouseX, mouseY })
                    || (this.draggingObject !== null && this.draggingObject.id === i);
                conditionMet = conditionMet || hover;
                if (hover) {
                    ctx.fillStyle = 'purple';
                } else {
                    ctx.fillStyle = 'black';
                }
                ctx.beginPath();
                ctx.arc(point.x, point.y, this.settings.markerSize / 2, 0, 2 * Math.PI);
                ctx.fill();

            }
            const point = this.modelXYToCanvasXY(points[i]);
            const hover = this.isMouseOverMarker({ x: point.x, y: point.y, mouseX, mouseY })
                || (this.draggingObject !== null && this.draggingObject.id === i);
            conditionMet = conditionMet || hover;
            if (hover) {
                ctx.fillStyle = 'purple';
            } else {
                ctx.fillStyle = 'black';
            }
            ctx.beginPath();
            ctx.arc(point.x, point.y, this.settings.markerSize / 2, 0, 2 * Math.PI);
            ctx.fill();
        }

        if (conditionMet) {
            this.canv.style.cursor = 'pointer';
        } else {
            this.canv.style.cursor = 'default';
        }

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

}
