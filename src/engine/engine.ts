import {Builder, error, WebDriver} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";
import UnsupportedOperationError = error.UnsupportedOperationError;
import {engineLogger as L} from "../common/log.config";
import {WebDriverExt} from "../common/WebDriverExt";


export interface IEngine {
    getEngineName(): Promise<string>;
    getOptions(): Promise<chrome.Options>;
    getDriver(): Promise<WebDriver>;
    getExtDriver(): Promise<WebDriverExt>;
    startup(): Promise<void>;
    shutdown(): Promise<void>;
    processBeforeLogin(): Promise<void>;
    processAfterLogin(): Promise<void>;
    dropAllCredentials(): Promise<void>;
}

export class Engine implements IEngine {

    static WaitInitExtension = 2000;


    protected options: chrome.Options | undefined;
    protected driver: WebDriver | undefined;
    protected extDriver: WebDriverExt | undefined;


    public async getEngineName(): Promise<string> {
        return Promise.resolve("default");
    }

    public async getOptions(): Promise<chrome.Options> {
        if (this.options !== undefined) {
            return Promise.resolve(this.options);
        }
        return Promise.reject();
    }

    public async getDriver(): Promise<WebDriver> {
        if (this.driver !== undefined) {
            return Promise.resolve(this.driver);
        }
        return Promise.reject();
    }

    public async getExtDriver(): Promise<WebDriverExt> {
        if (this.extDriver !== undefined) {
            return Promise.resolve(this.extDriver);
        }
        return Promise.reject();
    }

    public async startup(): Promise<void> {
        L.debug("startup");

        let profileName = await this.profileName();

        this.options = new chrome.Options();

        L.debug(`use profile: user-data-dir=./chrome_profiles/${profileName}`);
        this.options.addArguments(`user-data-dir=./chrome_profiles/${profileName}`);

        L.debug(`setup options`);
        await this.setupOptions();

        L.debug("build WebDriver");
        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(this.options)
            .build();
        this.extDriver = new WebDriverExt(this.driver);

        L.debug("maximize window");
        await this.driver.manage().window().maximize();

        L.debug("sleep for init extension");
        await this.driver.sleep(Engine.WaitInitExtension);

        await this.startupDriver();

        return Promise.resolve();
    }

    public async shutdown(): Promise<void> {
        //this.driver?.close();
        await this.shutdownDriver();
    }

    public async processBeforeLogin(): Promise<void> {
        L.debug("unsupported processBeforeLogin");
        return Promise.reject(new UnsupportedOperationError("processBeforeLogin"));
    }

    public async processAfterLogin(): Promise<void> {
        L.debug("unsupported processAfterLogin");
        return Promise.reject(new UnsupportedOperationError("processAfterLogin"));
    }

    public async dropAllCredentials(): Promise<void> {
        L.debug("unsupported dropAllCredentials");
        return Promise.reject(new UnsupportedOperationError("dropAllCredentials"));
    }


    protected async profileName(): Promise<string> {
        return Promise.resolve("default");
    }

    protected async setupOptions(): Promise<void> {
        return Promise.resolve();
    }

    protected async startupDriver(): Promise<void> {
        return Promise.resolve();
    }

    protected async shutdownDriver(): Promise<void> {
        return Promise.resolve();
    }
}
