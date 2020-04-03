import {Builder, By, Key, until, WebDriver} from 'selenium-webdriver';
import * as chrome from "selenium-webdriver/chrome";
import fs from "fs";

async function delay(ms: number) {
    return new Promise( resolve => setTimeout(resolve, ms) );
}

class Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();

        let driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        return Promise.resolve(driver);
    }
}

class LastPassEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        let crx = fs.readFileSync('./resources/crxs/lastpass.crx', {encoding: "base64"});
        options.addExtensions(crx);

        let driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        await driver.get('chrome-extension://hdokiejnpimakedhajhdlcegeplioahd/extensionLogin.html')
        await driver.findElement(By.id("loginDialogEmail")).sendKeys("hdayfg6wq5sq@gmail.com");
        await driver.findElement(By.id("loginDialogPassword")).sendKeys("QL=25LXd%NT2ca5");
        await driver.findElement(By.id("logInButton")).click();

        return Promise.resolve(driver);
    }
}

class OnePasswordXEngine extends Engine {
    public async startup(): Promise<WebDriver> {
        let options = new chrome.Options();
        let crx = fs.readFileSync('./resources/crxs/1passwordx.crx', {encoding: "base64"});
        options.addExtensions(crx);

        let driver = await new Builder()
            .forBrowser('chrome')
            .setChromeOptions(options)
            .build();

        await driver.get('chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/app/app.html#/page/welcome')

        //TODO: change to waiter loaded page
        await delay(2000);

        await driver.findElement(By.id("signInButton")).click();

        //TODO: change to waiter loaded page
        await delay(2000);

        await driver.findElement(By.id("email")).sendKeys("hdayfg6wq5sq@gmail.com");
        await driver.findElement(By.id("account-key")).sendKeys("A3-4J9LQG-APXJD3-KYXNL-ARBGG-TLKV3-YVMYQ");
        await driver.findElement(By.id("master-password")).sendKeys("hrfW-Y1q3_4%");
        await driver.findElement(By.className("signin-actions")).findElement(By.xpath("button")).click();

        return Promise.resolve(driver);
    }
}

async function test(engine: Engine): Promise<Boolean> {

    let driver = await engine.startup();

    return true;
}

(async function example() {

    await Promise.all([test(new LastPassEngine()), test(new OnePasswordXEngine())]);
    // await Promise.all([test(new OnePasswordXEngine())]);

})();
