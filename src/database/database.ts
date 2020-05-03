import {IEventDispatcher, DispatchableEvent} from "./events/eventDispatcher";


export class Account {
    public path: string | undefined = undefined;
    public username: string | undefined = undefined;
    public password: string | undefined = undefined;
}

export interface IDatabase extends IEventDispatcher {

    isExist(path: string): boolean;
    add(account: Account): void;
    get(path: string): Account | undefined;
    delete(path: string): void;
    clear(): void;
}

export class DatabaseEventType {
    public static add = "ADD";
    public static get = "GET";
    public static delete = "DELETE";
    public static clear = "CLEAR";
}

export class DatabaseEvent extends DispatchableEvent {
    public account: Account | undefined;

    public constructor(type: string, path: string, account: Account | undefined) {
        super(type, path);
        this.account = account;
    }
}
