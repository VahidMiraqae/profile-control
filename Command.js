export class Command {
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
