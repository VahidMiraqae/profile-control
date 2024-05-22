
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
        this.closed = () => { }
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
    }

    hide = (e) => { this.domElement.hidden = true; }

    callCommand = (handle, dataProvider) => {
        handle(dataProvider(this.context));
        this.hide();
        this.closed();
    }

    bindMenuItem = (label, command, dataProvider) => {
        const addBtn = document.createElement('input');
        addBtn.type = 'button';
        addBtn.value = label;
        addBtn.addEventListener('click', e => this.callCommand(command.handle, dataProvider))
        this.domElement.appendChild(addBtn);
        this.menuItems.push({ el: addBtn, command, dataProvider });
    }
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
    }
}

class Settings {
    constructor() {
        this.markerSize = 10;
        this.minHeight = 100;
        this.paddingX = 30;
        this.paddingY = 30;
    }

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
    }

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
    }
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
        this.mouseMoveEvent = { offsetX: 0, offsetY: 0 }
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
            this.canv.width = this.canvasSize.width
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
            const objectId = this.objectManager.currentObjectId[key]
            if (objectId !== null) {
                this.draggingObject = { id: objectId, name: key }
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

class Vm {
    constructor() {
        this.addHandleCommand = new Command(this.addHandle, this.canAddHandle);
        this.removeHandleCommand = new Command(this.removeHandle, this.canRemoveHandle);
        this.moveHandleCommand = new Command(this.moveHandle, this.canMoveHandle);
        this.applySmoothTransitionCommand = new Command(this.applySmoothTransition, this.canApplySmoothTransition);
        this.period = 360;
        this.points = [{ x: 0, y: 0 }, { x: 180, y: 1 }, { x: 360, y: 0 }]
    }

    getPoints = () => this.points;

    addHandle = ({ x, y }) => {
        for (let id = 0; id < this.points.length - 1; id++) {
            const point = this.points[id];
            if (x > point.x && x < this.points[id + 1].x) {
                y = y > .5 ? 1 : 0;
                this.points.splice(id + 1, 0, { x, y });
                break;
            }
        }
    }

    canAddHandle = ({ x, y }) => {
        return true;
    }

    removeHandle = ({ handleId }) => {
        this.points.splice(handleId, 1);
    }

    canRemoveHandle = ({ handleId }) => {
        return handleId !== null
            && handleId !== 0
            && handleId !== this.points.length - 1;
    }

    moveHandle = ({ id, newX, newY }) => {
        const current = this.points[id];
        const y = newY > .5 ? 1 : 0;
        let x = newX;
        if (id > 0 && id < this.points.length - 1) { // all points except first and last
            const min = this.points[id-1].x + 10;
            const max = this.points[id+1].x - 10;
            x = newX < min ? min : (newX > max ? max : newX);
        }
        this.points[id] = { ...current, x: x, y: y };
    }

    canMoveHandle = ({ id, newX, newY }) => {
        return newX >= 0 && newX <= 360;
    }

    applySmoothTransition = () => {

    }

}

class View extends BaseView {
    constructor(root, settings, vm) {
        super(root, settings);
        this.vm = vm;

        this.contextMenu.bindMenuItem('Add', this.vm.addHandleCommand, this.contextToXYConverter);
        this.contextMenu.bindMenuItem('Remove', this.vm.removeHandleCommand, this.contextToHandleIdConverter);
        this.bindMouseDragMarker('handle',
            () => this.vm.getPoints().map(a => this.modelXYToCanvasXY(a)),
            this.isMouseOverMarker,
            this.vm.moveHandleCommand,
            this.xxx);
        this.registerDrawer(this.drawAxes)
        this.registerDrawer(this.drawLines);
        this.registerDrawer(this.drawMarkers);
    }

    contextToXYConverter = (context) => {
        return this.canvasXYToModelXY({ x: context.lastMousePosition.offsetX, y: context.lastMousePosition.offsetY });
    }

    contextToHandleIdConverter = (context) => {
        return { handleId: context.objectManager.currentObjectId['handle'] };
    }

    xxx = (id) => {
        const result = this.canvasXYToModelXY({ x: this.mouseMoveEvent.offsetX, y: this.mouseMoveEvent.offsetY })
        return { id, newX: result.x, newY: result.y };
    }

    canvasXYToModelXY = ({ x, y }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();
        const position = {
            x: vm.period * ((x - origin.x) / plotSize.width),
            y: (origin.y - y) / plotSize.height
        };
        return position;
    }

    modelXYToCanvasXY = ({ x, y }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();
        const position = {
            x: (x * plotSize.width / vm.period) + origin.x,
            y: origin.y - y * plotSize.height
        };
        return position;
    }

    isMouseOverMarker = ({ x, y, mouseX, mouseY }) => {
        return (Math.abs(mouseX - x) < this.settings.markerSize / 2) && (Math.abs(mouseY - y) < this.settings.markerSize / 2);
    }

    drawLines = (ctx, { mouseX, mouseY }) => {
        const points = this.vm.getPoints();
        const firstPoint = this.modelXYToCanvasXY(points[0]);
        ctx.beginPath();
        ctx.lineWidth = 2;
        ctx.moveTo(firstPoint.x, firstPoint.y);
        for (let i = 1; i < points.length; i++) {
            const point = this.modelXYToCanvasXY(points[i]);
            ctx.lineTo(point.x, point.y)
        }
        ctx.stroke();
        ctx.lineWidth = 1;
    }

    drawMarkers = (ctx, { mouseX, mouseY }) => {
        const points = this.vm.getPoints();
        let conditionMet = false;
        for (let i = 0; i < points.length; i++) {
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

    }

    drawAxes = (ctx, { mouseX, mouseY }) => {
        const origin = this.getOrigin();
        const plotSize = this.getPlotSize();


        let lines = [
            { dashedLine: true, }
        ]


        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y)
        ctx.lineTo(plotSize.width + origin.x, origin.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(origin.x, origin.y)
        ctx.lineTo(origin.x, origin.y - plotSize.height);
        ctx.stroke();

        ctx.beginPath();
        ctx.setLineDash([5, 3])
        ctx.moveTo(origin.x, origin.y - plotSize.height)
        ctx.lineTo(plotSize.width + origin.x, origin.y - plotSize.height);
        ctx.stroke();
        ctx.setLineDash([])

        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.font = "12px Segoe UI";
        ctx.strokeText('0', origin.x, origin.y + 1.3 * this.settings.markerSize);

        ctx.beginPath();
        ctx.textAlign = 'center';
        ctx.strokeText('360', plotSize.width + origin.x, origin.y + 1.3 * this.settings.markerSize);

    }

}

// starts here 

const root1 = document.getElementById('root1');
root1.style.position = 'relative';
const settings = new Settings();
const vm = new Vm();
const v = new View(root1, settings, vm);

