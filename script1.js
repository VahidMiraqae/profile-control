(function () {
    'use strict';

    class Settings {
        constructor() {
            this.markerSize = 7.5;
            this.minHeight = 100;
            this.paddingX = 30;
            this.paddingY = 30;
        }

    }

    class ContextMenu {
        constructor(container, targetElement) {
            this.container = container;
            this.targetElement = targetElement;
            this.menuItems = [];
            this.domElement = document.createElement('div');
            this.domElement.classList = 'Context-Menu';
            this.domElement.hidden = true;
            container.appendChild(this.domElement);
            this.context = null;
            this.closed = () => { };
        }

        show = (e, context) => {
            e.preventDefault();
            this.context = context;
            this.menuItems.forEach(item => {
                item.el.disabled = !item.command.canExecute(item.dataProvider(this.context));
            });
            this.domElement.style.left = `${e.offsetX + this.targetElement.offsetLeft}px`;
            this.domElement.style.top = `${e.offsetY + this.targetElement.offsetTop}px`;
            this.domElement.hidden = false;
        };

        hide = (e) => { this.domElement.hidden = true; };

        callCommand = (handle, dataProvider) => {
            handle(dataProvider(this.context));
            this.hide();
            this.closed();
        };

        bindMenuItem = (label, command, dataProvider) => {
            const addBtn = document.createElement('input');
            addBtn.type = 'button';
            addBtn.value = label;
            addBtn.addEventListener('click', e => this.callCommand(command.handle, dataProvider));
            this.domElement.appendChild(addBtn);
            this.menuItems.push({ el: addBtn, command, dataProvider });
        };
    }

    class ObjectManager {
        constructor() {
            this.objects = {};
            this.currentObjectId = {};
            this.mouseOverAssessers = {};
        }

        register = (name, objectGetter, mouseOverAssesser) => {
            this.objects[name] = objectGetter;
            this.mouseOverAssessers[name] = mouseOverAssesser;
        };

        Update = (e) => {
            const keys = Object.keys(this.objects);
            for (const key of keys) {
                var objs = this.objects[key]();
                var assesser = this.mouseOverAssessers[key];
                for (let id = 0; id < objs.length; id++) {
                    const obj = objs[id];
                    if (assesser({ x: obj.x, y: obj.y, mouseX: e.offsetX, mouseY: e.offsetY })) {
                        this.currentObjectId[key] = id;
                        break;
                    }
                    this.currentObjectId[key] = null;
                }
            }
        };
    }

    class BaseView {
        constructor(root, settings) {
            this.root = root;
            this.settings = settings;
            this.makeCanvas();
            this.contextMenu = new ContextMenu(this.root, this.canv);
            this.contextMenu.closed = () => this.draw();
            this.canv.addEventListener('contextmenu',
                (e) => this.contextMenu.show(e, this.getContextMenuContext()));

            this.setupSizeObserver();
            this.setupEventListeners();

            this.objectManager = new ObjectManager();
            this.dragCommands = {};
            this.draggingObject = null;
            this.drawers = [];
            this.mouseMoveEvent = { offsetX: 0, offsetY: 0 };
        }

        mouseMoveEvent;
        canvasSize;
        objectManager;

        makeCanvas = () => {
            this.canv = document.createElement('canvas');
            this.canv.width = this.settings.canvasWidth;
            this.canv.height = this.settings.canvasHeight;
            this.ctx = this.canv.getContext('2d');
            this.root.appendChild(this.canv);
        }

        setupSizeObserver = () => {
            this.sizeObserver = new ResizeObserver(a => {
                this.canvasSize = a[0].contentRect;
                this.canv.width = this.canvasSize.width;
                this.canv.height = this.canvasSize.height;
                if (this.canvasSize.height < this.settings.minHeight) {
                    this.root.style.height = `${this.settings.minHeight}px`;
                }
                this.draw();
            });
            this.sizeObserver.observe(this.root);
        }

        getContextMenuContext = () => {
            return {
                lastMousePosition: this.mouseMoveEvent,
                objectManager: this.objectManager
            }
        }

        setupEventListeners = () => {
            this.canv.addEventListener('mousedown', this.contextMenu.hide);
            this.canv.addEventListener('mousemove', this.mouseMoveHandler);
            this.canv.addEventListener('mousedown', this.mouseDownHandler);
            this.canv.addEventListener('mouseup', this.mouseUpHandler);
        }

        mouseMoveHandler = (e) => {
            this.mouseMoveEvent = e;
            this.objectManager.Update(e);
            if (this.draggingObject !== null) {
                const { command, dataProvider } = this.dragCommands[this.draggingObject.name];
                command.handle(dataProvider(this.draggingObject.id));
            }
            this.draw();
        }

        mouseDownHandler = (e) => {
            const keys = Object.keys(this.dragCommands);
            for (const key of keys) {
                const objectId = this.objectManager.currentObjectId[key];
                if (objectId !== null) {
                    this.draggingObject = { id: objectId, name: key };
                    break;
                }
            }
            this.draw();
        }

        mouseUpHandler = () => {
            if (this.draggingObject !== null) {
                this.draggingObject = null;
            }
        }

        getOrigin = () => {
            return { x: this.settings.paddingX, y: this.canvasSize.height - this.settings.paddingY };
        }

        getPlotSize = () => {
            return {
                width: this.canvasSize.width - 2 * this.settings.paddingX,
                height: this.canvasSize.height - 2 * this.settings.paddingY
            }
        }

        bindMouseDragMarker = (name, objectGetter, mouseOverAssesser, command, dataProvider) => {
            this.objectManager.register(name, objectGetter, mouseOverAssesser);
            this.registerDrag(name, { command, dataProvider });
        }

        registerDrag = (name, command) => {
            this.dragCommands[name] = command;
        }

        registerDrawer = (drawer) => {
            this.drawers.push(drawer);
        }

        draw = () => {
            this.ctx.clearRect(0, 0, this.canvasSize.width, this.canvasSize.height);
            for (const drawer of this.drawers) {
                drawer(this.ctx, { mouseX: this.mouseMoveEvent.offsetX, mouseY: this.mouseMoveEvent.offsetY });
            }
        }

    }

    class View extends BaseView {
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
            if (points[0].hasTransition()) ;
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

    class Command {
        constructor(execute, canExecute) {
            this.execute = execute;
            this.canExecute = canExecute;
        }

        handle = (e) => {
            if (this.canExecute(e)) {
                this.execute(e);
            }
        };
    }

    class ProfilePoint {
        constructor(x, y, transition) {
            this.x = x;
            this.y = y;
            this.transition = transition;
        }

        hasTransition = () => this.transition !== null;
    }

    function interpolate(p1, p2, x) {
        return (x - p1.x) * (p2.y - p1.y) / (p2.x - p1.x) + p1.y;
    }

    class ViewModel {
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
                new ProfilePoint(0, 0, null),
                new ProfilePoint(45, 1, { before: 10, after: 10 }),
                new ProfilePoint(90, 0, { before: 10, after: 10 }),
                new ProfilePoint(135, 1, { before: 10, after: 10 }),
                new ProfilePoint(180, 0, { before: 10, after: 10 }),
                new ProfilePoint(225, 1, { before: 10, after: 10 }),
                new ProfilePoint(340, 0, null)
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
            if (this.points[i].hasTransition()) {
                const previousPoint = this.points[i - 1];
                const thisPoint = this.points[i];
                const nextPoint = this.points[i + 1];
                const xBefore = thisPoint.x - thisPoint.transition.before;
                const yBefore = interpolate(previousPoint, thisPoint, xBefore);
                const xAfter = thisPoint.x + thisPoint.transition.after;
                const yAfter = interpolate(thisPoint, nextPoint, xAfter);
                return { p1: { x: xBefore, y: yBefore }, p3: { x: xAfter, y: yAfter } };
            }
            return null;
        };
    }

    const root1 = document.getElementById('root1');
    root1.style.position = 'relative';
    const settings = new Settings();
    const vm = new ViewModel();
    new View(root1, settings, vm);

})();
