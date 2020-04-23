
export class Account {
    public path: string | undefined = undefined;
    public username: string | undefined = undefined;
    public password: string | undefined = undefined;
}

export interface IDatabase {

    add(account: Account): void;
    get(path: string): Account | undefined;
    isExist(path: string): boolean;
    delete(path: string): void;
    clear(): void;
}
