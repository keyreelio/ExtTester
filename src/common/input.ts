import {By, WebElement} from "selenium-webdriver";
import {WebElementExt} from "./webElementExt";
import {Timeouts} from "./timeouts";
import {WebDriverExt} from "./webDriverExt";
import {IEngine} from "../engine/engine";
import {EReportTest, ReportExport} from "../report/report";


export class Input {
    iframe: WebElement | undefined;
    input: WebElement;

    public constructor(input: WebElement, iframe: WebElement | undefined) {
        this.input = input;
        this.iframe = iframe;
    }

    public static async enterValue(
        inputSelector: string,
        frameSelector: string | undefined,
        engine: IEngine,
        value: string,
        options:
            { attach: boolean } |
            { replace: boolean} |
            { attach: boolean, replace: boolean } |
            undefined = undefined
    ): Promise<void> {
        await Input.enterValueInCurrentFrame(
            await WebElementExt.from(frameSelector, inputSelector, engine),
            value,
            options
        );
    }

    private static async enterValueInCurrentFrame(
       extInput: WebElementExt,
       value: string,
       options:
           { attach: boolean } |
           { replace: boolean} |
           { attach: boolean, replace: boolean } |
           undefined = undefined
    ): Promise<void> {
        try {
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
        } catch (e) { //: UnhandledPromiseRejectionWarning) {
            return Promise.reject(e);
        }
    }

    public async enterValue(
        value: string,
        options:
            { attach: boolean } |
            { replace: boolean} |
            { attach: boolean, replace: boolean } |
            undefined = undefined
    ): Promise<void> {
        try {
            let driver = await this.input.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extInput = new WebElementExt(this.input);
            await Input.enterValueInCurrentFrame(extInput, value, options);

        } catch (e) { //: UnhandledPromiseRejectionWarning) {
            return Promise.reject(e);
        }
    }

    public static async getInputValue(
        inputSelector: string,
        frameSelector: string | undefined,
        engine: IEngine
    ): Promise<string> {
        let extInput = await WebElementExt.from(frameSelector, inputSelector, engine);
        return await extInput.getValue(Timeouts.WaitExistValue);
    }

    public async getInputValue(): Promise<string> {
        try {
            let driver = await this.input.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe != null) {
                await driver.switchTo().frame(this.iframe);
            }

            let extInput = new WebElementExt(this.input);
            return await extInput.getValue(Timeouts.WaitExistValue);
        } catch (e) { //: UnhandledPromiseRejectionWarning) {
            return Promise.reject(e);
        }
    }

    public static async pressEnter(
        inputSelector: string,
        frameSelector: string | undefined,
        engine: IEngine,
        test: EReportTest,
        remark: string = ""
    ): Promise<void> {
       await this.pressEnterInCurrentFrame(
           await WebElementExt.from(frameSelector, inputSelector, engine),
           engine,
           test,
           remark
       )
    }

    public static async pressEnterInCurrentFrame(
        extInput: WebElementExt,
        engine: IEngine | undefined = undefined,
        test: EReportTest,
        remark: string = ""
    ) {
        let driver = extInput.webElement.getDriver();
        // mark selected button with a contrast red frame
        let prevStyle = await driver.executeScript(
            "let prev_style = arguments[0].style.border;" +
            "arguments[0].style.border='3px solid red';" +
            "return prev_style;",
            extInput.webElement
        ) as string | undefined;

        // save screenshot here
        if (engine != null) {
            await engine.writeScreenshot(test, remark);
        }

        await driver.executeScript(
            `arguments[0].style.border='${prevStyle || ''}'`,
            extInput.webElement
        );

        await extInput.pressEnter();
        return Promise.resolve();
    }

    public async pressEnter(
        engine: IEngine | undefined = undefined,
        test: EReportTest,
        remark: string = ""
    ): Promise<void> {
        try {
            let driver = await this.input.getDriver();
            let extDriver = new WebDriverExt(driver);

            await extDriver.switchToRootFrame();
            if (this.iframe !== undefined) {
                await driver.switchTo().frame(this.iframe);
            }

            let extInput = new WebElementExt(this.input);

            await Input.pressEnterInCurrentFrame(extInput, engine, test, remark);
        } catch (e) {
            return Promise.reject(e);
        }
    }
}
