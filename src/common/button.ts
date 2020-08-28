import {By, error, WebDriver, WebElement} from "selenium-webdriver";
import {WebElementExt} from "./webElementExt";
import {WebDriverExt} from "./webDriverExt";
import {IEngine} from "../engine/engine";
import {EReportTest, ReportExport} from "../report/report";
import JavascriptError = error.JavascriptError;


export class Button {
    iframe: WebElement | undefined;
    button: WebElement;


    public constructor(button: WebElement, iframe: WebElement | undefined = undefined) {
        this.button = button;
        this.iframe = iframe;
    }

    public static async press(
        frameSelector: string | undefined,
        buttonSelector: string,
        engine: IEngine,
        test: EReportTest = EReportTest.unknown,
        remark: string = ""
    ) {
        await Button.pressCurrentFrameButton(
            await WebElementExt.from(frameSelector, buttonSelector, engine),
            engine,
            test,
            remark
        );
    }


    private static async pressCurrentFrameButton(
        extButton: WebElementExt,
        engine: IEngine | undefined,
        test: EReportTest,
        remark: string = ""
    ): Promise<void> {
        let driver = await extButton.webElement.getDriver();

        // mark selected button with a contrast red frame

        let prevStyle = await driver.executeScript(`
          let prev_style = arguments[0].style.border;
          arguments[0].style.border='3px solid red';
          return prev_style;
        `, extButton.webElement) as string | undefined;

        // save screenshot here
        if (engine != null) {
            await engine.writeScreenshot(test, remark);
        }

        await driver.executeScript(
            `arguments[0].style.border='${prevStyle || ''}'`,
            extButton.webElement
        );

        try {
          await extButton.click();
        } catch (e) {
           // if (e instanceof JavascriptError) {
           console.error("button click error", e);
           return Promise.reject(e);
        }
        return Promise.resolve();
    }

    public async press(
        engine: IEngine | undefined = undefined,
        test: EReportTest,
        remark: string = ""
    ): Promise<void> {
        try {
            let driver = await this.button.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }
            let extButton = new WebElementExt(this.button);
            await Button.pressCurrentFrameButton(extButton, engine, test, remark);

        } catch (e) { //: UnhandledPromiseRejectionWarning) {
            return Promise.reject(e);
        }
    }
}
