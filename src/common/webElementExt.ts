import {By, Key, WebDriver, WebElement} from "selenium-webdriver";
import {Timeouts} from "./timeouts";
import {IEngine} from "../engine/engine";
import {EReportTest} from "../report/report";


export class WebElementExt {

    public readonly webElement: WebElement;

    public constructor(wedElement: WebElement) {
        this.webElement = wedElement;
    }

    public static async from(
        frameSelector: string | undefined,
        buttonSelector: string,
        engine: IEngine
    ): Promise<WebElementExt> {
        let driver = await engine.getDriver();
        let extDriver = await engine.getExtDriver();
        let extElement: WebElementExt | undefined = undefined;

        await extDriver.switchInRootToFrame(frameSelector);
        let element = await driver.findElement(By.css(buttonSelector));
        if (element != null) {
            extElement = new WebElementExt(element);
        } else {
            return Promise.reject(`Element '${buttonSelector}' in the ${ 
                frameSelector ? 'page' : `iframe '${frameSelector}'`
            } do not exist`);
        }
        return extElement;
    }

    public static async isVisibleAndEnabledFrom(
        frameSelector: string | undefined,
        buttonSelector: string,
        engine: IEngine
    ): Promise<boolean> {
        try {
            let element: WebElementExt = await WebElementExt
                .from(frameSelector, buttonSelector, engine);
            return await this.isVisibleAndEnabled(element);
        } catch (ignore) {
            // If element is null, stale or if it cannot be located
            return false;
        }
    }

    public static async isVisibleAndEnabled(elementExt: WebElementExt): Promise<boolean> {
        try {
            let element: WebElement = elementExt.webElement;
            return await (element.isDisplayed() && element.isEnabled());
        } catch (Exception) {
            // If element is null, stale or if it cannot be located
            return false;
        }
    }

    public async setAttribute(
        attName: string,
        attValue: string = ''
    ) {
        let driver = this.webElement.getDriver();
        await driver.executeScript(
            "arguments[0].setAttribute(arguments[1], arguments[2]);",
            this.webElement,
            attName,
            attValue
        );
    }

    public async sendKeys(...var_args: Array<string|number|Promise<string|number>>): Promise<void> {
        return await this.send(Timeouts.BetweenKey, var_args);
    }

    public async sendKeysWithDelay(delay: number, ...var_args: Array<string|number|Promise<string|number>>): Promise<void> {
        return await this.send(delay, var_args);
    }

    public async getValue(timeout = Timeouts.WaitExistValue): Promise<string> {
        let delay = 0;
        while (true) {
            let value = await this.webElement.getAttribute("value");
            if (value !== undefined && value.length > 0) {
                return Promise.resolve(value);
            }

            if (timeout > 0 && delay < timeout) {
                await this.webElement.getDriver().sleep(500);
                delay += 500;
                continue;
            }

            if (value !== undefined) {
                return Promise.resolve(value);
            }
            return Promise.reject();
        }
    }

    public async pressEnter(): Promise<void> {
        await this.webElement.getDriver().sleep(Timeouts.BeforeEnter);
        await this.webElement.sendKeys(Key.RETURN);
    }

    public async click(): Promise<void> {
        await this.webElement.getDriver().sleep(Timeouts.BeforeClick);
        // try {
        //     await this.webElement.click();
        // } catch (e) {
            await this.webElement.getDriver().actions()
                .click(this.webElement)
                .perform();
        // }
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
