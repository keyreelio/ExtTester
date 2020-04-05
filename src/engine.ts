import {Builder, By, until, WebDriver} from "selenium-webdriver";
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";


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

    public async trySave(): Promise<boolean> {
        return false;
    }
}

export class KeyReelEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        let crx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
        options.addExtensions(crx);

        return this.createDriver(options);
    }
}

export class LastPassEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        let crx = fs.readFileSync('./resources/crxs/lastpass.crx', {encoding: "base64"});
        options.addExtensions(crx);

        let driver = await this.createDriver(options);

        while (true) {
            try {
                await driver.get('chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/extensionLogin.html')
                await driver.wait(until.elementLocated(By.id("loginDialogEmail")), 5000);
                break;
            } catch (UnhandledPromiseRejectionWarning) {
            }
        }

        await driver.findElement(By.id("loginDialogEmail")).sendKeys("hdayfg6wq5sq@gmail.com");
        await driver.findElement(By.id("loginDialogPassword")).sendKeys("QL=25LXd%NT2ca5");
        await driver.findElement(By.id("logInButton")).click();

        //await driver.wait(until.("/signin"));
        // await driver.wait(until.elementLocated(By.id("")));

        return Promise.resolve(driver);
    }
}

export class OnePasswordXEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        let crx = fs.readFileSync('./resources/crxs/1passwordx.crx', {encoding: "base64"});
        options.addExtensions(crx);

        let driver = await this.createDriver(options);

        while (true) {
            try {
                await driver.get('chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/app/app.html#/page/welcome')
                await driver.wait(until.elementLocated(By.id("signInButton")), 5000);
                break;
            } catch (UnhandledPromiseRejectionWarning) {
            }
        }

        await driver.findElement(By.id("signInButton")).click();
        await driver.wait(until.urlContains("/signin"));

        await driver.wait(until.elementLocated(By.id("email"))).sendKeys("hdayfg6wq5sq@gmail.com");
        await driver.findElement(By.id("account-key")).sendKeys("A3-4J9LQG-APXJD3-KYXNL-ARBGG-TLKV3-YVMYQ");
        await driver.findElement(By.id("master-password")).sendKeys("hrfW-Y1q3_4%");
        await driver.findElement(By.className("signin-actions")).findElement(By.xpath("button")).click();

        return Promise.resolve(driver);
    }
}

export class DashlaneEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        let crx = fs.readFileSync('./resources/crxs/dashlane.crx', {encoding: "base64"});
        options.addExtensions(crx);

        let driver = await this.createDriver(options);

        while (true) {
            try {
                await driver.get('chrome-extension://fdjamakpfbbddfjaooikfcpapjohcfmg/signup')
                await driver.wait(until.elementLocated(By.xpath("//input[@type='email']")), 5000);
                break;
            } catch (UnhandledPromiseRejectionWarning) {
            }
        }

        await driver.wait(until.elementLocated(By.xpath("//a[@href='/login']"))).click();
        await driver.wait(until.urlContains("/login"));

        await driver.wait(until.elementLocated(By.xpath("//input[@type='email']"))).sendKeys("hdayfg6wq5sq@gmail.com");
        await driver.findElement(By.xpath("//button[@type='button']")).click();

        //TODO: for new installed extension need type code from email

        await driver.wait(until.elementLocated(By.xpath("//input[@type='password']"))).sendKeys("dzM+T+y(Tn~J86{");
        await driver.findElement(By.xpath("//button[@type='submit']")).click();

        return Promise.resolve(driver);
    }
}
