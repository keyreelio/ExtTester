

export class DispatchableEvent {
    public type: string;
    public path: string;

    constructor(type: string, path: string){
        this.type = type;
        this.path = path;
    }
}

export interface IEventDispatcher {
    addEventListener(type: string, path: string, callback: any): void;
    removeEventListener(type:string, path: string, callback: any): void;
}

export class EventDispatcher implements IEventDispatcher {

    protected listeners: Map<string, Map<string, any[]>> = new Map<string, Map<string, any[]>>();


    public constructor() {}

    public addEventListener(type: string, path: string, callback: any): void {
        let paths = this.listeners.get(type);
        if (paths === undefined) {
            paths = new Map<string, any[]>();
            this.listeners.set(type, paths);
        }

        let callbacks = paths.get(path);
        if (callbacks === undefined) {
            callbacks = [];
            paths.set(path, callbacks);
        }

        callbacks.push(callback);
    }

    public removeEventListener(type:string, path: string, callback:any): void {
        let paths = this.listeners.get(type);
        if (paths === undefined) {
            return;
        }

        let callbacks = paths.get(path);
        if (callbacks === undefined) {
            return;
        }

        for (let i = 0, l = callbacks.length; i < l; i++) {
            if (callbacks[i] === callback){
                callbacks.splice(i, 1);
                return;
            }
        }
    }

    protected dispatchEvent(event: DispatchableEvent): void {
        let paths = this.listeners.get(event.type);
        if (paths === undefined) {
            return;
        }

        let callbacks = paths.get(event.path);
        if (callbacks === undefined) {
            if (event.path !== "*") {
                event.path = "*";
                return this.dispatchEvent(event);
            }
            return;
        }

        for (let i = 0, l = callbacks.length; i < l; i++) {
            callbacks[i].call(this, event);
        }
    }
}
