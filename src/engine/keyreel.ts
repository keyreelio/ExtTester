import {Engine} from './engine'
import {keyreelEngineLogger as L} from "../common/log.config";
import {Server} from "../service/server";
import {DatabaseEvent, DatabaseEventType, IDatabase} from "../database/database";
import {ICredential} from "../credentials/credentials";
import {error} from "selenium-webdriver";


export class KeyReelEngine extends Engine {

    protected mockServer: Server;


    public constructor(
        database: IDatabase,
        options:
            { withoutProfile: boolean } |
            undefined = undefined) {

        super(options);
        this.mockServer = new Server(database);
    }

    public async getEngineName(): Promise<string> {
        return this.profileName();
    }

    public async checkSaved(url: string, credential: ICredential): Promise<void> {
        let database = this.mockServer.database;
        let waitAdd = new Promise(function(resolve, reject) {
            let u = new URL(url);
            database.addEventListener(
                DatabaseEventType.add,
                u.host,
                function (event: DatabaseEvent) {
                    if (event === undefined || event.account === undefined) {
                        return reject(new Error("Fail saved: unknown"));
                    }
                    if (event.account.username !== credential.login) {
                        return reject(new Error(`Fail saved: login not equal - stored '${event.account.username}'  real '${credential.login}'`));
                    }
                    if (event.account.password !== credential.password) {
                        return reject(new Error(`Fail saved: login not equal - stored '${event.account.password}'  real '${credential.password}'`));
                    }

                    return resolve();
                });
        });

        let waitTimeout = new Promise(function(resolve, reject) {
            setTimeout(function () {
                reject(new Error('Fail saved: timeout'));
            }, 15000);
        });

        await Promise.race([waitAdd, waitTimeout]);
    }

    public async canSaved(url: string): Promise<boolean> {
        let u = new URL(url);
        return Promise.resolve(this.mockServer.database.isExist(u.host));
    }

    public async dropAllCredentials(): Promise<void> {
        return Promise.resolve();
    }


    //REGION: Engine override protected methods

    protected async profileName(): Promise<string> {
        return Promise.resolve("keyreel");
    }

    protected async setupOptions(): Promise<void> {

        let options = await this.getOptions();

        L.debug("add 'keyreel' extension");
        options.addArguments("load-extension=./resources/raws/KeyReel");
    }

    protected async startupDriver(): Promise<void> {

        await this.mockServer.start();

        return Promise.resolve();
    }

    protected async shutdownDriver(): Promise<void> {

        await this.mockServer.stop();

        return Promise.resolve();
    }
}
