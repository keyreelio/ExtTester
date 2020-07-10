import 'chromedriver';
import {Builder, By, error, WebDriver} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import UnsupportedOperationError = error.UnsupportedOperationError;
import {engineLogger as L, extLogFolder} from "../common/log.config";
import {WebDriverExt} from "../common/webDriverExt";
import {ICredential} from "../credentials/credentials";
import fs from "fs";
import {EReportTest, ReportExport} from "../report/report";


export interface IEngine {
    getDomainLogPath(): string;

    getEngineName(): Promise<string>;

    getOptions(): Promise<chrome.Options>;

    getDriver(): Promise<WebDriver>;

    getExtDriver(): Promise<WebDriverExt>;

    startup(maximize: Boolean): Promise<void>;

    shutdown(): Promise<void>;

    start(credential: ICredential, forRead: boolean): Promise<void>;

    processLoginFinishing(): Promise<void>;

    processAfterPressLoginButton(cancel: boolean): Promise<boolean>;

    checkSaved(url: string, credential: ICredential): Promise<void>;

    finish(): Promise<void>;

    dropAllCredentials(): Promise<void>;

    writeScreenshot(test: EReportTest, remark: string): Promise<void>;
}

export interface IEngineFactory {
    start(): Promise<void>;

    createEngine(): Promise<IEngine>;

    finish(): Promise<void>;
}

export class Engine implements IEngine {

    static WaitInitExtension = 2000;

    protected options: chrome.Options | undefined;
    protected driver: WebDriver | undefined;
    protected extDriver: WebDriverExt | undefined;
    protected domainLogPath: string = "";
    protected withoutProfile = false;


    public constructor(
        options:
            { withoutProfile: boolean } |
            undefined = undefined) {

        if (options !== undefined) {
            if (options as { withoutProfile: boolean }) {
                this.withoutProfile = (<{ withoutProfile: boolean }>options).withoutProfile;
            }
        }
    }

    public getDomainLogPath(): string {
        return this.domainLogPath;
    }

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

    public async startup(maximize: Boolean = true): Promise<void> {
        L.debug("startup");

        const screen = {
            width: 1280,
            height: 1024
        }
        this.options = new chrome.Options().windowSize(screen);

        if (!this.withoutProfile) {
            let profileName = await this.profileName();
            L.debug(`use profile: user-data-dir=./chrome_profiles/${profileName}`);
            this.options.addArguments(`user-data-dir=./chrome_profiles/${profileName}`);
        }

        L.debug(`setup options`);
        await this.setupOptions();

        L.debug("build WebDriver");
        this.driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(this.options)
            .build();
        this.extDriver = new WebDriverExt(this.driver);

        if (maximize) {
            L.debug("maximize window");
            await this.driver.manage().window().maximize();
        }
        L.debug("sleep for init extension");
        await this.driver.sleep(Engine.WaitInitExtension);

        await this.startupDriver();

        return Promise.resolve();
    }

    public async shutdown(): Promise<void> {
        L.debug("shutdown");

        await this.shutdownDriver();
    }

    public async start(credential: ICredential, forRead: boolean): Promise<void> {
        return Promise.resolve();
    }

    public async processLoginFinishing(): Promise<void> {
        L.debug("unsupported processLoginFinishing");
        return Promise.reject(new UnsupportedOperationError("processLoginFinishing"));
    }

    public async processAfterPressLoginButton(cancel: boolean): Promise<boolean> {
        L.debug("unsupported processAfterPressLoginButton");
        return Promise.reject(new UnsupportedOperationError("processAfterPressLoginButton"));
    }

    public async checkSaved(url: string, credential: ICredential): Promise<void> {
        L.debug("unsupported checkSaved");
        return Promise.reject(new UnsupportedOperationError("checkSaved"));
    }

    public async finish(): Promise<void> {
        return Promise.resolve();
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

    public async writeScreenshot(test: EReportTest, remark: string): Promise<void> {
        let driver = await this.getDriver();
        let testName = ReportExport.testName(test).trim();

        await driver.executeScript(`
           document.documentElement.style.display = "table";
           document.documentElement.style.width = "100%";
           document.body.style.display = "table-row";
        `);

        return await driver
            .findElement(By.css('body'))
            .takeScreenshot()
            .then((data: string) => {
                let name = `${testName}-${Date.now()}-${remark || "ss"}.png`;
                fs.writeFileSync(
                    this.getDomainLogPath() + name,
                    data,
                    'base64'
                );
            }).catch( (reason) => {
               L.error("write screenshot error", reason);
            });
    }
}
