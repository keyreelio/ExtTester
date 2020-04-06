import {Builder, By, Key, until, WebDriver, WebElement} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";


async function sendKeys(driver: WebDriver, elm: WebElement, value: string) {
    for (var i = 0; i < value.length; i++) {
        await elm.sendKeys(value[i]);
        await driver.sleep(100);
    }
}

export class Engine {

    protected async createDriver(options: chrome.Options): Promise<WebDriver> {
        let driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        await driver.manage().window().maximize();

        return Promise.resolve(driver);
    }

    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();

        return this.createDriver(options);
    }

    public async processBeforeLogin(): Promise<boolean> {
        return false;
    }

    public async processAfterLogin(): Promise<boolean> {
        return false;
    }
}

export class KeyReelEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        options.addArguments("user-data-dir=./chrome_profiles/keyreel");
        let crx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        options.addExtensions(crx);

        let driver = await this.createDriver(options);

        await driver.sleep(1000);

        return Promise.resolve(driver);
    }
}

export class LastPassEngine extends Engine {

    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        options.addArguments("user-data-dir=./chrome_profiles/lastpass");
        let crx = fs.readFileSync('./resources/crxs/lastpass.crx', {encoding: "base64"});
        options.addExtensions(crx);
        let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        options.addExtensions(krcrx);

        let driver = await this.createDriver(options);

        await driver.sleep(1000);

        await driver.get('chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/extensionLogin.html');
        try {
            await driver.wait(until.urlContains("/extensionLogin.html"), 1000);
            await driver.wait(until.elementLocated(By.id("loginDialogEmail")), 1000);

            await driver.findElement(By.id("loginDialogEmail")).sendKeys("hdayfg6wq5sq@gmail.com");
            await driver.findElement(By.id("loginDialogPassword")).sendKeys("QL=25LXd%NT2ca5");
            await driver.findElement(By.id("logInButton")).click();
        } catch (UnhandledPromiseRejectionWarning) {
        }

        //TODO: wait logged state

        await driver.sleep(1000);

        return Promise.resolve(driver);
    }
}

export class DashlaneEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        options.addArguments("user-data-dir=./chrome_profiles/dashlane");
        let crx = fs.readFileSync('./resources/crxs/dashlane.crx', {encoding: "base64"});
        options.addExtensions(crx);
        let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        options.addExtensions(krcrx);

        let driver = await this.createDriver(options);

        await driver.sleep(1000);

        try {
            await driver.get('chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg/signup');
            await driver.wait(until.urlContains("/signup"), 2000);
            await driver.wait(until.elementLocated(By.xpath("//a[@href='/login']")), 2000).click();
        } catch (UnhandledPromiseRejectionWarning) {
        }

        try {
            await driver.wait(until.urlContains("/login"), 2000);
            await driver.wait(until.elementLocated(By.xpath("//input[@type='email']")), 5000).sendKeys("hdayfg6wq5sq@gmail.com");
            await driver.findElement(By.xpath("//button[@type='button']")).click();
        } catch (UnhandledPromiseRejectionWarning) {
        }

        try {
            let pass = await driver.wait(until.elementLocated(By.xpath("//input[@type='password']")), 20000);
            await sendKeys(driver, pass, "dzM+T+y(Tn~J86{");
            //await pass.sendKeys("dzM+T+y(Tn~J86{");
            await pass.sendKeys(Key.RETURN);
            //await driver.findElement(By.xpath("//button[@type='button']")).click();//sendKeys(Key.RETURN);
        } catch (UnhandledPromiseRejectionWarning) {
        }

        //TODO: wait logged state

        await driver.sleep(2000);

        return Promise.resolve(driver);
    }
}

export class OnePasswordXEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        options.addArguments("user-data-dir=./chrome_profiles/onepassword");
        let crx = fs.readFileSync('./resources/crxs/1passwordx.crx', {encoding: "base64"});
        options.addExtensions(crx);
        let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        options.addExtensions(krcrx);

        let driver = await this.createDriver(options);

        await driver.sleep(1000);

        var welcome = false;
        try {
            await driver.get('chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/app/app.html#/page/welcome')
            await driver.wait(until.elementLocated(By.id("signInButton")), 2000).click();
            await driver.wait(until.urlContains("/signin"), 2000);

            await driver.wait(until.elementLocated(By.id("email")), 2000).sendKeys("hdayfg6wq5sq@gmail.com");
            await driver.findElement(By.id("account-key")).sendKeys("A3-4J9LQG-APXJD3-KYXNL-ARBGG-TLKV3-YVMYQ");
            await driver.findElement(By.id("master-password")).sendKeys("hrfW-Y1q3_4%");
            await driver.findElement(By.className("signin-actions")).findElement(By.xpath("button")).click();

            welcome = true;
        } catch (UnhandledPromiseRejectionWarning) {
        }

        if (!welcome) {
            try {
                await driver.get('chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/mini/mini.html');
                await driver.wait(until.elementLocated(By.id("masterPassword-input")), 2000).sendKeys("hrfW-Y1q3_4%", Key.RETURN);
            } catch (UnhandledPromiseRejectionWarning) {
            }
        }

        await driver.sleep(2000);

        return Promise.resolve(driver);
    }
}
