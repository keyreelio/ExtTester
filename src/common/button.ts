import {WebDriver, WebElement} from "selenium-webdriver";
import {WebElementExt} from "./webElementExt";
import {WebDriverExt} from "./webDriverExt";
import {IEngine} from "../engine/engine";
import {EReportTest, ReportExport} from "../report/report";


export class Button {
    iframe: WebElement | undefined;
    button: WebElement;


    public constructor(button: WebElement, iframe: WebElement | undefined = undefined) {
        this.button = button;
        this.iframe = iframe;
    }

    public async press(
        engine: IEngine | undefined = undefined,
        test: EReportTest,
        remark: string = "",
        markAsClicked: boolean = false
    ): Promise<void> {
        try {
            let driver = await this.button.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extButton = new WebElementExt(this.button);

            // mark selected button with a contrast red frame
            let prevStyle = await driver.executeScript(
                "let prev_style = arguments[0].style.border;" +
                         "arguments[0].style.border='3px solid red';" +
                         "return prev_style;",
                extButton.webElement
            ) as string | undefined;

            // save screenshot here
            if (engine != null) {
                await engine.writeScreenshot(test, remark);
            }

            await driver.executeScript(
                `arguments[0].style.border='${prevStyle || ''}'`,
                extButton.webElement
            );

            if (markAsClicked) {
               await extButton.setAttribute("axt-clicked");
            }
            await extButton.click();

            return Promise.resolve();
        } catch (e) { //: UnhandledPromiseRejectionWarning) {
            return Promise.reject(e);
        }
    }
}

