import {Engine, IEngine} from './engine'
import {dashlaneEngineLogger as L} from "../common/log.config";

import {WebDriverExt, WebElementExt} from "../common/WebDriverExt";
import {By, Key, until, WebDriver} from "selenium-webdriver";
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
            let iframe = await driver.wait(until.elementLocated(By.id("kw-iframe-popup")), 2000);
            await driver.switchTo().frame(iframe);
            await driver.wait(until.elementLocated(By.className("save")), 500).click();
            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }

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

    protected currentAccount() : IDashlineAccount {
        let index = Math.max(0, Math.min(this.currentAccountIndex, this.accounts.length - 1));
        return this.accounts[index];
    }
}

