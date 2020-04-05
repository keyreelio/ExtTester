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
    public url: string = "https://twitter.com/explore";
    public login: string = "hdayfg6wq5sq@gmail.com";
    public password: string = "5lKZfBc@L^PG";
}


class Parser {
    public async parse(driver: WebDriver): Promise<boolean> {

        let url = await driver.getCurrentUrl();

        //if (url.includes("twitter")) {
            return await this.parseForTwitter(driver);
        //}

        return Promise.resolve(false);
    }

    protected async parseForTwitter(driver: WebDriver): Promise<boolean> {

        let singinQuery = "ebss = document.querySelectorAll(\"a[href='/login']\"); if (ebss.length > 0) { ebss[0].setAttribute('axt-button-type', 'singin'); }";
        await driver.executeScript(singinQuery);

        let usernameQuery = "eils = document.querySelectorAll(\"input[name='session[username_or_email]']\"); if (eils.length > 0) { eils[0].setAttribute('axt-input-type', 'login'); }";
        await driver.executeScript(usernameQuery);

        let passwordQuery = "eips = document.querySelectorAll(\"input[name='session[password]']\"); if (eips.length > 0) { eips[0].setAttribute('axt-input-type', 'password'); }";
        await driver.executeScript(passwordQuery);

        let loginQuery = "ebls = document.querySelectorAll(\"div[data-testid='LoginForm_Login_Button']\"); if (ebls.length > 0) { ebls[0].setAttribute('axt-button-type', 'login'); }";
        await driver.executeScript(loginQuery);

        return Promise.resolve(true);
    }
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

        if (!await this.open(this.credential.url)) return Promise.resolve(false);
        if (!await this.parse()) return Promise.resolve(false);

        if (await this.hasSigninButton()) {
            if (!await this.clickSignInButton()) return Promise.resolve(false);
        }

        return true;
    }

    public async checkReadCredential(): Promise<boolean> {



        return true;
    }

    protected async open(url: string): Promise<boolean> {

        try {
            let driver = this.driver;

            await this.driver.executeScript("window.open()");
            let tabs = await this.driver.getAllWindowHandles();
            await this.driver.switchTo().window(tabs[tabs.length - 1]);
            await this.driver.get(url);

            let result = await this.driver.wait(function() {
                return driver.executeScript('return document.readyState').then(readyState => readyState === 'complete');
            }, 5000);
        } catch (UnhandledPromiseRejectionWarning) {
            return false;
        }

        return true;
    }

    protected async parse(): Promise<boolean> {
        let parser = new Parser();

        return await parser.parse(this.driver);
    }

    protected async hasSigninButton(): Promise<boolean> {
        return true;
    }

    protected async clickSignInButton(): Promise<boolean> {
        return true;
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

    // for (let credential of credentials) {
    //     let api = new Test(driver, engine, credential);
    //
    //     console.log(`testing...  '${credential.url}'`);
    //     if (await api.checkWriteCredential()) {
    //         console.log("  did write credential");
    //         if (await api.checkReadCredential()) {
    //             console.log("  did read credential");
    //         } else {
    //             console.log("  did fail read credential");
    //         }
    //     } else {
    //         console.log("  did fail write credential");
    //     }
    // }

    // run twitter test
    //  write credential
    await driver.executeScript("window.open()");
    let tabs = await driver.getAllWindowHandles();
    await driver.switchTo().window(tabs[tabs.length - 1]);
    await driver.get('https://twitter.com/login');
    await driver.wait(until.elementLocated(By.name("session[username_or_email]")), 1000).sendKeys("hdayfg6wq5sq@gmail.com");
    await driver.findElement(By.name("session[password]")).sendKeys("5lKZfBc@L^PG");

    //await engine.prevSave();

    await driver.findElement(By.xpath("//div[@data-testid='LoginForm_Login_Button']")).click();

    //await engine.postSave();

    //await engine.hasSaved();

    // read credential
    await driver.manage().deleteAllCookies();

    await driver.executeScript("window.open()");
    let tabs2 = await driver.getAllWindowHandles();
    await driver.switchTo().window(tabs2[tabs2.length - 1]);
    await driver.get('https://twitter.com/login');

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

    await Promise.all([testExecute(new LastPassEngine())]);

    console.log('...stop');
};


test();