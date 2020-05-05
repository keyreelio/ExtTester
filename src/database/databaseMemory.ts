import {IDatabase, Account, DatabaseEvent, DatabaseEventType} from "./database";
import {EventDispatcher} from "./events/eventDispatcher";


export class DatabaseMemory extends EventDispatcher implements IDatabase {

    protected db: Map<string, Account> = new Map<string, Account>();


    public isExist(path: string): boolean {
        return this.db.get(path) !== undefined;
    }

    public add(account: Account): void {
        if (account.path !== undefined) {
            this.db.set(account.path, account);
            this.dispatchEvent(new DatabaseEvent(DatabaseEventType.add, account.path, account));
        }
    }

    public get(path: string): Account | undefined {
        let account = this.db.get(path);
        if (account !== undefined) {
            this.dispatchEvent(new DatabaseEvent(DatabaseEventType.get, path, account));
        }
        return account;
    }

    public delete(path: string): void {
        let account = this.db.get(path);
        this.db.delete(path);
        if (account !== undefined) {
            this.dispatchEvent(new DatabaseEvent(DatabaseEventType.delete, path, account));
        }
    }

    public clear(): void {
        this.db.clear();
        this.dispatchEvent(new DatabaseEvent(DatabaseEventType.clear, "", undefined));
    }
}
