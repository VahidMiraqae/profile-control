import { ContextMenu } from "./ContextMenu.js"
import { ObjectManager } from "./ObjectManager.js";

export class BaseView {
    constructor(root, settings) {
        this.root = root;
        this.settings = settings;
        this.makeCanvas();
        this.contextMenu = new ContextMenu(this.root, this.canv);
        this.contextMenu.closed = () => this.draw();
        this.canv.addEventListener('contextmenu', (e) => this.contextMenu.show(e, this.getContextMenuContext()));

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
