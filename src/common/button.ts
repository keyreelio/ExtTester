import {WebElement} from "selenium-webdriver";
import {WebElementExt} from "./webElementExt";
import {WebDriverExt} from "./webDriverExt";


export class Button {
    iframe: WebElement | undefined;
    button: WebElement;


    public constructor(button: WebElement, iframe: WebElement | undefined) {
        this.button = button;
        this.iframe = iframe;
    }

    public async press(): Promise<void> {
        try {
            let driver = await this.button.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extButton = new WebElementExt(this.button);
            await extButton.click();

            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            return Promise.reject();
        }
    }
}

