import {WebDriver, WebElement} from "selenium-webdriver";


export class WebDriverExt {

    webDriver: WebDriver;

    public constructor(webDriver: WebDriver) {
        this.webDriver = webDriver;
    }

    public async openUrlOnCurrentTab(url: string) {
        var tabs = await this.webDriver.getAllWindowHandles();
        if (tabs.length === 0) return this.openUrlOnNewTab(url);

        await this.webDriver.get(url);
        await this.webDriver.sleep(200);
        await this.waitUrlOpened();
    }

    public async openUrlOnNewTab(url: string) {
        await this.webDriver.executeScript("window.open();");
        var tabs = await this.webDriver.getAllWindowHandles();
        await this.webDriver.switchTo().window(tabs[tabs.length - 1]);

        await this.webDriver.get(url);
        await this.webDriver.sleep(200);
        await this.waitUrlOpened();
    }

    public async swithToRootFrame(): Promise<void> {
        for (let i = 0; i < 10; ++i) {
            await this.webDriver.switchTo().parentFrame();
        }
    }

    protected async waitUrlOpened(timeout: number = 10000) {
        let webDriver = this.webDriver;
        await this.webDriver.wait(function() {
            return webDriver.executeScript('return document.readyState').then(readyState => readyState === 'complete');
        }, timeout);
    }
}

export class WebElementExt {

    public readonly webElement: WebElement;
    protected defaultDelay: number = 50;

    public constructor(wedElement: WebElement) {
        this.webElement = wedElement;
    }

    public async sendKeys(...var_args: Array<string|number|Promise<string|number>>): Promise<void> {
        return await this.send(this.defaultDelay, var_args);
    }

    public async sendKeysWithDelay(delay: number, ...var_args: Array<string|number|Promise<string|number>>): Promise<void> {
        return await this.send(delay, var_args);
    }

    protected async send(delay: number, keys: Array<any>) {
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