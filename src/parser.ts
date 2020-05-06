import {testapiLogger as L} from "./common/log.config";
import {By, WebElement} from "selenium-webdriver";
import {Timeouts} from "./common/timeouts";
import {Button} from "./common/button";
import {Input} from "./common/input";
import {IEngine} from "./engine/engine";


export class LoginForm {
    loginInput: Input | undefined = undefined;
    passwordInput: Input | undefined = undefined;
    nextButton: Button | undefined = undefined;
    loginButton: Button | undefined = undefined;
}

export class Page {
    didNotParse: boolean = true;
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

        let startTime = new Date();
        while (true) {
            let page = new Page();

            await extDriver.switchToRootFrame();

            let loginForm = await this.findLoginForm(undefined);
            if (loginForm === undefined) {
                loginForm = await this.findLoginFormInFrames();
            }

            page.loginForm = loginForm;

            if (page.loginForm === undefined) {
                let singInButton = await this.findSinginButton(undefined);
                if (singInButton === undefined) {
                    singInButton = await this.findSinginButtonInFrames();
                }
                page.singinButton = singInButton;
            }

            if (page.loginForm === undefined && page.singinButton === undefined) {
                page.isLoggedIn = true;
            }

            let done: boolean = false;
            if (this.checkFlag(searchFlag, Parser.SearchFlagSingInButton)) {
                done = done || (page.singinButton !== undefined);
            }
            if (this.checkFlag(searchFlag, Parser.SearchFlagLoginOnForm)) {
                done = done || (page.loginForm !== undefined && page.loginForm.loginInput !== undefined);
            }
            if (this.checkFlag(searchFlag, Parser.SearchFlagPasswordOnForm)) {
                done = done || (page.loginForm !== undefined && page.loginForm.passwordInput !== undefined);
            }
            if (this.checkFlag(searchFlag, Parser.SearchFlagLoggedIn)) {
                done = done || page.isLoggedIn;
            }

            if (done) {
                L.trace("----------------------------------");
                await this.logPage(page);
                L.trace("----------------------------------");

                return Promise.resolve(page);
            }

            let nowTime = new Date();
            let delta = nowTime.getTime() - startTime.getTime();
            if (timeout > 0 && delta <= timeout) {
                await driver.sleep(500);
                continue;
            }

            return Promise.reject(new Error("Page did not parsed"));
        }
    }

    protected checkFlag(flags: number, flag: number): boolean {
        return (flags & flag) === flag;
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

    protected async findSinginButtonInFrames(): Promise<Button | undefined> {
        L.debug("findSinginButtonInFrames");

        let driver = await this.engine.getDriver();

        let button: Button | undefined = undefined;

        try {
            for (let iframe of await driver.findElements(By.xpath("//iframe"))) {
                try {
                    L.trace(`switch to '${await iframe.getId()}'`);
                    await driver.switchTo().frame(iframe);

                    button = await this.findSinginButton(iframe);

                    L.trace("switch to 'root'");
                    await driver.switchTo().parentFrame();

                    if (button !== undefined) {
                        break;
                    }
                } catch (e) {
                }
            }
        } catch (e) {
        }

        return Promise.resolve(button);
    }

    protected async findSinginButton(iframe: WebElement | undefined): Promise<Button | undefined> {
        L.debug("findSinginButton");

        let extDriver = await this.engine.getExtDriver();

        let button: Button | undefined = undefined;
        try {
            let buttonElm = await extDriver.waitLocated(
                "//*[@axt-button='login']",
                iframe === undefined ? Timeouts.WaitParsedPage : Timeouts.WaitParsedPageMin);
            if (buttonElm !== undefined) {
                button = new Button(buttonElm, iframe);
            }
        } catch (e) {
        }

        return Promise.resolve(button);
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
            let body = await extDriver.waitLocated(
                "//body[@axt-parser-timing]",
                iframe === undefined ? Timeouts.WaitParsedPage : Timeouts.WaitParsedPageMin);
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