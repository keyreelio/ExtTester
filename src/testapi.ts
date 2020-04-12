import {IEngine} from "./engine/engine";
import {By, error, Key, until, WebElement} from "selenium-webdriver";
import {ICredential} from "./credentials";

import {testapiLogger as L} from "./common/log.config";
import {WebElementExt} from "./common/WebDriverExt";
import UnsupportedOperationError = error.UnsupportedOperationError;


class Button {
    iframe: WebElement | undefined = undefined;
    button: WebElement;

    public constructor(button: WebElement, iframe: WebElement | undefined) {
        this.button = button;
        this.iframe = iframe;
    }
}

class Input {
    iframe: WebElement | undefined = undefined;
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

export class TestAPI {

    engine: IEngine;
    credential: ICredential;

    constructor(engine: IEngine, credential: ICredential) {
        this.engine = engine;
        this.credential = credential;
    }

    public async checkWriteCredential(options: {useOnlyEnterButton: boolean} | undefined = undefined): Promise<void> {
        L.info("checkWriteCredential");

        var useOnlyEnterButton = false;
        if (options !== undefined) {
            if (options as {useOnlyEnterButton: boolean}) {
                useOnlyEnterButton = (<{useOnlyEnterButton: boolean}>options).useOnlyEnterButton;
            }
        }

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        L.debug("clear all cookies");
        await driver.manage().deleteAllCookies();

        L.debug(`open new tab with: ${this.credential.url}`);
        await extDriver.openUrlOnNewTab(this.credential.url);

        while (true) {
            L.debug("parse page");
            let page = await this.parsePage();

            L.debug("check page structure");
            if (page.singinButton !== undefined && page.loginForm === undefined) {
                L.debug("page has singin button and hasn't login form");

                await page.singinButton.button.click();

                await driver.sleep(500);
                continue;
            } else if (page.loginForm !== undefined) {
                L.debug("page has login form");

                if (page.loginForm.loginInput !== undefined && page.loginForm.passwordInput !== undefined) {
                    L.debug("login form has login and password inputs");

                    await this.enterToInput(this.credential.login, page.loginForm.loginInput);
                    await this.enterToInput(this.credential.password, page.loginForm.passwordInput);
                } else if (page.loginForm.loginInput !== undefined) {
                    L.debug("login form has only login input");

                    await this.enterToInput(this.credential.login, page.loginForm.loginInput);

                    if (page.loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                        await page.loginForm.loginButton.button.click();
                    } else if (page.loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                        await page.loginForm.nextButton.button.click();
                    } else {
                        await this.enterToInput(Key.RETURN, page.loginForm.loginInput, {attach: true});
                    }

                    await driver.sleep(500);
                    continue;
                } else if (page.loginForm.passwordInput !== undefined) {
                    L.debug("login form has only password input");

                    await this.enterToInput(this.credential.password, page.loginForm.passwordInput);
                }

                try {
                    L.debug("try engine process before login");

                    await this.engine.processBeforeLogin();
                    //TODO: add report: manual saved before logged in
                    L.warn(`!!! '${await this.engine.getEngineName()}': credential SAVED as manual before logged in !!!`);
                } catch (e) {
                    if (e as UnsupportedOperationError) {
                        L.debug("engine process before login not supported");

                        if (page.loginForm.loginButton !== undefined && !useOnlyEnterButton) {
                            await page.loginForm.loginButton.button.click();
                        } else if (page.loginForm.nextButton !== undefined && !useOnlyEnterButton) {
                            await page.loginForm.nextButton.button.click();
                        } else if (page.loginForm.passwordInput !== undefined) {
                            await this.enterToInput(Key.RETURN, page.loginForm.passwordInput, {attach: true});
                        }

                        await driver.sleep(500);
                        continue;
                    } else {
                        L.debug("engine process before login is failed");

                        //TODO: add report: failed save after logged in
                        L.warn(`!!! '${await this.engine.getEngineName()}': credential FAILED SAVE before logged in !!!`);

                        return Promise.reject(new Error());
                    }
                }
            } else if (page.isLoggedIn) {

                try {
                    L.debug("try engine process after login");

                    await this.engine.processAfterLogin();

                    //TODO: add report: manual saved after logged in
                    L.warn(`!!! '${await this.engine.getEngineName()}': credential SAVED as manual after logged in !!!`);
                } catch (e) {
                    if (e instanceof UnsupportedOperationError) {
                        L.debug("engine process after login not supported");

                        //TODO: check auto save after logged in
                        //TODO: add report: auto saved after logged in
                        L.warn(`!!! '${await this.engine.getEngineName()}': credential MAYBE SAVED as auto after logged in !!!`);
                    } else {
                        L.debug("engine process after login is failed");

                        //TODO: add report: failed save after logged in
                        L.warn(`!!! '${await this.engine.getEngineName()}': credential FAILED SAVE after logged in !!!`);

                        return Promise.reject(new Error());
                    }
                }
            }

            break;
        }

        return Promise.resolve();
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

    public async dropCredential(): Promise<void> {
        return Promise.resolve();
    }


    //body[@axt-parser-timing]
    //  *[@axt-form-type="login"]
    //      input[@axt-input-type="login"]
    //      input[@axt-input-type="password"]
    //      *[@axt-button-type="login"]
    //      *[@axt-button-type="next"]
    //  *[@axt-button-type="singin"]
    protected async parsePage(): Promise<Page> {
        L.debug("parsePage");

        let driver = await this.engine.getDriver();

        let page = new Page();

        var delay = 0;
        while (true) {
            var loginForm = await this.findLoginForm();
            if (loginForm === undefined) {
                loginForm = await this.findLoginFormInFrames();
            }
            page.loginForm = loginForm;

            if (page.loginForm === undefined && page.singinButton === undefined) {
                if (this.credential.timeout > 0 && delay < this.credential.timeout) {
                    await driver.sleep(500);
                    delay += 500;
                    continue;
                }
                page.isLoggedIn = true;
                break;
            }
            break;
        }

        return Promise.resolve(page);
    }

    protected async findLoginFormInFrames(): Promise<LoginForm | undefined> {
        L.debug("findLoginFormInFrames");

        let driver = await this.engine.getDriver();

        var loginForm: LoginForm | undefined = undefined;

        try {
            for (let iframe of await driver.findElements(By.xpath("//iframe"))) {
                try {
                    await driver.switchTo().frame(iframe);

                    loginForm = await this.findLoginForm(iframe);
                    if (loginForm === undefined) {
                        loginForm = await this.findLoginFormInFrames();
                    }

                    if (loginForm !== undefined) {
                        await driver.switchTo().parentFrame();
                        break;
                    }
                } catch (e) {
                }
            }
        } catch (e) {
        }

        return Promise.resolve(loginForm);
    }

    protected async findLoginForm(iframe: WebElement | undefined = undefined): Promise<LoginForm | undefined> {
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

        L.debug("enterLogin");

        var attach = false;
        var replace = false;
        if (options !== undefined) {
            if (options as {attach: boolean}) {
                attach = (<{attach: boolean}>options).attach;
            } else if (options as {replace: boolean}) {
                replace = (<{replace: boolean}>options).replace;
            } else if (options as {attach: boolean, replace: boolean}) {
                attach = (<{attach: boolean, replace: boolean}>options).attach;
                replace = (<{force: boolean, replace: boolean}>options).replace;
            }
        }

        try {
            let driver = await this.engine.getDriver();
            let extDriver = await this.engine.getExtDriver();

            let inputElm = new WebElementExt(input.input);

            if (input.iframe === undefined) {
                await extDriver.swithToRootFrame();
            } else {
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
}
