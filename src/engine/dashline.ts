import {Engine} from './engine'
import {dashlaneEngineLogger as L} from "../common/log.config";

import {WebElementExt} from "../common/webElementExt";
import {By, Key, until, WebElement} from "selenium-webdriver";
import fs from "fs";
import {Timeouts} from "../common/timeouts";


interface IDashlaneAccount {
    login: string;
    password: string;
}

export class DashlaneEngine extends Engine {

    // engines
    static WaitLocatedEngineUI = 10000;
    static WaitLocatedEngineControl = 5000;


    startupUrl = "chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg/signup";
    currentAccountIndex = 1;
    accounts = [
        {
            login: "hdayfg6wq5sq@gmail.com",
            password: "dzM+T+y(Tn~J86{"
        },
        {
            login: "t3mxdwk2zrhz@gmail.com",
            password: "qCywf6K5CWczGSt"
        }
    ];

    public constructor(
        options:
            { withoutProfile: boolean } |
            undefined = undefined) {

        super(options);
    }

    public async getEngineName(): Promise<string> {
        return this.profileName();
    }

    public async processAfterLogin(): Promise<void> {
        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        try {
            await extDriver.switchToRootFrame();

            L.trace("find iframe[@id='kw-iframe-popup']");
            let iframe = await extDriver.waitLocated("//iframe[@id='kw-iframe-popup']", DashlaneEngine.WaitLocatedEngineUI);
            L.trace(`switch to '${await iframe.getId()}'`);
            await driver.switchTo().frame(iframe);

            L.trace("press Enter in input");
            let input = await extDriver.waitLocatedExt("//input[@type='text']", DashlaneEngine.WaitLocatedEngineControl);
            await input.pressEnter();

            return Promise.resolve();
        } catch (e) {
            L.trace(`filed process after login with ${e}`);
            return Promise.reject(e);
        }
    }

    public async dropAllCredentials(): Promise<void> {

        let driver = await this.getDriver();

        await this.openCredentials();
        while (true) {
            try {
                await this.dropTopCredential();
                await driver.sleep(500);
            } catch (e) {
                break;
            }
        }

        return Promise.resolve();
    }


    //REGION: Engine override protected methods

    protected async profileName(): Promise<string> {
        return Promise.resolve("dashlane");
    }

    protected async setupOptions(): Promise<void> {

        let options = await this.getOptions();

        L.debug("add 'keyreel' extension");
        let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        options.addExtensions(krcrx);

        L.debug("add 'dashlane' extension")
        let crx = fs.readFileSync('./resources/crxs/dashlane.crx', {encoding: "base64"});
        options.addExtensions(crx);
    }

    protected async startupDriver(): Promise<void> {
        L.debug("startupDriver");

        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        await extDriver.openUrlOnCurrentTab(this.startupUrl);
        try {
            L.debug("check opened page 'login' or 'signup'");
            await Promise.race([
                driver.wait(until.urlContains("/login"), Timeouts.WaitOpenedUrl),
                driver.wait(until.urlContains("/signup"), Timeouts.WaitOpenedUrl),
            ]);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("already logged in");
            // logged in
            return Promise.resolve();
        }

        if ((await driver.getCurrentUrl()).includes("/signup")) {
            L.debug("it's 'signup' page");

            L.trace("find 'login' link and click()");
            let singin = await extDriver.waitLocatedExt("//a[@href='/login']", DashlaneEngine.WaitLocatedEngineControl);
            await singin.click();

            L.trace("wait open 'login' page");
            await driver.wait(until.urlContains("/login"), Timeouts.WaitOpenedUrl);
        }

        if ((await driver.getCurrentUrl()).includes("/login")) {
            L.debug("it's 'login' page");
            L.debug("check login form parts");
            await Promise.all([
                extDriver.waitLocated("//input[@type='email']", Timeouts.WaitLocatedElement)
                    .then(async elm => {
                        L.debug("login form has 'login' input");

                        L.trace("enter login to 'login' input");
                        let login = new WebElementExt(elm);
                        await login.sendKeys(this.currentAccount().login);

                        L.trace("find 'login' button and click()");
                        let loginButton = await extDriver.waitLocatedExt("//button[@type='button']", Timeouts.WaitLocatedAnimationElement);
                        await loginButton.click();

                        L.trace("wait located 'password' input and enter password");
                        let password = await extDriver.waitLocatedExt("//input[@type='password']", Timeouts.WaitLocatedAnimationElement);
                        await password.sendKeys(this.currentAccount().password);
                        await password.pressEnter();

                        return Promise.resolve();
                    })
                    .catch(error => {
                        L.debug("login form has not 'login' input");
                        return Promise.resolve();
                    }),
                extDriver.waitLocated("//div[@class='Select-control']", Timeouts.WaitLocatedElement)
                    .then(async elm => {
                        L.debug("login form has 'account' selector");

                        L.trace("find 'login' button and click()");
                        let loginButton = await extDriver.waitLocatedExt("//button[@type='button']", Timeouts.WaitLocatedAnimationElement);
                        await loginButton.click();

                        L.trace("wait located 'password' input and enter password");
                        let password = await extDriver.waitLocatedExt("//input[@type='password']", Timeouts.WaitLocatedAnimationElement);
                        await password.sendKeys(this.currentAccount().password);
                        await password.pressEnter();

                        return Promise.resolve();
                    })
                    .catch(error => {
                        L.debug("login form has not 'account' selector");
                        return Promise.resolve();
                    }),
                extDriver.waitLocated("//input[@type='password']", Timeouts.WaitLocatedElement)
                    .then(async elm => {
                        L.debug("login form has 'password' input");

                        let password = new WebElementExt(elm);
                        L.trace("enter password to 'password' input and press 'Enter'");
                        await password.sendKeys(this.currentAccount().password);
                        await password.pressEnter();

                        return Promise.resolve();
                    })
                    .catch(error => {
                        L.debug("login form has not 'password' input");
                        return Promise.resolve();
                    }),
            ]);

            L.debug("wait open 'credentials' page");
            await driver.wait(until.urlContains("/credentials"), Timeouts.WaitOpenedUrl);
            L.debug("opened 'credentials' page");
        }

        return Promise.resolve();
    }

    //REGION: protected methods

    protected currentAccount() : IDashlaneAccount {
        let index = Math.max(0, Math.min(this.currentAccountIndex, this.accounts.length - 1));
        return this.accounts[index];
    }

    protected async dropTopCredential(): Promise<void> {
        let items = await this.findCredentialList();
        return await this.dropCredential(items[0]);
    }

    protected async dropCredential(item: WebElement): Promise<void> {
        let extDriver = await this.getExtDriver();

        let linkA = new WebElementExt(await item.findElement(By.xpath("//a[contains(@class,'cellsWrapper')]")));
        await linkA.click();

        let form = await extDriver.waitLocated("//form", DashlaneEngine.WaitLocatedEngineUI);
        let deleteButton = new WebElementExt(await form.findElement(By.xpath("//button[contains(@class,'deleteButton')]")));
        await deleteButton.click();

        let confirmButton = await extDriver.waitLocated("//button[contains(@class,'danger')]", DashlaneEngine.WaitLocatedEngineControl);
        await confirmButton.click();

        return Promise.resolve();
    }

    protected async openCredentials(): Promise<void> {
        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        let tabs = await driver.getAllWindowHandles();

        let find = false;
        for (let tab of tabs) {
            await driver.switchTo().window(tab);
            if ((await driver.getCurrentUrl()).includes("fdjamakpfbbddfjaooikfcpapjohcfmg/credentials")) {
                find = true;
                break;
            }
        }
        if (!find) {
            await extDriver.openUrlOnNewTab("chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg/credentials");
        }

        await extDriver.switchToRootFrame();
        await driver.sleep(Timeouts.AfterOpenUrl);
    }

    protected async findCredentialList(): Promise<WebElement[]> {
        let extDriver = await this.getExtDriver();

        let contentDiv = await extDriver.waitLocated("//div[contains(@class,'contentWrapper')]", DashlaneEngine.WaitLocatedEngineUI);
        let listUl = await contentDiv.findElement(By.xpath("//ul[contains(@class,'wrapper')]"));
        let items = await listUl.findElements(By.xpath("//li[contains(@class,'row')]"));

        return Promise.resolve(items);
    }
}

