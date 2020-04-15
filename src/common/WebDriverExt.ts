import {By, Key, until, WebDriver, WebElement, WebElementPromise} from "selenium-webdriver";
import {Timeouts} from "./timeouts";


export class WebDriverExt {

    webDriver: WebDriver;

    public constructor(webDriver: WebDriver) {
        this.webDriver = webDriver;
    }

    public async openUrlOnCurrentTab(url: string) {
        let tabs = await this.webDriver.getAllWindowHandles();
        if (tabs.length === 0) return this.openUrlOnNewTab(url);

        await this.webDriver.get(url);
        await this.waitUrlOpened();
    }

    public async openUrlOnNewTab(url: string) {
        await this.webDriver.executeScript("window.open();");
        let tabs = await this.webDriver.getAllWindowHandles();
        await this.webDriver.switchTo().window(tabs[tabs.length - 1]);

        await this.webDriver.get(url);
        await this.waitUrlOpened();
    }

    public async closeCurrentTab() {
        //TODO: fixed because did not work
        // await this.webDriver.executeScript("window.close();");
        // let tabs = await this.webDriver.getAllWindowHandles();
        // await this.webDriver.switchTo().window(tabs[tabs.length - 1]);
    }

    public async switchToRootFrame(): Promise<void> {
        for (let i = 0; i < 10; ++i) {
            await this.webDriver.switchTo().parentFrame();
        }
    }

    public async waitLocated(xpath: string, timeout: number): Promise<WebElement> {
        return Promise.resolve(await this.webDriver.wait(until.elementLocated(By.xpath(xpath)), timeout));
    }

    public async waitLocatedExt(xpath: string, timeout: number): Promise<WebElementExt> {
        return Promise.resolve(new WebElementExt(await this.webDriver.wait(until.elementLocated(By.xpath(xpath)), timeout)));
    }

    protected async waitUrlOpened(timeout: number = Timeouts.WaitOpenedUrl) {
        await this.webDriver.sleep(Timeouts.AfterOpenUrl);
        let webDriver = this.webDriver;
        await this.webDriver.wait(function() {
            return webDriver.executeScript('return document.readyState').then(readyState => readyState === 'complete');
        }, timeout);
    }
}

export class WebElementExt {

    public readonly webElement: WebElement;

    public constructor(wedElement: WebElement) {
        this.webElement = wedElement;
    }

    public async sendKeys(...var_args: Array<string|number|Promise<string|number>>): Promise<void> {
        return await this.send(Timeouts.BetweenKey, var_args);
    }

    public async sendKeysWithDelay(delay: number, ...var_args: Array<string|number|Promise<string|number>>): Promise<void> {
        return await this.send(delay, var_args);
    }

    public async pressEnter(): Promise<void> {
        await this.webElement.getDriver().sleep(Timeouts.BeforeEnter);
        await this.webElement.sendKeys(Key.RETURN);
    }

    public async click(): Promise<void> {
        await this.webElement.getDriver().sleep(Timeouts.BeforeClick);
        await this.webElement.click();
    }

    protected async send(delay: number, keys: Array<any>) {
        await this.webElement.getDriver().sleep(Timeouts.BeforeSendKeys);
        for (let arg of keys) {
            if (arg as string) {
                let str = <string> arg;
                for (let i = 0; i < str.length; i++) {
                    await this.webElement.sendKeys(str[i]);
                    await this.webElement.getDriver().sleep(delay);
                }
            } else {
                await this.webElement.sendKeys(arg);
                await this.webElement.getDriver().sleep(delay);
            }
        }
    }
}