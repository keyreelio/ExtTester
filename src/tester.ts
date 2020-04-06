import {Engine, KeyReelEngine, LastPassEngine, OnePasswordXEngine, DashlaneEngine} from './engine'
import {Builder, By, Key, until, WebDriver} from 'selenium-webdriver';
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";


class Credential {
    public url: string = "";
    public login: string = "";
    public password: string = "";
}

class TwitterCredential extends Credential{
    public url: string = "https://twitter.com/login";
    public login: string = "hdayfg6wq5sq@gmail.com";
    public password: string = "5lKZfBc@L^PG";
}


class Test {

    driver: WebDriver;
    engine: Engine;
    credential: Credential;

    constructor(driver: WebDriver, engine: Engine, credential: Credential) {
        this.driver = driver;
        this.engine = engine;
        this.credential = credential;
    }

    public async checkWriteCredential(): Promise<boolean> {

        // try {
            await this.driver.manage().deleteAllCookies();
        // } catch (e) {
        // }

        await this.open(this.credential.url)
        if (!await this.hasOpened()) return Promise.resolve(false);

        var enterFiledCount = 0;
        while (true) {
            if (!await this.parse()) return Promise.resolve(false);
            if (await this.hasLoginForm()) {
                if (await this.hasLogin()) {
                    if (!await this.enterLogin(this.credential.login)) return Promise.resolve(false);
                    enterFiledCount += 1;
                }
                if (await this.hasPassword()) {
                    if (!await this.enterPassword(this.credential.password)) return Promise.resolve(false);
                    enterFiledCount += 1;
                }
                if (enterFiledCount == 2 && await this.hasLoginButton()) {
                } else {
                    return Promise.resolve(false);
                }
            }

            break;
        }

        await this.engine.processBeforeLogin();

        if (!await this.clickLoginButton()) return Promise.resolve(false);
        if (!await this.parse()) return Promise.resolve(false);

        if (await this.isLoggedIn()) {
            await this.engine.processAfterLogin();
        }

        return Promise.resolve(true);
    }

    public async checkReadCredential(): Promise<boolean> {
        return Promise.resolve(false);
    }

    protected async open(url: string): Promise<boolean> {
        console.log("  open");

        var tabs = await this.driver.getAllWindowHandles();
        if (tabs.length === 0) {
            await this.driver.executeScript("window.open();");
            tabs = await this.driver.getAllWindowHandles();
        }
        await this.driver.switchTo().window(tabs[tabs.length - 1]);

        await this.driver.get(url);

        return Promise.resolve(true);
    }

    protected async hasOpened() {
        console.log("  hasOpened");

        try {
            let driver = this.driver;
            let result = await this.driver.wait(function() {
                return driver.executeScript('return document.readyState').then(readyState => readyState === 'complete');
            }, 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            return Promise.resolve(false);
        }

        return Promise.resolve(true);
    }

    //axt-parser-timing
    protected async parse(): Promise<boolean> {
        console.log("  parse");
        try {
            let result = await this.driver.wait(until.elementLocated(By.xpath("//body[@axt-parser-timing]")), 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            return Promise.resolve(false);
        }

        return Promise.resolve(true);
    }

    //axt-form-type="login"
    protected async hasLoginForm(): Promise<boolean> {
        console.log("  hasLoginForm");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//*[@axt-form-type='login']")), 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  login form not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    //axt-input-type="login"
    protected async hasLogin(): Promise<boolean> {
        console.log("  hasLogin");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//input[@axt-input-type='login']")), 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  login input not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    protected async enterLogin(login: string): Promise<boolean> {
        console.log("  enterLogin");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//input[@axt-input-type='login']")), 5000).sendKeys(login);
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  login input not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    //axt-input-type="password"
    protected async hasPassword(): Promise<boolean> {
        console.log("  hasPassword");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//input[@axt-input-type='password']")), 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  password input not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    protected async enterPassword(password: string): Promise<boolean> {
        console.log("  enterPassword");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//input[@axt-input-type='password']")), 5000).sendKeys(password);
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  password input not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    //axt-button-type="login"
    protected async hasLoginButton(): Promise<boolean> {
        console.log("  hasLoginButton");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//*[@axt-button-type='login']")), 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  login button not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    protected async clickLoginButton(): Promise<boolean> {
        console.log("  clickLoginButton");
        try {
            await this.driver.wait(until.elementLocated(By.xpath("//*[@axt-button-type='login']")), 5000).click();
        } catch (UnhandledPromiseRejectionWarning) {
            console.log("  login button not found");
            return Promise.resolve(false);
        }
        return Promise.resolve(true);
    }

    protected async hasNextButton(): Promise<boolean> {
        console.log("  hasNextButton");
        return Promise.resolve(false);
    }

    protected async clickNextButton(): Promise<boolean> {
        console.log("  clickNextButton");
        return Promise.resolve(false);
    }

    protected async hasSigninButton(): Promise<boolean> {
        console.log("  hasSigninButton");
        return Promise.resolve(false);
    }

    protected async clickSignInButton(): Promise<boolean> {
        console.log("  clickSignInButton");
        return Promise.resolve(false);
    }

    protected async isLoggedIn(): Promise<boolean> {
        console.log("  isLoggedIn");
        return Promise.resolve(false);
    }
}

/*
hasLoginForm()
hasLogin()
enterLogin()
hasPassword()
enterPassword()
hasLoginButton()
clickLoginButton()
hasNextButton()
clickNextButton()
hasSigninButton()
clickSignInButton()
isLoggedIn()

 */

let credentials = [new TwitterCredential()];

async function testExecute(engine: Engine): Promise<void> {

    // create WebDriver with extension
    let driver = await engine.startup();

    for (let credential of credentials) {
        let api = new Test(driver, engine, credential);

        console.log(`testing...  '${credential.url}'`);
        if (await api.checkWriteCredential()) {
            console.log("  did write credential");
            if (await api.checkReadCredential()) {
                console.log("  did read credential");
            } else {
                console.log("  did fail read credential");
            }
        } else {
            console.log("  did fail write credential");
        }
    }

    // // run twitter test
    // //  write credential
    // await driver.executeScript("window.open()");
    // let tabs = await driver.getAllWindowHandles();
    // await driver.switchTo().window(tabs[tabs.length - 1]);
    // await driver.get('https://twitter.com/login');
    // await driver.wait(until.elementLocated(By.name("session[username_or_email]")), 1000).sendKeys("hdayfg6wq5sq@gmail.com");
    // await driver.findElement(By.name("session[password]")).sendKeys("5lKZfBc@L^PG");
    //
    // //await engine.prevSave();
    //
    // await driver.findElement(By.xpath("//div[@data-testid='LoginForm_Login_Button']")).click();
    //
    // //await engine.postSave();
    //
    // //await engine.hasSaved();
    //
    // // read credential
    // await driver.manage().deleteAllCookies();
    //
    // await driver.executeScript("window.open()");
    // let tabs2 = await driver.getAllWindowHandles();
    // await driver.switchTo().window(tabs2[tabs2.length - 1]);
    // await driver.get('https://twitter.com/login');

    //await engine.load();

    //await engine.hasInserted();

    //driver.close();
}

async function test() : Promise<void> {

    console.log('...start');

    // await Promise.all([
    //     testExecute(new KeyReelEngine()),
    //     testExecute(new LastPassEngine()),
    //     testExecute(new DashlaneEngine()),
    //     testExecute(new OnePasswordXEngine())]);

    await Promise.all([testExecute(new DashlaneEngine())]);

    console.log('...stop');
};

console.log(process.argv);

test();

