import {Engine, IEngine, IEngineFactory} from './engine'
import {dashlaneEngineLogger as L} from "../common/log.config";

import {WebElementExt} from "../common/webElementExt";
import {By, Key, until, WebElement} from "selenium-webdriver";
import fs from "fs";
import {Timeouts} from "../common/timeouts";
import {Server} from "../service/server";
import {KeyReelEngine} from "./keyreel";

const DASHLANE_ID = "fdjamakpfbbddfjaooikfcpapjohcfmg";
const DASHLANE_EXT_URL = `chrome-extension://${DASHLANE_ID}/`;

interface IDashlaneAccount {
    login: string;
    password: string;
}


export class DashlaneEngineFactory implements IEngineFactory {

    options: { withoutProfile: boolean } | undefined;


    public constructor(
        options:
            { withoutProfile: boolean } |
            undefined = undefined) {

        this.options = options;
    }

    public async createEngine(): Promise<IEngine> {
        return Promise.resolve(new DashlaneEngine(this.options));
    }

    public start(): Promise<void> {
        return Promise.resolve();
    }

    public finish(): Promise<void> {
        return Promise.resolve();
    }
}


export class DashlaneEngine extends Engine {

    // engines
    static WaitLocatedEngineUI = 10000;
    static WaitLocatedEngineControl = 5000;


    startupUrl = DASHLANE_EXT_URL + "signup";
    currentAccountIndex = 0;
    accounts = [
        {
            login: "hdayfg6wq5sq@gmail.com",
            password: "dzM+T+y(Tn~J86{"
        },
        {
            login: "t3mxdwk2zrhz@gmail.com",
            password: "qCywf6K5CWczGSt"
        }
    ];

    public constructor(
        options:
            { withoutProfile: boolean } |
            undefined = undefined) {

        super(options);
    }

    public async getEngineName(): Promise<string> {
        return this.profileName();
    }

    private async getDashlaneIframe(): Promise<WebElement> {
        let extDriver = await this.getExtDriver();
        try {
            await extDriver.switchToRootFrame();

            L.trace("find iframe[@id='kw-iframe-popup']");
            let iframe = await extDriver.waitLocated(
                "iframe[id=kw-iframe-popup]",
                DashlaneEngine.WaitLocatedEngineUI
            );
            return Promise.resolve(iframe);
        } catch (e) {
            L.trace(`filed process after login with ${e}`);
            return Promise.reject(e);
        }

    }

    public async testAfterLogin(): Promise<boolean> {
        try {
            return (await this.getDashlaneIframe() != null);
        } catch (e) {
            return false;
        }
    }

    public async processAfterPressLoginButton(cancel: boolean): Promise<boolean> {
        try {
            let driver = await this.getDriver();
            let extDriver = await this.getExtDriver();

            try {
                let iframe = await this.getDashlaneIframe();
                L.trace(`switch to '${await iframe.getId()}'`);
                await driver.switchTo().frame(iframe);
            } catch (e) {
                L.trace(`Ok. The Dashlane's iframe is not found: ${e}`);
                return Promise.resolve(false);
            }

            if (cancel) {
                L.trace("press cancel");
                let button = await extDriver.waitLocatedExt(
                    "button[class*=cancel]",
                    DashlaneEngine.WaitLocatedEngineControl
                );
                await button.click();
            } else {
                L.trace("press Enter in input");
                let input = await extDriver.waitLocatedExt(
                    "input[type=text]",
                    DashlaneEngine.WaitLocatedEngineControl
                );
                await input.pressEnter();
            }

            return Promise.resolve(true);
        } catch (e) {
            L.trace(`filed process after login with ${e}`);
            return Promise.reject(e);
        }
    }

    public async dropAllCredentials(): Promise<void> {

        let driver = await this.getDriver();

        await this.openCredentials();
        while (true) {
            try {
                await this.dropTopCredential();
                await driver.sleep(500);
            } catch (e) {
                break;
            }
        }

        return Promise.resolve();
    }


    //REGION: Engine override protected methods

    protected async profileName(): Promise<string> {
        return Promise.resolve("dashlane");
    }

    protected async setupOptions(): Promise<void> {

        let options = await this.getOptions();

        L.debug("add 'keyreel' extension");
        let krcrx = fs.readFileSync(
            './resources/crxs/keyreel.crx',
            {encoding: "base64"}
        );
        options.addExtensions(krcrx);

        L.debug("add 'stop-page-loading' extension");
        let srcrx = fs.readFileSync(
            './resources/crxs/stoppageloading-1.0.zip',
            {encoding: "base64"}
        );
        options.addExtensions(srcrx);

        L.debug("add 'dashlane' extension")
        let crx = fs.readFileSync(
            './resources/crxs/dashlane.crx',
            {encoding: "base64"}
        );
        options.addExtensions(crx);
    }

    protected async startupDriver(): Promise<void> {
        L.debug("startupDriver");

        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        await extDriver.openUrlOnCurrentTab(this.startupUrl);
        try {
            L.debug("check opened page 'login' or 'signup'");
            await Promise.race([
                driver.wait(until.urlContains("/login"), Timeouts.WaitOpenedUrl),
                driver.wait(until.urlContains("/signup"), Timeouts.WaitOpenedUrl),
            ]);
        } catch (UnhandledPromiseRejectionWarning) {
            L.debug("already logged in");
            // logged in
            return Promise.resolve();
        }

        if ((await driver.getCurrentUrl()).includes("/signup")) {
            L.debug("it's 'signup' page");

            L.trace("find 'login' link and click()");
            let signin = await extDriver.waitLocatedExt("a[href='/login']", DashlaneEngine.WaitLocatedEngineControl);
            await signin.click();

            L.trace("wait open 'login' page");
            await driver.wait(until.urlContains("/login"), Timeouts.WaitOpenedUrl);
        }

        if ((await driver.getCurrentUrl()).includes("/login")) {
            L.debug("it's 'login' page");
            L.debug("check login form parts");
            await Promise.all([
                extDriver.waitLocated(
                    "input[type=email]",
                    Timeouts.WaitLocatedElement
                ).then(async elm => {
                    L.debug("login form has 'login' input");

                    L.trace("enter login to 'login' input");
                    let login = new WebElementExt(elm);
                    await login.sendKeys(this.currentAccount().login);

                    L.trace("find 'login' button and click()");
                    let loginButton = await extDriver.waitLocatedExt(
                        "button[type=button]",
                        Timeouts.WaitLocatedAnimatedElement
                    );
                    await loginButton.click();

                    let password: WebElementExt;
                    L.trace("wait located 'password' input and enter password");
                    while (true) {
                        try {
                            L.trace('wait password...');
                            password = await extDriver.waitLocatedExt(
                                "input[type=password]",
                                Timeouts.WaitLocatedAnimatedElement
                            )
                            break;
                        } catch (e) {
                            try {
                                await extDriver.waitLocatedExt(
                                    'input[class^=tokenInput]',
                                    Timeouts.WaitLocatedAnimatedElement
                                );
                                L.trace('token was found...');
                            } catch (e2) {
                                L.error("token error", e2);
                                return Promise.reject(e2)
                            }
                        }
                    }

                    await password.sendKeys(this.currentAccount().password);
                    await password.pressEnter();

                    return Promise.resolve();
                }).catch(error => {
                    L.debug("login form has not 'login' input");
                    return Promise.resolve();
                }),
                extDriver.waitLocated(
                    "div[class='Select-control']",
                    Timeouts.WaitLocatedElement
                ).then(async elm => {
                    L.debug("login form has 'account' selector");

                    L.trace("find 'login' button and click()");
                    let loginButton = await extDriver.waitLocatedExt(
                        "button[type=button]",
                        Timeouts.WaitLocatedAnimatedElement
                    );
                    await loginButton.click();

                    L.trace("wait located 'password' input and enter password");
                    let password = await extDriver.waitLocatedExt(
                        "input[type=password]",
                        Timeouts.WaitLocatedAnimatedElement
                    );
                    await password.sendKeys(this.currentAccount().password);
                    await password.pressEnter();

                    return Promise.resolve();
                }).catch(error => {
                    L.debug("login form has not 'account' selector");
                    return Promise.resolve();
                }),
                extDriver.waitLocated(
                    "input[type=password]",
                    Timeouts.WaitLocatedElement
                ).then(async elm => {
                    L.debug("login form has 'password' input");

                    let password = new WebElementExt(elm);
                    L.trace("enter password to 'password' input and press 'Enter'");
                    await password.sendKeys(this.currentAccount().password);
                    await password.pressEnter();

                    return Promise.resolve();
                }).catch(error => {
                    L.debug("login form has not 'password' input");
                    return Promise.resolve();
                }),
            ]);

            L.debug("wait open 'credentials' page");
            await driver.wait(
                until.urlContains("/credentials"),
                Timeouts.WaitOpenedUrl
            );
            L.debug("opened 'credentials' page");
        }

        return Promise.resolve();
    }

    //REGION: protected methods

    protected currentAccount(): IDashlaneAccount {
        let index = Math.max(
            0,
            Math.min(this.currentAccountIndex, this.accounts.length - 1)
        );
        return this.accounts[index];
    }

    protected async dropTopCredential(): Promise<void> {
        let items = await this.findCredentialList();
        return await this.dropCredential(items[0]);
    }

    protected async dropCredential(item: WebElement): Promise<void> {
        let extDriver = await this.getExtDriver();

        let linkA = new WebElementExt(await
            item.findElement(By.css("a[class*=cellsWrapper]"))
        );
        await linkA.click();

        let form = await extDriver.waitLocated(
            "form",
            DashlaneEngine.WaitLocatedEngineUI
        );
        let deleteButton = new WebElementExt(
            await form.findElement(By.css("button[class*=deleteButton]"))
        );
        await deleteButton.click();

        let confirmButton = await extDriver.waitLocated(
            "button[class*=danger]",
            DashlaneEngine.WaitLocatedEngineControl
        );
        await confirmButton.click();

        return Promise.resolve();
    }

    protected async openCredentials(): Promise<void> {
        let driver = await this.getDriver();
        let extDriver = await this.getExtDriver();

        let tabs = await driver.getAllWindowHandles();

        let find = false;
        for (let tab of tabs) {
            await driver.switchTo().window(tab);
            if ((await driver.getCurrentUrl()).includes(`${DASHLANE_ID}/credentials`)) {
                find = true;
                break;
            }
        }
        if (!find) {
            await extDriver.openUrlOnNewTab(DASHLANE_EXT_URL + "credentials");
        }

        await extDriver.switchToRootFrame();
        await driver.sleep(Timeouts.AfterOpenUrl);
    }

    protected async findCredentialList(): Promise<WebElement[]> {
        let extDriver = await this.getExtDriver();

        let contentDiv = await extDriver.waitLocated("div[class*=contentWrapper]", DashlaneEngine.WaitLocatedEngineUI);
        let listUl = await contentDiv.findElement(By.css("ul[class*=wrapper]"));
        let items = await listUl.findElements(By.css("li[class*=row]"));

        return Promise.resolve(items);
    }
}

