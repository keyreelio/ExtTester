import fs from "fs";
import {Account} from "./database";
import {DatabaseMemory} from "./databaseMemory";


export class DatabaseFile extends DatabaseMemory {

    protected filePath: string;


    public constructor(filePath: string) {
        super();
        this.filePath = filePath;
        this.load();
    }

    public deleteFile() {
        fs.unlinkSync(this.filePath);
    }

    public add(account: Account): void {
        super.add(account);
        this.save();
    }

    public delete(path: string): void {
        super.delete(path);
        this.save();
    }

    public clear(): void {
        super.clear();
        this.save();
    }

    protected load(): void {
        try {
            let obj = JSON.parse(fs.readFileSync(this.filePath, {encoding: 'utf8'}));
            this.db = new Map<string, Account>(Object.entries(obj));
        } catch (e) {
        }
    }

    protected save(): void {
        fs.writeFileSync(this.filePath, JSON.stringify(Object.fromEntries(this.db)), {encoding: 'utf8'});
    }
}