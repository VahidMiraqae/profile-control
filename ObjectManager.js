export class ObjectManager {
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
