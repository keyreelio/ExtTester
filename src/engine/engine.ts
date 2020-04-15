import {Builder, By, error, Key, until, WebDriver, WebElement} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";
import UnsupportedOperationError = error.UnsupportedOperationError;
import {engineLogger as L} from "../common/log.config";
import {WebDriverExt} from "../common/WebDriverExt";


async function sendKeys(driver: WebDriver, elm: WebElement, value: string) {
    for (var i = 0; i < value.length; i++) {
        await elm.sendKeys(value[i]);
        await driver.sleep(100);
    }
}

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

    protected options: chrome.Options | undefined;
    protected driver: WebDriver | undefined;
    protected extDriver: WebDriverExt | undefined;


    public async getEngineName(): Promise<string> {
        return Promise.resolve("unknown");
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
        L.info("startup");

        let profileName = await this.profileName();

        this.options = new chrome.Options();

        L.debug(`use profile: user-data-dir=./chrome_profiles/${profileName}`);
        this.options.addArguments(`user-data-dir=./chrome_profiles/${profileName}`);

        L.debug("add 'keyreel' extension");
        let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        this.options.addExtensions(krcrx);

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
        await this.driver.sleep(2000);

        await this.startupDriver();

        return Promise.resolve();
    }

    public async shutdown(): Promise<void> {
        //this.driver?.close();
    }

    public async processBeforeLogin(): Promise<void> {
        L.info("unsupported processBeforeLogin");
        return Promise.reject(new UnsupportedOperationError("processBeforeLogin"));
    }

    public async processAfterLogin(): Promise<void> {
        L.info("unsupported processAfterLogin");
        return Promise.reject(new UnsupportedOperationError("processAfterLogin"));
    }

    public async dropAllCredentials(): Promise<void> {
        L.info("unsupported dropAllCredentials");
        return Promise.reject(new UnsupportedOperationError("dropAllCredentials"));
    }


    protected async profileName(): Promise<string> {
        L.info("unsupported setupOptions");
        return Promise.reject(new UnsupportedOperationError("profileName"));
    }

    protected async setupOptions(): Promise<void> {
        L.info("unsupported setupOptions");
        return Promise.reject(new UnsupportedOperationError("setupOptions"));
    }

    protected async startupDriver(): Promise<void> {
        L.info("unsupported startupDriver");
        return Promise.reject(new UnsupportedOperationError("startupDriver"));
    }
}
