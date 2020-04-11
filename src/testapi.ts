import {IEngine} from "./engine/engine";
import {Actions, By, Key, until, WebElement} from "selenium-webdriver";
import {ICredential} from "./credentials";

import {testapiLogger as L} from "./common/log.config";
import {WebElementExt} from "./common/WebDriverExt";
import {inspect, log} from "util";


class LoginForm {
    iframe: WebElement | undefined = undefined;
    login: WebElement | undefined = undefined;
    password: WebElement | undefined = undefined;
    nextButton: WebElement | undefined = undefined;
    loginButton: WebElement | undefined = undefined;
}

class Page {
    singin: WebElement | undefined = undefined;
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

    public async checkWriteCredential(): Promise<void> {
        L.info("checkWriteCredential");

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        L.debug("clear all cookies");
        await driver.manage().deleteAllCookies();

        L.debug(`open new tab with: ${this.credential.url}`);
        await extDriver.OpenUrlOnNewTab(this.credential.url);

        while (true) {
            // try {
            //     L.debug("parse page");
            //     let page = await this.parse();
            //
            // } catch (e) {
            // }
            //
            // break;

            L.debug("parse page");
            await this.parse();

            L.debug("check page structure");
            if (await this.hasLoginForm()) {
                L.debug("page has login form");
                if (await this.hasLogin() && await this.hasPassword()) {
                    L.debug("login form has login and password inputs");

                    await this.enterLogin(this.credential.login);
                    await this.enterPassword(this.credential.password);
                } else if (await this.hasLogin()) {
                    L.debug("login form has only login input");

                    await this.enterLogin(this.credential.login);

                    if (await this.hasLoginButton()) {
                        await this.clickLoginButton();
                    } else if (await this.hasNextButton()) {
                        await this.clickNextButton();
                    } else {
                        await this.pressEnterOnLogin();
                    }

                    await driver.sleep(500);
                    continue;
                } else if (await this.hasPassword()) {
                    L.debug("login form has only password input");

                    await this.enterPassword(this.credential.login);
                }

                try {
                    L.debug("try engine process before login");
                    await this.engine.processBeforeLogin();
                    //TODO: add report: manual saved before logged in
                } catch (UnsupportedOperationError) {
                    L.debug("engine process before login not supported");

                    if (await this.hasLoginButton()) {
                        await this.clickLoginButton();
                    } else {
                        await this.pressEnterOnPassword();
                    }

                    await driver.sleep(500);
                    continue;
                }
            } else if (await this.isLoggedIn()) {

                try {
                    L.debug("try engine process after login");

                    await this.engine.processAfterLogin();
                    //TODO: add report: manual saved after logged in
                } catch (UnsupportedOperationError) {
                    L.debug("engine process after login not supported");

                    //TODO: check auto save after logged in
                    //TODO: add report: auto saved after logged in
                }

                break;
            }
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
    //*[@axt-form-type="login"]
    //*[@axt-input-type="login"]
    //*[@axt-input-type="password"]
    //*[@axt-button-type="login"]
    //*[@axt-button-type="next"]
    //*[@axt-button-type="singin"]
    protected async parsePage(): Promise<Page> {
        L.debug("parse");

        try {
            let driver = await this.engine.getDriver();

            let page = new Page();

            let iframes = await driver.findElements(By.xpath("//iframe"));
            for (let iframe of iframes) {
                let loginForm = new LoginForm();
                try {
                    await driver.switchTo().frame(iframe);
                    await driver.wait(until.elementLocated(By.xpath("//body[@axt-parser-timing]")), 5000);
                    loginForm.iframe = iframe;
                    let loginFormElm = await driver.wait(until.elementLocated(By.xpath("//*[@axt-form-type='login']")), 1000);
                    loginForm.login = await loginFormElm.findElement(By.xpath("//input[@axt-input-type='login']"));
                    loginForm.password = await loginFormElm.findElement(By.xpath("//input[@axt-input-type='password']"));
                    loginForm.loginButton = await loginFormElm.findElement(By.xpath("//*[@axt-button-type='login']"));
                    loginForm.nextButton = await loginFormElm.findElement(By.xpath("//*[@axt-button-type='next']"));
                } catch (e) {
                }
                if (loginForm.iframe != undefined) {
                    return Promise.resolve(page);
                }
            }
            //
            // await driver.switchTo().parentFrame();
            //
            // L.info(`parrent handle: ${await driver.getWindowHandle()}`);

            //let elm =

            return Promise.resolve(page);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("parse did not run");
            return Promise.reject();
        }
    }

    protected async parseCurrentFrame(): Promise<Page> {
        L.debug("parseCurrentFrame");

        try {
            let driver = await this.engine.getDriver();

            let page = new Page();

            let loginForm = new LoginForm();
            try {
                await driver.wait(until.elementLocated(By.xpath("//body[@axt-parser-timing]")), 5000);
                let loginFormElm = await driver.wait(until.elementLocated(By.xpath("//*[@axt-form-type='login']")), 1000);
                loginForm.login = await loginFormElm.findElement(By.xpath("//input[@axt-input-type='login']"));
                loginForm.password = await loginFormElm.findElement(By.xpath("//input[@axt-input-type='password']"));
                loginForm.loginButton = await loginFormElm.findElement(By.xpath("//*[@axt-button-type='login']"));
                loginForm.nextButton = await loginFormElm.findElement(By.xpath("//*[@axt-button-type='next']"));
            } catch (e) {
            }
            if (loginForm.iframe != undefined) {
                page.loginForm = loginForm;
                return Promise.resolve(page);
            }
            //
            // await driver.switchTo().parentFrame();
            //
            // L.info(`parrent handle: ${await driver.getWindowHandle()}`);

            //let elm =

            return Promise.resolve(page);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("parse did not run");
            return Promise.reject();
        }
    }


    //body[@axt-parser-timing]
    protected async parse(): Promise<void> {
        L.debug("parse");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//body[@axt-parser-timing]")), 5000);
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("parse did not run");
            return Promise.reject();
        }
    }

    //axt-form-type="login"
    protected async hasLoginForm(): Promise<boolean> {
        L.debug("hasLoginForm");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//*[@axt-form-type='login']")), 1000);
            return Promise.resolve(true);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login form not found");
            return Promise.resolve(false);
        }
    }

    //axt-input-type="login"
    protected async hasLogin(): Promise<boolean> {
        L.debug("hasLogin");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//input[@axt-input-type='login']")), 1000);
            return Promise.resolve(true);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login input not found");
            return Promise.resolve(false);
        }
    }

    protected async enterLogin(login: string, replace = false): Promise<void> {
        L.debug("enterLogin");

        try {
            let driver = await this.engine.getDriver();
            let empty = await this.isLoginEmpty();
            let loginElm = new WebElementExt(await driver.findElement(By.xpath("//input[@axt-input-type='login']")));
            if (!empty) {
                if (!replace) return Promise.resolve();
                await loginElm.webElement.sendKeys("");
            }
            await loginElm.sendKeys(login);
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login input not found");
            return Promise.reject();
        }
    }

    protected async pressEnterOnLogin(): Promise<void> {
        L.debug("pressEnterOnLogin");

        try {
            let driver = await this.engine.getDriver();
            let loginElm = new WebElementExt(await driver.findElement(By.xpath("//input[@axt-input-type='login']")));
            await loginElm.sendKeys(Key.RETURN);
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login input not found");
            return Promise.reject();
        }
    }

    protected async isLoginEmpty(): Promise<boolean> {
        L.debug("isLoginEmpty");

        try {
            let driver = await this.engine.getDriver();
            let text = await driver.findElement(By.xpath("//input[@axt-input-type='login']")).getAttribute("value");
            return Promise.resolve(text.length === 0);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login input not found");
            return Promise.resolve(false);
        }
    }

    protected async checkLogin(login: string): Promise<boolean> {
        L.debug("checkLogin");

        try {
            let driver = await this.engine.getDriver();
            let text = await driver.findElement(By.xpath("//input[@axt-input-type='login']")).getAttribute("value");
            return Promise.resolve(text === login);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login input not found");
            return Promise.resolve(false);
        }
    }

    //axt-input-type="password"
    protected async hasPassword(): Promise<boolean> {
        L.debug("hasPassword");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//input[@axt-input-type='password']")), 1000);
            return Promise.resolve(true);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("password input not found");
            return Promise.resolve(false);
        }
    }

    protected async enterPassword(password: string, replace = false): Promise<void> {
        L.debug("enterPassword");

        try {
            let driver = await this.engine.getDriver();
            let empty = await this.isPasswordEmpty();
            let passwordElm = new WebElementExt(await driver.findElement(By.xpath("//input[@axt-input-type='password']")));
            if (!empty) {
                if (!replace) return Promise.resolve();
                await passwordElm.webElement.sendKeys("");
            }
            await passwordElm.sendKeys(password);
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("password input not found");
            return Promise.reject();
        }
    }

    protected async pressEnterOnPassword(): Promise<void> {
        L.debug("pressEnterOnPassword");

        try {
            let driver = await this.engine.getDriver();
            let passwordElm = new WebElementExt(await driver.findElement(By.xpath("//input[@axt-input-type='password']")));
            await passwordElm.sendKeys(Key.RETURN);
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("password input not found");
            return Promise.reject();
        }
    }

    protected async isPasswordEmpty(): Promise<boolean> {
        L.debug("isPasswordEmpty");

        try {
            let driver = await this.engine.getDriver();
            let text = await driver.findElement(By.xpath("//input[@axt-input-type='password']")).getAttribute("value");
            return Promise.resolve(text.length === 0);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("password input not found");
            return Promise.resolve(false);
        }
    }

    protected async checkPassword(password: string): Promise<boolean> {
        L.debug("  checkPassword");

        try {
            let driver = await this.engine.getDriver();
            let text = await driver.findElement(By.xpath("//input[@axt-input-type='password']")).getAttribute("value");
            return Promise.resolve(text === password);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("password input not found");
            return Promise.resolve(false);
        }
    }

    //axt-button-type="login"
    protected async hasLoginButton(): Promise<boolean> {
        L.debug("hasLoginButton");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//*[@axt-button-type='login']")), 1000);
            return Promise.resolve(true);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login button not found");
            return Promise.resolve(false);
        }
    }

    protected async clickLoginButton(): Promise<void> {
        L.debug("clickLoginButton");

        try {
            let driver = await this.engine.getDriver();
            await driver.findElement(By.xpath("//*[@axt-button-type='login']")).click();
            // let button = await driver.findElement(By.xpath("//*[@axt-button-type='login']"));
            // await driver.actions().mouseDown(button);
            // await driver.sleep(100);
            // await driver.actions().mouseUp(button);
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login button not found");
            return Promise.reject();
        }
    }

    //axt-button-type="next"
    protected async hasNextButton(): Promise<boolean> {
        L.debug("hasNextButton");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//*[@axt-button-type='next']")), 1000);
            return Promise.resolve(true);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("next button not found");
            return Promise.resolve(false);
        }
    }

    protected async clickNextButton(): Promise<void> {
        L.debug("clickLoginButton");

        try {
            let driver = await this.engine.getDriver();
            await driver.findElement(By.xpath("//*[@axt-button-type='next']")).click();
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("login button not found");
            return Promise.reject();
        }
    }

    //axt-button-type="singin"
    protected async hasSigninButton(): Promise<boolean> {
        L.debug("hasSigninButton");

        try {
            let driver = await this.engine.getDriver();
            await driver.wait(until.elementLocated(By.xpath("//*[@axt-button-type='singin']")), 1000);
            return Promise.resolve(true);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("singin button not found");
            return Promise.resolve(false);
        }
    }

    protected async clickSignInButton(): Promise<void> {
        L.debug("clickSignInButton");

        try {
            let driver = await this.engine.getDriver();
            await driver.findElement(By.xpath("//*[@axt-button-type='singin']")).click();
            return Promise.resolve();
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("singin button not found");
            return Promise.reject();
        }
    }

    protected async isLoggedIn(): Promise<boolean> {
        L.debug("isLoggedIn");
        return Promise.resolve(true);
    }
}
