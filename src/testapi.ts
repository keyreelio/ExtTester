import {IEngine} from "./engine/engine";
import {By, error, Key, until, WebElement} from "selenium-webdriver";
import {ICredential} from "./credentials";

import {testapiLogger as L} from "./common/log.config";
import {WebElementExt} from "./common/WebDriverExt";
import {EReportResult, EReportTest, IReport} from "./report/report";
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

    public async checkWriteCredential(options: { useOnlyEnterButton: boolean } | undefined = undefined): Promise<void> {
        L.info("checkWriteCredential");

        var useOnlyEnterButton = false;
        if (options !== undefined) {
            if (options as { useOnlyEnterButton: boolean }) {
                useOnlyEnterButton = (<{ useOnlyEnterButton: boolean }>options).useOnlyEnterButton;
            }
        }

        let error: Error | undefined = undefined;

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        L.debug("clear all cookies");
        await driver.manage().deleteAllCookies();

        L.debug(`open new tab with: ${this.credential.url}`);
        await extDriver.openUrlOnNewTab(this.credential.url);

        try {
            var state: State = State.init;

            while (true) {
                L.debug("parse page");
                let page = await this.parsePage(ParseSearchMap[state]);

                L.debug("check page structure");
                if (page.singinButton !== undefined && page.loginForm === undefined) {
                    L.debug("page has singin button and hasn't login form");

                    await page.singinButton.button.click();

                    state = State.waitLoginForm;
                    continue;
                } else if (page.loginForm !== undefined) {
                    L.debug("page has login form");

                    if (page.loginForm.loginInput !== undefined && page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has login and password inputs");

                        await this.enterToInput(this.credential.login, page.loginForm.loginInput);
                        await this.enterToInput(this.credential.password, page.loginForm.passwordInput);
                    } else if (page.loginForm.passwordInput !== undefined) {
                        L.debug("login form has only password input");

                        await this.enterToInput(this.credential.password, page.loginForm.passwordInput);
                    } else if (page.loginForm.loginInput !== undefined) {
                        L.debug("login form has only login input");

                        await this.enterToInput(this.credential.login, page.loginForm.loginInput);

                        if (page.loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                            await this.pressOnButton(page.loginForm.loginButton);
                        } else if (page.loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                            await this.pressOnButton(page.loginForm.nextButton);
                        } else {
                            await this.enterToInput(Key.RETURN, page.loginForm.loginInput, {attach: true});
                        }

                        state = State.waitSecondLoginForm;
                        continue;
                    }

                    try {
                        L.debug("try engine process before login");

                        await this.engine.processBeforeLogin();

                        L.info("credential SAVED as manual before logged in");
                        await this.report.setResult(EReportResult.success, EReportTest.saveManualBeforeLoggedIn);
                    } catch (e) {
                        if (e as UnsupportedOperationError) {
                            L.debug("engine process before login not supported");

                            if (page.loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                                await this.pressOnButton(page.loginForm.loginButton);
                            } else if (page.loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                                await this.pressOnButton(page.loginForm.nextButton);
                            } else if (page.loginForm.passwordInput !== undefined) {
                                await this.enterToInput(Key.RETURN, page.loginForm.passwordInput, {attach: true});
                            }

                            state = State.waitLoggedIn;
                            continue;
                        } else {
                            L.debug("engine process before login is failed");

                            L.info("credential FAILED SAVE before logged in");
                            await this.report.setResult(EReportResult.fail, EReportTest.saveManualBeforeLoggedIn);
                            error = new Error();
                        }
                    }
                } else if (page.isLoggedIn) {
                    try {
                        L.debug("try engine process after login");

                        await this.engine.processAfterLogin();

                        L.info("credential SAVED as manual after logged in");
                        await this.report.setResult(EReportResult.success, EReportTest.saveManualAfterLoggedIn);
                    } catch (e) {
                        if (e instanceof UnsupportedOperationError) {
                            L.debug("engine process after login not supported");

                            L.info("credential MAYBE SAVED as auto after logged in");
                            await this.report.setResult(EReportResult.success, EReportTest.saveAutoAfterLoggedIn);
                        } else {
                            L.debug("engine process after login is failed");

                            L.info("credential FAILED SAVE after logged in");
                            await this.report.setResult(EReportResult.fail, EReportTest.saveManualAfterLoggedIn);
                            error = new Error();
                        }
                    }
                }

                break;
            }
        } catch (e) {
            error = e;
        }

        //L.debug("close current tab");
        //await extDriver.closeCurrentTab();

        if (error !== undefined) {
            return Promise.reject(error);
        } else {
            return Promise.resolve();
        }
    }

    public async checkReadCredential(): Promise<void> {

        let driver = await this.engine.getDriver();

        await driver.manage().deleteAllCookies();

        // await this.open(this.credential.url)
        // if (!await this.hasOpened()) return Promise.reject();
        //
        // if (!await this.parse()) return Promise.reject();
        // if (await this.hasLoginForm()) {
        //     if (await this.hasLogin() && await this.hasPassword()) {
        //         await driver.sleep(1000);
        //         await this.checkLogin(this.credential.login) && await this.checkPassword(this.credential.password);
        //     }
        //     //TODO: add support login forms with two and etc steps
        // }

        return Promise.resolve();
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

        var delay = 0;
        while (true) {
            let page = new Page();

            await extDriver.swithToRootFrame();

            var loginForm = await this.findLoginForm(undefined);
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

            if (this.credential.timeout > 0 && delay < this.credential.timeout) {
                await driver.sleep(500);
                delay += 500;
                continue;
            }

            return Promise.reject();
        }
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
                    // if (loginForm === undefined) {
                    //     loginForm = await this.findLoginFormInFrames();
                    // }

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

        let driver = await this.engine.getDriver();

        let loginForm: LoginForm | undefined = undefined;
        try {
            let bodyElm = await driver.wait(until.elementLocated(By.xpath("//body[@axt-parser-timing]")), 500);
            let loginFormElm = await this.findElement(bodyElm, "//*[@axt-form-type='login']");
            if (loginFormElm !== undefined) {
                loginForm = new LoginForm();
                let loginElm = await this.findElement(loginFormElm, "//input[@axt-input-type='login']");
                if (loginElm !== undefined) {
                    loginForm.loginInput = new Input(loginElm, iframe);
                }
                let passwordElm = await this.findElement(loginFormElm, "//input[@axt-input-type='password']");
                if (passwordElm !== undefined) {
                    loginForm.passwordInput = new Input(passwordElm, iframe);
                }
                let loginButtonElm = await this.findElement(loginFormElm, "//*[@axt-button-type='login']");
                if (loginButtonElm !== undefined) {
                    loginForm.loginButton = new Button(loginButtonElm, iframe);
                }
                let nextButtonElm = await this.findElement(loginFormElm, "//*[@axt-button-type='next']");
                if (nextButtonElm !== undefined) {
                    loginForm.nextButton = new Button(nextButtonElm, iframe);
                }
            }
        } catch (e) {
        }

        return Promise.resolve(loginForm);
    }

    protected async findElement(rootElement: WebElement, xpath: string): Promise<WebElement | undefined> {
        try {
            return Promise.resolve(await rootElement.findElement(By.xpath(xpath)));
        } catch (e) {
            return Promise.resolve(undefined);
        }
    }

    protected async enterToInput(
        text: string,
        input: Input,
        options: {
            attach: boolean,
            replace: boolean
        } | {
            attach: boolean,
        } | {
            replace: boolean,
        } | undefined = undefined): Promise<void> {

        L.debug("enterToInput");

        var attach = false;
        var replace = false;
        if (options !== undefined) {
            if (options as { attach: boolean }) {
                attach = (<{ attach: boolean }>options).attach;
            } else if (options as { replace: boolean }) {
                replace = (<{ replace: boolean }>options).replace;
            } else if (options as { attach: boolean, replace: boolean }) {
                attach = (<{ attach: boolean, replace: boolean }>options).attach;
                replace = (<{ force: boolean, replace: boolean }>options).replace;
            }
        }

        try {
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            let inputElm = new WebElementExt(input.input);

            await extDriver.swithToRootFrame();
            if (input.iframe !== undefined) {
                await driver.switchTo().frame(input.iframe);
            }

            if (replace) {
                await inputElm.webElement.clear();
            } else {
                let currentValue = await inputElm.webElement.getAttribute("value");
                if (currentValue.length != 0) {
                    if (!attach) return Promise.resolve();
                }
            }

            await inputElm.sendKeys(text);

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

            await extDriver.swithToRootFrame();
            if (button.iframe !== undefined) {
                await driver.switchTo().frame(button.iframe);
            }

            await button.button.click();

            return Promise.resolve();
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
