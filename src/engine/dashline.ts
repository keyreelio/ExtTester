import {Engine, IEngine} from './engine'
import {dashlaneEngineLogger as L} from "../common/log.config";

import {WebDriverExt, WebElementExt} from "../common/WebDriverExt";
import {By, Key, until, WebDriver, WebElement} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";


interface IDashlineAccount {
    login: string;
    password: string;
}

export class DashlaneEngine extends Engine {
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

    public async getEngineName(): Promise<string> {
        return this.profileName();
    }

    public async processAfterLogin(): Promise<void> {
        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        try {
            await extDriver.swithToRootFrame();
            L.trace("find iframe[@id='kw-iframe-popup']");
            let iframe = await driver.wait(until.elementLocated(By.xpath("//iframe[@id='kw-iframe-popup']")), 10000);
            L.trace(`switch to '${await iframe.getId()}'`);
            await driver.switchTo().frame(iframe);
            L.trace("send RETURN to input");
            await driver.wait(until.elementLocated(By.xpath("//input[@type='text']")), 5000).sendKeys(Key.RETURN);
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


    //REGION: Engine overided protected methods

    protected async profileName(): Promise<string> {
        return Promise.resolve("dashlane");
    }

    protected async setupOptions(): Promise<void> {

        let options = await this.getOptions();

        L.debug("add 'dashlane' extension")
        let crx = fs.readFileSync('./resources/crxs/dashlane.crx', {encoding: "base64"});
        options.addExtensions(crx);
    }

    protected async startupDriver(): Promise<void> {
        L.info("startupDriver");

        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        await extDriver.openUrlOnCurrentTab(this.startupUrl);
        try {
            L.debug("check opened page 'login' or 'signup'");
            await Promise.race([
                driver.wait(until.urlContains("/login"), 2000),
                driver.wait(until.urlContains("/signup"), 2000),
            ]);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("already logged in");
            // logged in
            return Promise.resolve();
        }

        if ((await driver.getCurrentUrl()).includes("/signup")) {
            L.debug("it's 'signup' page");
            L.trace("find 'login' link and click()");
            await driver.wait(until.elementLocated(By.xpath("//a[@href='/login']")), 2000).click();
            L.trace("wait open 'login' page");
            await driver.wait(until.urlContains("/login"), 2000);
            L.trace("opened 'login' page");
        }

        if ((await driver.getCurrentUrl()).includes("/login")) {
            L.debug("it's 'login' page");
            L.debug("check login form parts");
            await Promise.all([
                driver.wait(until.elementLocated(By.xpath("//input[@type='email']")), 200)
                    .then(async elm => {
                        L.debug("login form has 'login' input");
                        let loginElm = new WebElementExt(elm);
                        L.trace("enter login to 'login' input");
                        await loginElm.sendKeys(this.currentAccount().login);
                        L.trace("find 'login' button and click()");
                        await driver.findElement(By.xpath("//button[@type='button']")).click();
                        L.trace("wait located 'password' input");
                        let passwordElm = new WebElementExt(await driver.wait(until.elementLocated(By.xpath("//input[@type='password']")), 360000));
                        L.trace("located 'password' input");
                        L.trace("enter password to 'password' input and press 'Enter'");
                        await passwordElm.sendKeys(this.currentAccount().password, Key.RETURN);
                        return Promise.resolve();
                    })
                    .catch(error => {
                        L.debug("login form has not 'login' input");
                        return Promise.resolve();
                    }),
                driver.wait(until.elementLocated(By.xpath("//div[@class='Select-control']")), 200)
                    .then(async elm => {
                        L.debug("login form has 'account' selector");
                        L.trace("find 'login' button and click()");
                        await driver.findElement(By.xpath("//button[@type='button']")).click();
                        L.trace("wait located 'password' input");
                        let passwordElm = new WebElementExt(await driver.wait(until.elementLocated(By.xpath("//input[@type='password']")), 360000));
                        L.trace("located 'password' input");
                        L.trace("enter password to 'password' input and press 'Enter'");
                        await passwordElm.sendKeys(this.currentAccount().password, Key.RETURN);
                        return Promise.resolve();
                    })
                    .catch(error => {
                        L.debug("login form has not 'account' selector");
                        return Promise.resolve();
                    }),
                driver.wait(until.elementLocated(By.xpath("//input[@type='password']")), 200)
                    .then(async elm => {
                        L.debug("login form has 'password' input");
                        let passwordElm = new WebElementExt(elm);
                        L.trace("enter password to 'password' input and press 'Enter'");
                        await passwordElm.sendKeys(this.currentAccount().password, Key.RETURN);
                        return Promise.resolve();
                    })
                    .catch(error => {
                        L.debug("login form has not 'password' input");
                        return Promise.resolve();
                    }),
            ]);

            L.debug("wait open 'credentials' page");
            await driver.wait(until.urlContains("/credentials"), 5000);
            L.debug("opened 'credentials' page");
        }

        return Promise.resolve();
    }


    //REGION: protected methods

    protected currentAccount() : IDashlineAccount {
        let index = Math.max(0, Math.min(this.currentAccountIndex, this.accounts.length - 1));
        return this.accounts[index];
    }

    protected async dropTopCredential(): Promise<void> {
        let items = await this.findCredentialList();
        await this.dropCredential(items[0]);

        return Promise.resolve();
    }

    protected async dropCredential(item: WebElement): Promise<void> {
        let driver = await this.getDriver();

        let linkA = await item.findElement(By.xpath("//a[contains(@class,'cellsWrapper')]"));
        await driver.sleep(200);
        await linkA.click();

        let form = await driver.wait(until.elementLocated(By.xpath("//form")), 2000);
        let deleteButton = await form.findElement(By.xpath("//button[contains(@class,'deleteButton')]"));
        await driver.sleep(200);
        await deleteButton.click();

        let confirmButton = await driver.wait(until.elementLocated(By.xpath("//button[contains(@class,'danger')]")), 2000);
        await driver.sleep(200);
        await confirmButton.click();

        return Promise.resolve();

    }

    protected async openCredentials(): Promise<void> {
        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        var tabs = await driver.getAllWindowHandles();

        let finded = false;
        for (let tab of tabs) {
            await driver.switchTo().window(tab);
            if ((await driver.getCurrentUrl()).includes("fdjamakpfbbddfjaooikfcpapjohcfmg/credentials")) {
                finded = true;
                break;
            }
        }
        if (!finded) {
            await extDriver.openUrlOnNewTab("chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg/credentials");
        }

        await extDriver.swithToRootFrame();
        await driver.sleep(1000);
    }

    protected async findCredentialList(): Promise<WebElement[]> {
        let driver = await this.getDriver();

        let contentDiv = await driver.wait(until.elementLocated(By.xpath("//div[contains(@class,'contentWrapper')]")), 5000);
        let listUl = await contentDiv.findElement(By.xpath("//ul[contains(@class,'wrapper')]"));
        let items = await listUl.findElements(By.xpath("//li[contains(@class,'row')]"));

        return Promise.resolve(items);
    }
}

