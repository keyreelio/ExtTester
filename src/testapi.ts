import {IEngine} from "./engine/engine";
import {By, error, WebElement} from "selenium-webdriver";
import {ICredential} from "./credentials";

import {testapiLogger as L} from "./common/log.config";
import {WebElementExt} from "./common/WebDriverExt";
import {EReportParsePart, EReportResult, EReportTest, IReport} from "./report/report";
import {Timeouts} from "./common/timeouts";
import UnsupportedOperationError = error.UnsupportedOperationError;


class Button {
    iframe: WebElement | undefined;
    button: WebElement;

    public constructor(button: WebElement, iframe: WebElement | undefined) {
        this.button = button;
        this.iframe = iframe;
    }
}

class Input {
    iframe: WebElement | undefined;
    input: WebElement;

    public constructor(input: WebElement, iframe: WebElement | undefined) {
        this.input = input;
        this.iframe = iframe;
    }
}

class LoginForm {
    loginInput: Input | undefined = undefined;
    passwordInput: Input | undefined = undefined;
    nextButton: Button | undefined = undefined;
    loginButton: Button | undefined = undefined;
}

class Page {
    didNotParse: boolean = true;
    singinButton: Button | undefined = undefined;
    loginForm: LoginForm | undefined = undefined;
    isLoggedIn: boolean = false;
}

enum State {
    init,
    waitLoginForm,
    waitSecondLoginForm,
    waitLoggedIn,
    done
}

let SearchFlagSingInButton: number = 0x01;
let SearchFlagLoginOnForm: number = 0x02;
let SearchFlagPasswordOnForm: number = 0x04;
let SearchFlagLoggedIn: number = 0x08;

let ParseSearchMap: number[] = [
    SearchFlagSingInButton | SearchFlagLoginOnForm | SearchFlagPasswordOnForm, // State.init
    SearchFlagLoginOnForm | SearchFlagPasswordOnForm, // State.waitLoginForm
    SearchFlagPasswordOnForm, // State.waitSecondLoginForm
    SearchFlagLoggedIn, // State.waitLoggedIn
];

export class TestAPI {

    engine: IEngine;
    credential: ICredential;
    report: IReport;

    constructor(engine: IEngine, credential: ICredential, report: IReport) {
        this.engine = engine;
        this.credential = credential;
        this.report = report;
    }

    public async checkWriteCredential(
        options:
            { useOnlyEnterButton: boolean } |
            undefined = undefined): Promise<void> {

        L.info("checkWriteCredential");

        let useOnlyEnterButton = false;
        if (options !== undefined) {
            if (options as { useOnlyEnterButton: boolean }) {
                useOnlyEnterButton = (<{ useOnlyEnterButton: boolean }>options).useOnlyEnterButton;
            }
        }

        let error: Error | undefined = undefined;

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        let failMessage = function(error: any) {
            if (error === undefined) return "undefined";
            if (error.message === undefined) return `${error}`;
            return error.message;
        }

        L.debug(`open new tab with: ${this.credential.url}`);
        await extDriver.openUrlOnNewTab(this.credential.url);
        try {
            let state = State.init;

            let reloadedPage = false;
            while (true) {
                L.debug("parse page");
                let page: Page;
                // try {
                    page = await this.parsePage(ParseSearchMap[state]);
                // } catch (e) {
                //     if (reloadedPage) {
                //         throw e;
                //     }
                //     reloadedPage = true;
                //     await this.report.setParsePart(EReportParsePart.loggedIn);
                //     await driver.navigate().refresh();
                //     continue;
                // }

                L.debug("check page structure");
                if (page.singinButton !== undefined && page.loginForm === undefined) {
                    L.debug("page has singin button and hasn't login form");

                    await this.report.setParsePart(EReportParsePart.singInButton);
                    await this.pressOnButton(page.singinButton);

                    state = State.waitLoginForm;
                    continue;
                } else if (page.loginForm !== undefined) {
                    L.debug("page has login form");

                    if (page.loginForm.loginInput !== undefined && page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has login and password inputs");

                        await this.report.setParsePart(EReportParsePart.fullLoginForm);

                        await this.enterToInput(this.credential.login, page.loginForm.loginInput);
                        await this.enterToInput(this.credential.password, page.loginForm.passwordInput);
                    } else if (page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has only password input");

                        await this.report.setParsePart(EReportParsePart.secondStepLoginForm);

                        await this.enterToInput(this.credential.password, page.loginForm.passwordInput);
                    } else if (page.loginForm.loginInput !== undefined) {
                        L.debug("login form has only login input");

                        await this.report.setParsePart(EReportParsePart.firstStepLoginForm);

                        await this.enterToInput(this.credential.login, page.loginForm.loginInput);

                        if (page.loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                            await this.pressOnButton(page.loginForm.loginButton);
                        } else if (page.loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                            await this.pressOnButton(page.loginForm.nextButton);
                        } else {
                            await this.pressEnterOnInput(page.loginForm.loginInput);
                        }

                        state = State.waitSecondLoginForm;
                        continue;
                    }

                    try {
                        L.debug("try engine process before login");

                        await this.engine.processBeforeLogin();

                        L.info("credential SAVED as manual before logged in");
                        await this.report.setResult(EReportResult.waitApprove, EReportTest.load);
                        await this.report.setResult(
                            EReportResult.manual,
                            useOnlyEnterButton ? EReportTest.saveBeforeLoggedInWithoutButtons : EReportTest.saveBeforeLoggedInWithButtons);

                        break;
                    } catch (e) {
                        if (e as UnsupportedOperationError) {
                            L.debug("engine process before login not supported");

                            if (page.loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                                await this.pressOnButton(page.loginForm.loginButton);
                            } else if (page.loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                                await this.pressOnButton(page.loginForm.nextButton);
                            } else if (page.loginForm.passwordInput !== undefined) {
                                await this.pressEnterOnInput(page.loginForm.passwordInput);
                            }

                            state = State.waitLoggedIn;
                            continue;
                        }

                        L.debug("engine process before login is failed");
                        L.info("credential FAILED SAVE before logged in");
                        error = e;
                        await this.report.setFail(
                            failMessage(error),
                            useOnlyEnterButton ? EReportTest.saveBeforeLoggedInWithoutButtons : EReportTest.saveBeforeLoggedInWithButtons);
                        break;
                    }
                } else if (page.isLoggedIn) {
                    await this.report.setParsePart(EReportParsePart.loggedIn);

                    try {
                        L.debug("try engine process after login");

                        await this.engine.processAfterLogin();

                        L.info("credential SAVED as manual after logged in");
                        await this.report.setResult(EReportResult.waitApprove, EReportTest.load);
                        await this.report.setResult(
                            EReportResult.manual,
                            useOnlyEnterButton ? EReportTest.saveAfterLoggedInWithoutButtons : EReportTest.saveAfterLoggedInWithButtons);

                        break;
                    } catch (e) {
                        if (!(e instanceof UnsupportedOperationError)) {
                            L.debug("engine process after login is failed");
                            L.info("credential FAILED SAVE after logged in");
                            error = e;
                            await this.report.setFail(
                                failMessage(error),
                                useOnlyEnterButton ? EReportTest.saveAfterLoggedInWithoutButtons : EReportTest.saveAfterLoggedInWithButtons);
                            break;
                        }
                    }

                    try {
                        L.debug("try engine check saved");

                        await this.engine.checkSaved(this.credential.url, this.credential);

                        L.info("credential SAVED as auto after logged in");
                        await this.report.setResult(
                            EReportResult.auto,
                            useOnlyEnterButton ? EReportTest.saveAfterLoggedInWithoutButtons : EReportTest.saveAfterLoggedInWithButtons);

                        break;
                    } catch (e) {
                        if (e instanceof UnsupportedOperationError) {
                            L.debug("engine engine check saved not supported");

                            L.info("credential MAYBE SAVED as auto after logged in");
                            await this.report.setResult(
                                EReportResult.waitApprove,
                                useOnlyEnterButton ? EReportTest.saveAfterLoggedInWithoutButtons : EReportTest.saveAfterLoggedInWithButtons);

                            break;
                        }

                        L.debug("engine process after login is failed");
                        L.info("credential FAILED SAVE after logged in");
                        error = e;
                        await this.report.setFail(
                            failMessage(error),
                            useOnlyEnterButton ? EReportTest.saveAfterLoggedInWithoutButtons : EReportTest.saveAfterLoggedInWithButtons);
                        break;
                    }
                } else {
                    error = new Error("Page not parsed");
                    await this.report.setFail(failMessage(error), EReportTest.unknown);
                }

                break;
            }
        } catch (e) {
            error = e;
            // await this.report.setFail(`${error}`, EReportTest.unknown);
        }

        L.debug("close current tab");
        await extDriver.closeCurrentTab();

        if (error !== undefined) {
            return Promise.reject(error);
        } else {
            return Promise.resolve();
        }
    }

    public async checkReadCredential(): Promise<void> {
        L.info("checkReadCredential");

        let error: Error | undefined = undefined;

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        L.debug("clear browser data");
        await extDriver.clearBrowserData();

        L.debug(`open new tab with: ${this.credential.url}`);
        await extDriver.openUrlOnNewTab(this.credential.url);

        try {
            var state: State = State.init;

            let reloadedPage = false;
            while (true) {
                L.debug("parse page");
                let page: Page;
                try {
                    page = await this.parsePage(ParseSearchMap[state]);
                } catch (e) {
                    if (reloadedPage) {
                        throw e;
                    }
                    reloadedPage = true;
                    await this.report.setParsePart(EReportParsePart.loggedIn);
                    await driver.navigate().refresh();
                    continue;
                }

                L.debug("check page structure");
                if (page.singinButton !== undefined && page.loginForm === undefined) {
                    L.debug("page has singin button and hasn't login form");

                    await this.pressOnButton(page.singinButton);

                    state = State.waitLoginForm;
                    continue;
                } else if (page.loginForm !== undefined) {
                    L.debug("page has login form");

                    if (page.loginForm.loginInput !== undefined && page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has login and password inputs");

                        L.debug("check auto fill login and password inputs")
                        if (!await this.isEmptyInputValue(page.loginForm.loginInput) &&
                            !await this.isEmptyInputValue(page.loginForm.passwordInput)) {

                            if (await this.checkInputValue(this.credential.login, page.loginForm.loginInput) &&
                                await this.checkInputValue(this.credential.password, page.loginForm.passwordInput)) {

                                L.debug("credential AUTO LOAD");
                                await this.report.setResult(EReportResult.auto, EReportTest.load);
                            } else {
                                L.debug("credential AUTO LOAD failed");
                                error = new Error();
                            }
                            break;
                        } else {
                            //TODO: try manual fill login and password inputs
                            // try {
                            //     L.debug("try engine process after login");
                            //
                            //     await this.engine.processAfterLogin();
                            //
                            //     L.info("credential SAVED as manual after logged in");
                            //     await this.report.setResult(
                            //         EReportResult.success,
                            //         useOnlyEnterButton ? EReportTest.saveManualAfterLoggedInWithoutButtons : EReportTest.saveManualAfterLoggedInWithButtons);
                            // } catch (e) {
                            //     if (e instanceof UnsupportedOperationError) {
                            //         L.debug("engine process after login is failed");
                            //         L.info("credential FAILED SAVE after logged in");
                            //         error = new Error();
                            //     }
                            // }

                            break;
                        }
                    } else if (page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has only password input");

                        L.debug("check auto fill password input")
                        if (!await this.isEmptyInputValue(page.loginForm.passwordInput)) {
                            if (await this.checkInputValue(this.credential.password, page.loginForm.passwordInput)) {
                                L.debug("credential AUTO LOAD");
                                await this.report.setResult(EReportResult.auto, EReportTest.load);
                            } else {
                                L.debug("credential AUTO LOAD failed");
                                error = new Error();
                            }
                            break;
                        } else {
                            //TODO: try manual fill password input
                            error = new Error();
                            break;
                        }
                    } else if (page.loginForm.loginInput !== undefined) {
                        L.debug("login form has only login input");

                        L.debug("check auto fill login input")
                        if (!await this.isEmptyInputValue(page.loginForm.loginInput)) {
                            if (!await this.checkInputValue(this.credential.login, page.loginForm.loginInput)) {
                                error = new Error();
                                break;
                            }
                        } else {
                            //TODO: try manual fill password input
                            error = new Error();
                            break;
                        }

                        if (page.loginForm.loginButton !== undefined) {
                            await this.pressOnButton(page.loginForm.loginButton);
                        } else if (page.loginForm.nextButton !== undefined) {
                            await this.pressOnButton(page.loginForm.nextButton);
                        } else {
                            await this.pressEnterOnInput(page.loginForm.loginInput);
                        }

                        state = State.waitSecondLoginForm;
                        continue;
                    }
                }

                break;
            }
        } catch (e) {
            error = e;
        }

        L.debug("close current tab");
        await extDriver.closeCurrentTab();

        if (error !== undefined) {
            return Promise.reject(error);
        } else {
            return Promise.resolve();
        }
    }

    //body[@axt-parser-timing]
    //  *[@axt-form-type="login"]
    //      input[@axt-input-type="login"]
    //      input[@axt-input-type="password"]
    //      *[@axt-button-type="login"]
    //      *[@axt-button-type="next"]
    //  *[@axt-button-type="singin"]
    protected async parsePage(searchFlag: number): Promise<Page> {
        L.debug("parsePage");

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        let delay = 0;
        while (true) {
            let page = new Page();

            await extDriver.switchToRootFrame();

            // let parsed = await this.canParsed();
            // if (!parsed) {
            //     parsed = await this.canParsedFrames();
            // }
            // if (parsed) {
                let loginForm = await this.findLoginForm(undefined);
                if (loginForm === undefined) {
                    loginForm = await this.findLoginFormInFrames();
                }

                page.loginForm = loginForm;

                let singInButton: Button | undefined = undefined;
                //TODO: add find search button

                page.singinButton = singInButton;

                if (page.loginForm === undefined && page.singinButton === undefined) {
                    page.isLoggedIn = true;
                }

                let done: boolean = false;
                if ((searchFlag & SearchFlagSingInButton) === SearchFlagSingInButton) {
                    done = done || (page.singinButton !== undefined);
                }
                if ((searchFlag & SearchFlagLoginOnForm) === SearchFlagLoginOnForm) {
                    done = done || (page.loginForm !== undefined && page.loginForm.loginInput !== undefined);
                }
                if ((searchFlag & SearchFlagPasswordOnForm) === SearchFlagPasswordOnForm) {
                    done = done || (page.loginForm !== undefined && page.loginForm.passwordInput !== undefined);
                }
                if ((searchFlag & SearchFlagLoggedIn) === SearchFlagLoggedIn) {
                    done = done || page.isLoggedIn;
                }

                if (done) {
                    L.trace("----------------------------------");
                    await this.logPage(page);
                    L.trace("----------------------------------");

                    return Promise.resolve(page);
                }
            // }

            if (this.credential.timeout > 0 && delay < this.credential.timeout) {
                await driver.sleep(500);
                delay += 500;
                continue;
            }

            return Promise.reject(new Error("Page did not parsed"));
        }
    }

    protected async canParsedFrames(): Promise<boolean> {
        L.debug("canParsedFrames");

        let driver = await this.engine.getDriver();

        try {
            for (let iframe of await driver.findElements(By.xpath("//iframe"))) {
                try {
                    L.trace(`switch to '${await iframe.getId()}'`);
                    await driver.switchTo().frame(iframe);

                    let result = await this.canParsed();

                    L.trace("switch to 'root'");
                    await driver.switchTo().parentFrame();

                    if (result) {
                        return Promise.resolve(true);
                    }
                } catch (e) {
                }
            }
        } catch (e) {
        }

        return Promise.resolve(false);
    }

    protected async canParsed(): Promise<boolean> {
        L.debug("canParsed");

        let extDriver = await this.engine.getExtDriver();

        try {
            await extDriver.waitLocated("//body[@axt-parser-timing]", Timeouts.WaitParsedPage);
            return Promise.resolve(true);
        } catch (e) {
        }

        return Promise.resolve(false);
    }

    protected async findLoginFormInFrames(): Promise<LoginForm | undefined> {
        L.debug("findLoginFormInFrames");

        let driver = await this.engine.getDriver();

        var loginForm: LoginForm | undefined = undefined;

        try {
            for (let iframe of await driver.findElements(By.xpath("//iframe"))) {
                try {
                    L.trace(`switch to '${await iframe.getId()}'`);
                    await driver.switchTo().frame(iframe);

                    loginForm = await this.findLoginForm(iframe);

                    L.trace("switch to 'root'");
                    await driver.switchTo().parentFrame();

                    if (loginForm !== undefined) {
                        break;
                    }
                } catch (e) {
                }
            }
        } catch (e) {
        }

        return Promise.resolve(loginForm);
    }

    protected async findLoginForm(iframe: WebElement | undefined): Promise<LoginForm | undefined> {
        L.debug("findLoginForm");

        let extDriver = await this.engine.getExtDriver();

        let result: LoginForm | undefined = undefined;
        try {
            let body = await extDriver.waitLocated("//body[@axt-parser-timing]", Timeouts.WaitParsedPage);
            try {
                let loginForm = await body.findElement(By.xpath("//*[@axt-form-type='login']"));
                if (loginForm !== undefined) {
                    result = new LoginForm();
                    let login = await loginForm.findElement(By.xpath("//input[@axt-input-type='login']"));
                    if (login !== undefined) {
                        result.loginInput = new Input(login, iframe);
                    }
                    let password = await loginForm.findElement(By.xpath("//input[@axt-input-type='password']"));
                    if (password !== undefined) {
                        result.passwordInput = new Input(password, iframe);
                    }
                    let loginButton = await loginForm.findElement(By.xpath("//*[@axt-button-type='login']"));
                    if (loginButton !== undefined) {
                        result.loginButton = new Button(loginButton, iframe);
                    }
                    let nextButton = await loginForm.findElement(By.xpath("//*[@axt-button-type='next']"));
                    if (nextButton !== undefined) {
                        result.nextButton = new Button(nextButton, iframe);
                    }
                }
            } catch (e) {
            }
        } catch (e) {
        }

        return Promise.resolve(result);
    }

    protected async enterToInput(
        text: string,
        input: Input,
        options:
            { attach: boolean } |
            { replace: boolean} |
            { attach: boolean, replace: boolean } |
            undefined = undefined): Promise<void> {

        L.debug("enterToInput");

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
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            await extDriver.switchToRootFrame();
            if (input.iframe !== undefined) {
                await driver.switchTo().frame(input.iframe);
            }

            let extInput = new WebElementExt(input.input);
            if (replace) {
                await extInput.webElement.clear();
            } else {
                let currentValue = await extInput.webElement.getAttribute("value");
                if (currentValue.length != 0) {
                    if (!attach) return Promise.resolve();
                }
            }

            await extInput.sendKeys(text);

            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("fail enter to input");
            return Promise.reject();
        }
    }

    protected async pressEnterOnInput(input: Input): Promise<void> {

        L.debug("pressEnterOnInput");

        try {
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            await extDriver.switchToRootFrame();
            if (input.iframe !== undefined) {
                await driver.switchTo().frame(input.iframe);
            }

            let extInput = new WebElementExt(input.input);
            await extInput.pressEnter();

            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("fail enter to input");
            return Promise.reject();
        }
    }

    protected async pressOnButton(button: Button): Promise<void> {

        L.debug("pressOnButton");

        try {
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            await extDriver.switchToRootFrame();
            if (button.iframe !== undefined) {
                await driver.switchTo().frame(button.iframe);
            }

            let extButton = new WebElementExt(button.button);
            await extButton.click();

            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("fail enter to input");
            return Promise.reject();
        }
    }

    protected async isEmptyInputValue(input: Input): Promise<boolean> {

        L.debug("isEmptyInputValue");

        try {
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            await extDriver.switchToRootFrame();
            if (input.iframe !== undefined) {
                await driver.switchTo().frame(input.iframe);
            }

            let extInput = new WebElementExt(input.input);
            let currentValue = await extInput.getValue(Timeouts.WaitExistValue);

            return Promise.resolve(currentValue.length === 0);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("fail enter to input");
            return Promise.reject();
        }
    }

    protected async checkInputValue(text: string, input: Input): Promise<boolean> {

        L.debug("checkInputValue");

        try {
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            await extDriver.switchToRootFrame();
            if (input.iframe !== undefined) {
                await driver.switchTo().frame(input.iframe);
            }

            let extInput = new WebElementExt(input.input);
            let currentValue = await extInput.getValue(Timeouts.WaitExistValue);

            return Promise.resolve(currentValue === text);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("fail enter to input");
            return Promise.reject();
        }
    }


    // logs ...

    protected async logButton(button: Button | undefined): Promise<void> {
        if (button === undefined) {
            L.trace("button: undefined");
            return Promise.resolve();
        }
        L.trace(`button: ${button.button} in iframe ${button.iframe === undefined ? 'root' : (await button.iframe.getId())}`);
        return Promise.resolve();
    }

    protected async logInput(input: Input | undefined): Promise<void> {
        if (input === undefined) {
            L.trace("input: undefined");
            return Promise.resolve();
        }
        L.trace(`input: ${input.input} in iframe ${input.iframe === undefined ? 'root' : (await input.iframe.getId())}`);
        return Promise.resolve();
    }

    protected async logLoginForm(form: LoginForm | undefined): Promise<void> {
        if (form === undefined) {
            L.trace("loginForm: undefined");
            return Promise.resolve();
        }
        L.trace("login:");
        await this.logInput(form.loginInput);
        L.trace("password:");
        await this.logInput(form.passwordInput);
        L.trace("login:");
        await this.logButton(form.loginButton);
        L.trace("next:");
        await this.logButton(form.nextButton);
        return Promise.resolve();
    }

    protected async logPage(page: Page | undefined): Promise<void> {
        if (page === undefined) {
            L.trace("page: undefined");
            return Promise.resolve();
        }
        L.trace("singin:");
        await this.logButton(page.singinButton);
        L.trace("login:");
        await this.logLoginForm(page.loginForm);
        L.trace(`is logged in: ${page.isLoggedIn}`);
        return Promise.resolve();
    }
}
