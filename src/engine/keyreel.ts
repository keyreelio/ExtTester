import {Engine} from './engine'
import {keyreelEngineLogger as L} from "../common/log.config";
import {ThriftServer} from "../service/thriftServer";
import {DatabaseMemory} from "../service/database";


export class KeyReelEngine extends Engine {

    protected mockServer = new ThriftServer(new DatabaseMemory());

    public async getEngineName(): Promise<string> {
        return this.profileName();
    }

    public async dropAllCredentials(): Promise<void> {
        // TODO: clear DB
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
