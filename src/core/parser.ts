import {parserLogger as L} from "../common/log.config";
import {By, WebElement} from "selenium-webdriver";
import {Timeouts} from "../common/timeouts";
import {Button} from "../common/button";
import {Input} from "../common/input";
import {IEngine} from "../engine/engine";
import fs from "fs";
import {EResultType} from "./EResultType";


export class LoginForm {
    loginInput: Input | undefined = undefined;
    passwordInput: Input | undefined = undefined;
    nextButton: Button | undefined = undefined;
    loginButton: Button | undefined = undefined;
}

export class Page {
    duration: number = 0;
    isNotParsed: boolean = false;
    signinButton: Button | undefined = undefined;
    loginForm: LoginForm | undefined = undefined;
    isLoggedIn: boolean | undefined = undefined;
    error: EResultType | undefined = undefined;
}

let search_buttons_module = fs.readFileSync("./src/browser/searchButtons.js", "utf8");

export class Parser {
    public static SearchFlagSignInButton: number = 0x01;
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
    //  *[@axt-button-type="signin"]

    engine: IEngine;


    public constructor(engine: IEngine) {
        this.engine = engine;
    }


    public async parsePage(timeout: number, isDone: boolean = false): Promise<Page> {
        L.trace(`start parsePage(timeout:${timeout}, isDone:${isDone})`);

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        let startTime = new Date();
        var page: Page = new Page();
        var status: EResultType = EResultType.unknownError;

        while (true) {
            try {
                L.debug("Search login and registration forms...");
                let found = await this.searchForms(
                    undefined,
                    page,
                    Timeouts.WaitParsedPageMin
                );
                L.trace(`1: page.loginForm = ${page.loginForm}`)

                status = await this.scanButtons(page, Timeouts.WaitParsedPage);
                if (EResultType[status].endsWith('Error')) {
                    if (status == EResultType.captchaError) {
                        L.debug(`wait and repeat page scanning (for a limited time: ${timeout*5})`);

                        let captchaNowTime = new Date();
                        let delta = captchaNowTime.getTime() - startTime.getTime();
                        if (timeout > 0 && delta <= timeout * 5) {
                            L.trace("restart page parsing...");
                            page = new Page();
                            continue;
                        } else {
                            page.isNotParsed = true;
                            break;
                        }
                    } else {
                        L.warn(`Page loading error: ${EResultType[status]}. Quit...`);
                        page.isNotParsed = true;
                        break;
                    }
                }

                if (isDone && page.isLoggedIn === false) break;

                // if (page.loginForm != null) {
                //     L.trace(`1: login = ${page.loginForm.loginInput}`);
                //     L.trace(`1: password = ${page.loginForm.passwordInput}`);
                //     L.trace(`1: login button = ${page.loginForm.loginButton}`);
                //
                //    if ( page.loginForm.loginInput != null) {
                //        let ifrm = page.loginForm.loginInput.iframe;
                //        L.trace(`1: page.loginForm.iframe = ${ ifrm != null ? ifrm.getId : null}`);
                //    }
                // }

                //if (isDone && page.isLoggedIn === false) break;

                if (!found) {
                    // login form was not found on the root iframe, try to search it in
                    // the second level iframes:
                    let iframes: WebElement[] | undefined =
                        await driver.findElements(By.css("iframe"));
                    if (iframes != null) {
                        for (let frame of iframes) {
                            let found = await this.searchForms(
                                frame,
                                page,
                                Timeouts.WaitParsedPageMin
                            );

                            // L.trace(`2: page.loginForm = ${page.loginForm}`)
                            // if (page.loginForm != null) {
                            //     L.trace(`1: login = ${page.loginForm.passwordInput}`);
                            //     L.trace(`1: password = ${page.loginForm.loginInput}`);
                            //     L.trace(`1: login button = ${page.loginForm.loginButton}`);
                            //
                            //     if (page.loginForm.loginInput != null) {
                            //         let ifrm = page.loginForm.loginInput.iframe;
                            //         L.trace(`2: page.loginForm.iframe = ${ ifrm != null ? ifrm.getId : null}`);
                            //    }
                            // }
                            if (found) {
                                // login form was found! Stop scanning the iframes
                                break;
                            }

                            if (isDone && page.isLoggedIn === false) break;
                        }
                    }
                }
            } catch (e) {
                L.error("scanPage error", e);
                return Promise.reject(e);
            }
            break;
        }

        L.trace("----------------------------------");
        await this.logPage(page);
        L.trace("----------------------------------");

        return Promise.resolve(page);
    }

    /**
     *  Search login and registration forms. Fill page.loginForm and/or
     *  page.hasRegForm fields if respective forms were found
     *
     * @param iframe - iframe where to search the forms.
     * @param page - page where to save found forms
     * @param timeout - timeout for waiting for the body@axt-parser-timing attribute
     *
     * @return boolean - true: login form was found
     */
    protected async searchForms(
        iframe: WebElement | undefined,
        page: Page,
        timeout: number
    ): Promise<boolean> {
        L.trace(`searchForms: Search login|reg forms (timeout:${timeout})...`);
        L.trace(`PARAM iframe = ${iframe}`);
        L.trace(`PARAM page = ${page}`);
        L.trace(`PARAM timeout = ${timeout}`);

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();

        try {
            await extDriver.switchToRootFrame();

            if (iframe != null) await driver.switchTo().frame(iframe);

            await extDriver.waitLocated("body[axt-parser-timing]", timeout);

            if (page.loginForm == null) {
                page.loginForm = await this.findLoginForm(iframe);
            }

            var hasRegForm = false;
            if (page.loginForm == null) {
                // check registration forms only when login form is not found in the current
                // iframe
                hasRegForm = await this.findRegForm();
            }

            if (page.loginForm != null || hasRegForm) {
                page.duration = Math.max(page.duration, await this.getParserDuration());
                page.isLoggedIn = false;
            }
        } catch (e) {}

        return Promise.resolve( page.loginForm != null );
    }

    protected async scanButtons(page: Page, timeout: number): Promise<EResultType> {
        L.debug(`Scan page for Menu/Signin buttons (timeout:${timeout})...`);

        let driver = await this.engine.getDriver();
        let extDriver = await this.engine.getExtDriver();
        await extDriver.switchToRootFrame();

        let r = await driver.executeScript(search_buttons_module) as Array<string>;
        let scanResult = r.map( (type: string) => (<any>EResultType)[type] );
        L.trace(`Scanner result: [${r}]`);

        var result = EResultType.notFound;
        var buttons: WebElement[];
        if (scanResult.includes(EResultType.loginButton)) {
            buttons = await driver.findElements(
                By.css("*[axt-button=login]")
            )

            L.trace(`Found ${buttons.length} "Login" buttons}`);
            if (buttons.length > 0) {
                page.isLoggedIn = false;
                for (let button of buttons) {
                    let attr = await button.getAttribute("axt-clicked");
                    L.trace(`axt-clicked:1 attr = ${attr}`);
                    if (attr == null) {
                        // button was not clicked and not 'login' button from
                        // a login form
                        page.signinButton = new Button(button);
                        page.error = undefined;
                        result = EResultType.success;
                        break;
                    }
                }
            } else {
                page.isLoggedIn = true;
            }
        }

        if (page.signinButton == null && scanResult.includes(EResultType.accountButton)) {
            buttons = await driver.findElements(
                By.css("*[axt-button=account]")
            )
            L.trace(`Found ${buttons.length} "Menu" buttons`);
            for (let button of buttons) {
                let attr = await button.getAttribute("axt-clicked");
                L.trace(`axt-clicked:2 attr = ${attr}`);
                if (attr == null) { // button was not clicked
                    page.signinButton = new Button(button);
                    page.error = undefined;
                    result = EResultType.success;
                    break;
                }
            }
        }

        if (page.signinButton == null && r.some( (e) => e.endsWith('Error'))) {
            // errors
            let errName = r.filter( (e) => e.endsWith('Error'))[0];
            result = (<any>EResultType)[errName];
            page.error = result;
            page.isLoggedIn = false;
         }

        if (r.length == 0) {
           // found nothing
           page.isLoggedIn = true;
        }

        return Promise.resolve(result);
    }


    protected async findLoginForm(
        iframe: WebElement | undefined
    ): Promise<LoginForm | undefined> {
        let driver = await this.engine.getDriver();

        let result: LoginForm | undefined = undefined;
        try {
            let body = await driver.findElement(
                By.css("body[axt-parser-timing]")
            );

            try {
                await driver.sleep(100);
                let loginForm = await body.findElement(
                    By.css("*[axt-form-type=login]")
                );
                if (loginForm !== undefined) {
                    await driver.sleep(100);
                    result = new LoginForm();
                    let login = await loginForm.findElement(
                        By.css("input[axt-input-type=login]")
                    );
                    if (login !== undefined) {
                        result.loginInput = new Input(login, iframe);
                    }
                    let password = await loginForm.findElement(
                        By.css("input[axt-input-type=password]")
                    );
                    if (password !== undefined) {
                        result.passwordInput = new Input(password, iframe);
                    }
                    let loginButton = await loginForm.findElement(
                        By.css("*[axt-button-type=login]")
                    );
                    if (loginButton !== undefined) {
                        result.loginButton = new Button(loginButton, iframe);
                    }
                    let nextButton = await loginForm.findElement(
                        By.css("*[axt-button-type=next]")
                    );
                    if (nextButton !== undefined) {
                        result.nextButton = new Button(nextButton, iframe);
                    }
                }
            } catch (e) {}
        } catch (e) {}

        // if (result != null) {
        //     L.trace(`Found login form: ${result}`);
        // } else {
        //     L.trace(`Login form is not found`);
        // }
        return Promise.resolve(result);
    }

    protected async findRegForm(): Promise<boolean> {
        let driver = await this.engine.getDriver();
        let result: boolean = false;
        let body = await driver.findElement(
            By.css("body[axt-parser-timing]")
        );

        try {
            await driver.sleep(100);
            let regForm = await body.findElement(
                By.css("*[axt-form-type=registration]")
            );

            result = (regForm !== undefined)
        } catch (e) {}

        return Promise.resolve(result);
    }

    protected async getParserDuration(): Promise<number> {
        let driver = await this.engine.getDriver();

        let result: number = -1;
        try {
            let body = await driver.findElement(
                By.css("body[axt-parser-timing]")
            );
            let duration = await body.getAttribute("axt-parser-timing");
            if (duration !== undefined) {
                let res = Number(duration);
                if (!isNaN(res)) {
                    result = res;
                }
            }
        } catch (e) {
        }

        return Promise.resolve(result);
    }

    protected checkFlag(flags: number, flag: number): boolean {
        return (flags & flag) === flag;
    }


    /** logs ... */
    protected async logButton(button: Button | undefined): Promise<void> {
        if (button === undefined) {
            L.trace("button: undefined");
            return Promise.resolve();
        }
        L.trace(`button: ${button.button} in iframe ${
            button.iframe === undefined ? 'root' : (await button.iframe.getId())
        }`);
        return Promise.resolve();
    }

    protected async logInput(input: Input | undefined): Promise<void> {
        if (input === undefined) {
            L.trace("input: undefined");
            return Promise.resolve();
        }
        L.trace(`input: ${input.input} in iframe ${
            input.iframe === undefined ? 'root' : (await input.iframe.getId())
        }`);
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
            L.trace("Found nothing...");
            return Promise.resolve();
        }
        L.trace("Signin:");
        await this.logButton(page.signinButton);
        L.trace("Login:");
        await this.logLoginForm(page.loginForm);
        L.trace(`Is logged in: ${page.isLoggedIn}`);
        return Promise.resolve();
    }
}
