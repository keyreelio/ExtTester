import {Engine} from './engine'
import {keyreelEngineLogger as L} from "../common/log.config";
import {Server} from "../service/server";
// import {DatabaseEvent, DatabaseEventType, IDatabase} from "../database/database";
import {ICredential} from "../credentials/credentials";
import {error} from "selenium-webdriver";
import {Timeouts} from "../common/timeouts";
import {DBAccount} from "../service/dbaccount";
import {Mutex} from "../common/mutex";


export class KeyReelEngine extends Engine {

    protected mockServer: Server;
    protected currentCredential: ICredential | undefined = undefined;
    protected savedAccount: boolean = false;
    protected savedError: Error | undefined = undefined;
    protected onSavedEvent: ((error: Error | undefined) => Promise<void>) | undefined = undefined;
    protected mutex = new Mutex();


    public constructor(
        mockServer: Server,
        options:
            { withoutProfile: boolean } |
            undefined = undefined) {

        super(options);
        this.mockServer = mockServer;
    }

    public async getEngineName(): Promise<string> {
        return this.profileName();
    }

    public async start(credential: ICredential, forRead: boolean): Promise<void> {
        this.currentCredential = credential;

        if (forRead) {
            this.mockServer.onGetAccount = (path => {
                if (this.currentCredential === undefined) return undefined;
                let account = new DBAccount();
                account.username = this.currentCredential.login;
                account.password = this.currentCredential.password;
                return account;
            });
        } else {
            this.mockServer.onAddAccount = (async (path, account) => {
                await this.save(account);
            });
        }
    }

    public async checkSaved(url: string, credential: ICredential): Promise<void> {
        let waitTimeout = new Promise(function(resolve, reject) {
            setTimeout(function () {
                reject(new Error('Fail saved: timeout'));
            }, Timeouts.WaitToAutosaveAccount);
        });

        await Promise.race([
            waitTimeout,
            new Promise((resolve, reject) => {
                this.canSave((error: Error | undefined) => {
                    if (error === undefined) {
                        resolve();
                    } else {
                        reject(error);
                    }
                    return Promise.resolve();
                }).then(() => {
                }).catch(e => {
                });
            })
        ]);
    }

    public async finish(): Promise<void> {
        this.mockServer.onGetAccount = undefined;
        this.mockServer.onAddAccount = undefined;
        this.currentCredential = undefined;
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
    
    protected async save(account: DBAccount): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (this.currentCredential === undefined) return;
            this.savedAccount = true;
            if (account.username !== this.currentCredential.login) {
                this.savedError = new Error(`Fail saved: login not equal - stored '${account.username}'  real '${this.currentCredential.login}'`);
            } else if (account.password !== this.currentCredential.password) {
                this.savedError = new Error(`Fail saved: login not equal - stored '${account.password}'  real '${this.currentCredential.password}'`);
            }
            if (this.onSavedEvent !== undefined) return await this.onSavedEvent(this.savedError);
        });
    }

    protected async canSave(callback: (error: Error | undefined) => Promise<void>): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (this.savedAccount) return await callback(this.savedError);
            this.onSavedEvent = callback;
        });
    }
}
