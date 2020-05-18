import {parserLogger as L} from "../common/log.config";
import {By, WebElement} from "selenium-webdriver";
import {Timeouts} from "../common/timeouts";
import {Button} from "../common/button";
import {Input} from "../common/input";
import {IEngine} from "../engine/engine";


export class LoginForm {
    loginInput: Input | undefined = undefined;
    passwordInput: Input | undefined = undefined;
    nextButton: Button | undefined = undefined;
    loginButton: Button | undefined = undefined;
}

export class Page {
    duration: number = 0;
    didNotParse: boolean = false;
    singinButton: Button | undefined = undefined;
    loginForm: LoginForm | undefined = undefined;
    isLoggedIn: boolean = false;
}


export class Parser {
    public static SearchFlagSingInButton: number = 0x01;
    public static SearchFlagLoginOnForm: number = 0x02;
    public static SearchFlagPasswordOnForm: number = 0x04;
    public static SearchFlagLoggedIn: number = 0x08;


    //*[@axt-button="login"]
    //
    //   or
    //
    //body[@axt-parser-timing]
    //  *[@axt-form-type="login"]
    //      input[@axt-input-type="login"]
    //      input[@axt-input-type="password"]
    //      *[@axt-button-type="login"]
    //      *[@axt-button-type="next"]
    //  *[@axt-button-type="singin"]

    engine: IEngine;


    public constructor(engine: IEngine) {
        this.engine = engine;
    }

    public async parsePage(searchFlag: number, timeout: number): Promise<Page> {
        L.debug("parsePage");

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        let iframe: WebElement | undefined = undefined;
        let iframes: WebElement[] | undefined = undefined;

        await extDriver.switchToRootFrame();

        let startTime = new Date();

        let page: Page = new Page();
        while (true) {
            let waitTimeout = iframe === undefined ? Timeouts.WaitParsedPage : Timeouts.WaitParsedPageMin;

            page.didNotParse = false;
            try {
                L.trace("can parsed or scanned page");
                await Promise.race([
                    this.canScannedPage(waitTimeout, page.singinButton !== undefined),
                    this.canParsedPage(waitTimeout, page.loginForm !== undefined)
                ]);
            } catch (e) {
                L.trace(`${e}`);
                page.didNotParse = true;
            }

            let done: boolean = false;

            if (this.checkFlag(searchFlag, Parser.SearchFlagPasswordOnForm)
                || this.checkFlag(searchFlag, Parser.SearchFlagLoginOnForm)) {

                L.trace("get login form");
                page.loginForm = page.loginForm !== undefined ? page.loginForm : await this.findLoginForm(iframe);
                if (this.checkFlag(searchFlag, Parser.SearchFlagLoginOnForm)) {
                    done = done || (page.loginForm !== undefined && page.loginForm.loginInput !== undefined);
                } else if (page.loginForm !== undefined) {
                    page.loginForm.loginInput = undefined;
                }
                if (this.checkFlag(searchFlag, Parser.SearchFlagPasswordOnForm)) {
                    done = done || (page.loginForm !== undefined && page.loginForm.passwordInput !== undefined);
                } else if (page.loginForm !== undefined) {
                    page.loginForm.passwordInput = undefined;
                }
            }

            if (!done) {
                if (this.checkFlag(searchFlag, Parser.SearchFlagSingInButton)) {
                    L.trace("get singin button");
                    page.singinButton = page.singinButton !== undefined ? page.singinButton : await this.findSinginButton(iframe);
                    done = done || (page.singinButton !== undefined);
                } else {
                    page.singinButton = undefined;
                }

                iframes = iframes !== undefined ? iframes : await driver.findElements(By.xpath("//iframe"));
                if (iframes !== undefined && iframes.length > 0) {
                    iframe = iframes.shift();
                    if (iframe !== undefined) {
                        await extDriver.switchToRootFrame();
                        try {
                            L.trace(`switch to '${await iframe.getId()}'`);
                            await driver.switchTo().frame(iframe);
                            continue;
                        } catch (e) {
                            L.trace(`switch to iframe error: ${e}`);
                        }
                    }
                }

                if (this.checkFlag(searchFlag, Parser.SearchFlagLoggedIn)) {
                    if (page.loginForm === undefined && page.singinButton === undefined) {
                        page.isLoggedIn = true;
                    }
                    done = done || page.isLoggedIn;
                }
            }

            if (done) {
                L.trace("----------------------------------");
                await this.logPage(page);
                L.trace("----------------------------------");

                break;
            }

            let nowTime = new Date();
            let delta = nowTime.getTime() - startTime.getTime();
            if (timeout > 0 && delta <= timeout) {
                page = new Page();
                iframe = undefined;
                iframes = undefined;
                await extDriver.switchToRootFrame();
                continue;
            }

            break;
        }

        return Promise.resolve(page);
    }

    protected async canParsedPage(timeout: number, skip: boolean): Promise<void> {
        if (skip) return Promise.resolve();

        let extDriver = await this.engine.getExtDriver();
        await extDriver.waitLocated("//body[@axt-parser-timing]", timeout);

        return Promise.resolve();
    }

    protected async canScannedPage(timeout: number, skip: boolean): Promise<void> {
        if (skip) return Promise.resolve();

        let extDriver = await this.engine.getExtDriver();
        await extDriver.waitLocated("//*[@axt-button='login']", timeout);

        return Promise.resolve();
    }

    protected async findSinginButton(iframe: WebElement | undefined): Promise<Button | undefined> {
        let driver = await this.engine.getDriver();

        let button: Button | undefined = undefined;
        try {
            let buttonElm = await driver.findElement(By.xpath("//*[@axt-button='login']"));
            if (buttonElm !== undefined) {
                button = new Button(buttonElm, iframe);
            }
        } catch (e) {
        }

        L.trace(`finded singin button: ${button}`);

        return Promise.resolve(button);
    }

    protected async findLoginForm(iframe: WebElement | undefined): Promise<LoginForm | undefined> {
        let driver = await this.engine.getDriver();

        let result: LoginForm | undefined = undefined;
        try {
            let body = await driver.findElement(By.xpath("//body[@axt-parser-timing]"));
            try {
                await driver.sleep(100);
                let loginForm = await body.findElement(By.xpath("//*[@axt-form-type='login']"));
                if (loginForm !== undefined) {
                    await driver.sleep(100);
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

        L.trace(`finded login form: ${result}`);

        return Promise.resolve(result);
    }


    protected checkFlag(flags: number, flag: number): boolean {
        return (flags & flag) === flag;
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