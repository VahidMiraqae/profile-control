export class ContextMenu {
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
