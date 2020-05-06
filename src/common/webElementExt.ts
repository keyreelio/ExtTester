import {Key, WebElement} from "selenium-webdriver";
import {Timeouts} from "./timeouts";


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
