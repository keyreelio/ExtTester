import {WebElement} from "selenium-webdriver";
import {WebElementExt} from "./webElementExt";
import {Timeouts} from "./timeouts";
import {WebDriverExt} from "./webDriverExt";


export class Input {
    iframe: WebElement | undefined;
    input: WebElement;

    public constructor(input: WebElement, iframe: WebElement | undefined) {
        this.input = input;
        this.iframe = iframe;
    }

    public async enterValue(
        value: string,
        options:
            { attach: boolean } |
            { replace: boolean} |
            { attach: boolean, replace: boolean } |
            undefined = undefined): Promise<void> {

        let attach = false;
        let replace = false;
        if (options !== undefined) {
            if (options as { attach: boolean }) {
                attach = (<{ attach: boolean }>options).attach;
            }
            if (options as { replace: boolean }) {
                replace = (<{ replace: boolean }>options).replace;
            }
        }

        try {
            let driver = await this.input.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extInput = new WebElementExt(this.input);
            if (replace) {
                await extInput.webElement.clear();
            } else {
                let currentValue = await extInput.webElement.getAttribute("value");
                if (currentValue.length != 0) {
                    if (!attach) return Promise.resolve();
                }
            }

            await extInput.sendKeys(value);

            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            return Promise.reject();
        }
    }

    public async getInputValue(): Promise<string> {
        try {
            let driver = await this.input.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extInput = new WebElementExt(this.input);
            return await extInput.getValue(Timeouts.WaitExistValue);
        } catch (UnhandledPromiseRejectionWarning) {
            return Promise.reject();
        }
    }

    public async pressEnter(): Promise<void> {
        try {
            let driver = await this.input.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extInput = new WebElementExt(this.input);
            await extInput.pressEnter();

            return Promise.resolve();
        } catch (e) {
            return Promise.reject(e);
        }
    }
}

