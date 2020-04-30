import {Account, IDatabase} from "./database";


export class DatabaseMemory implements IDatabase {

    protected db: Map<string, Account> = new Map<string, Account>();


    public add(account: Account): void {
        if (account.path !== undefined) {
            this.db.set(account.path, account);
        }
    }

    public get(path: string): Account | undefined {
        return this.db.get(path);
    }

    public isExist(path: string): boolean {
        return this.db.get(path) !== undefined;
    }

    public delete(path: string): void {
        this.db.delete(path);
    }

    public clear(): void {
        this.db.clear();
    }
}
