//import {By, Key, until, WebDriver, WebElement} from "selenium-webdriver";
import {Engine, IEngine} from './engine/engine'
import {scannerLogger as L} from "./common/log.config";
import {EResultType, ScanReportLogger} from "./report/scanReport";
import fs from "fs";
import * as URL from "url";
import {Timeouts} from "./common/timeouts";
import {WebDriverExt} from "./common/WebDriverExt";
import {error as webDriverErrors} from "selenium-webdriver";


const upperCaseTbl = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lowerCaseTbl = "abcdefghijklmnopqrstuvwxyz";

async function searchElements(
    extDriver: WebDriverExt,
    name: string,
    part: string,
    text: string,
    parent: string = ""
) {
    let xpath: string;
   if (parent.length > 0)  {
       xpath = `//${name}[contains(translate(${part}, "${upperCaseTbl}", "${lowerCaseTbl}"), "${text}")/ancestor::${parent}]`;
   } else {
       xpath = `//${name}[contains(translate(${part}, "${upperCaseTbl}", "${lowerCaseTbl}"), "${text}")]`;
   }
    let visibleElements = await extDriver.waitVisibleElementsLocated(xpath, 100);
    L.trace(`found ${visibleElements.length} link(s)`);
    return visibleElements;
}

async function searchElements2(
    extDriver: WebDriverExt,
    name: string,
    part: string,
    classText: string,
    text: string = ""
) {
    let xpath = `//${name}[contains(translate(@class, "${upperCaseTbl}", "${lowerCaseTbl}"), "${classText}") and contains(translate(text(), "${upperCaseTbl}", "${lowerCaseTbl}"), "${text}")]`;
    let visibleElements = await extDriver.waitVisibleElementsLocated(xpath,100);
    L.trace(`found ${visibleElements.length} link(s)`);
    return visibleElements;
}

let is_visible_module = fs.readFileSync("./src/browser/isVisible.js", "utf8");
let search_buttons_module = fs.readFileSync("./src/browser/searchButtons.js", "utf8");


class Scanner {
    private static readonly domains: Array<string> = JSON.parse(
        fs.readFileSync(
            './resources/domains.json',
            {encoding: 'UTF-8'}
        )
    );

    public static run() {
        L.info("*** run scanner ***");
        try {
            this.scan(new Engine()).then(result => {
                L.info(`scan result: ${result}`);
            }).catch(error => {
                L.error("scan error", error);
            });
        }
        catch (e) {
            L.error("scanning fail with", e);
        }
    }


    protected static async scan(engine: IEngine): Promise<void> {
        L.info("start scanning");

        L.debug("startup engine");
        await engine.startup();


        let domains100 = Scanner.domains.slice(0, 1);
        let driver = await engine.getDriver();
        let extDriver = await engine.getExtDriver();

        let report = new ScanReportLogger();
        report.start();
        for (let idx in domains100) {
            let domain = Scanner.domains[idx];
            try {
                L.info(`domain(${idx}) = ${domain}`);
                let url = URL.parse("https://" + domain);
                L.info(`href = ${url.href}`);
                let time = Timeouts.begin();
                await extDriver.openUrlOnCurrentTab(url.href, 30000);
                L.info(`Page is loaded in ${Timeouts.end(time)}ms. Process it...`);

                // await driver.manage().setTimeouts({ script: 30000 });
                // await driver.executeScript(is_visible_module);
                // let r = await driver.executeScript(search_buttons_module);
                // L.info(`search_buttons_module result = ${r}`);
                //
                // let param1 = "test";
                // let param2 = 12345;
                //
                // let result: String = await driver.executeScript( (param1: string, param2: number) => {
                //     console.log(`test ${param1}, ${param2}`);
                //     // @ts-ignore
                //     console.log(`visible = ${isVisible(document.body)}`);
                //     return "jopa"
                // }, param1, param2);
                // L.info(`result ==> ${result}`);

                let accountLinks = await searchElements(extDriver, "a", "text()", "account");
                let accountButtons = await searchElements(extDriver, "buttons", "text()", "account");

                let hasAccountButton = (accountLinks.length > 0 || accountButtons.length > 0);
                report.setResult(domain, EResultType.accountButton, hasAccountButton);

                let loginLinks = await searchElements(extDriver, "a", "text()", "log in");
                let login2Links = await searchElements(extDriver, "a", "text()", "login");
                let login3Links = await searchElements(extDriver, "a", "@class", "log-in");
                let login4Links = await searchElements(extDriver, "a", "@class", "log_in");
                let login5Links = await searchElements(extDriver, "a", "@class", "login");
                let loginButtons = await searchElements(extDriver, "button", "text()", "log in");
                let login2Buttons = await searchElements(extDriver, "button", "text()", "login");
                let login3Buttons = await searchElements(extDriver, "button", "@class", "log-in");
                let login4Buttons = await searchElements(extDriver, "button", "@class", "log_in");
                let login5Buttons = await searchElements(extDriver, "button", "@class", "login");
                let loginSpan = await searchElements2(extDriver, "span", "@class", "button", "log in");
                let login2Span = await searchElements2(extDriver, "span", "@class", "button", "login");
                let login3Span = await searchElements(extDriver, "span", "@class", "log in", "button");
                let login4Span = await searchElements(extDriver, "span", "@class", "login", "button");

                let hasLoginButton = (
                    loginLinks.length > 0 ||
                    login2Links.length > 0 ||
                    login3Links.length > 0 ||
                    login4Links.length > 0 ||
                    login5Links.length > 0 ||
                    loginButtons.length > 0 ||
                    login2Buttons.length > 0 ||
                    login3Buttons.length > 0 ||
                    login4Buttons.length > 0 ||
                    login5Buttons.length > 0 ||
                    loginSpan.length > 0 ||
                    login2Span.length > 0 ||
                    login3Span.length > 0 ||
                    login4Span.length > 0
                );
                report.setResult(domain, EResultType.loginButton, hasLoginButton);


                let regLinks = await searchElements(extDriver, "a", "text()", "sign in");
                let reg2Links = await searchElements(extDriver, "a", "text()", "signin");
                let reg3Links = await searchElements(extDriver, "a", "@class", "sign-in");
                let reg4Links = await searchElements(extDriver, "a", "@class", "sign_in");
                let reg5Links = await searchElements(extDriver, "a", "@class", "signin");
                let regButtons = await searchElements(extDriver, "button", "text()", "sign in");
                let reg2Buttons = await searchElements(extDriver, "button", "text()", "lsignin");
                let reg3Buttons = await searchElements(extDriver, "button", "@class", "sign-in");
                let reg4Buttons = await searchElements(extDriver, "button", "@class", "sign_in");
                let reg5Buttons = await searchElements(extDriver, "button", "@class", "signin");

                let regSpan = await searchElements2(extDriver, "span", "@class", "button", "sign in");
                let reg2Span = await searchElements2(extDriver, "span", "@class", "button", "signin");
                let reg3Span = await searchElements(extDriver, "span", "@class", "sign in", "button");
                let reg4Span = await searchElements(extDriver, "span", "@class", "signin", "button");


                let reg_Links = await searchElements(extDriver, "a", "text()", "register");
                let reg_1Links = await searchElements(extDriver, "a", "@class", "register");
                let reg_2Links = await searchElements(extDriver, "a", "@class", "register");
                let reg_Buttons = await searchElements(extDriver, "button", "text()", "register");
                let reg_1Buttons = await searchElements(extDriver, "button", "@class", "register");
                let reg_Span = await searchElements2(extDriver, "span", "@class", "button", "register");
                let reg_2Span = await searchElements(extDriver, "span", "@class", "register", "button");


                let reg2_Links = await searchElements(extDriver, "a", "text()", "sign on");
                let reg2_2Links = await searchElements(extDriver, "a", "text()", "signon");
                let reg2_3Links = await searchElements(extDriver, "a", "@class", "sign-on");
                let reg2_4Links = await searchElements(extDriver, "a", "@class", "sign_on");
                let reg2_5Links = await searchElements(extDriver, "a", "@class", "signon");
                let reg2_Buttons = await searchElements(extDriver, "button", "text()", "sign on");
                let reg2_2Buttons = await searchElements(extDriver, "button", "text()", "lsignon");
                let reg2_3Buttons = await searchElements(extDriver, "button", "@class", "sign-on");
                let reg2_4Buttons = await searchElements(extDriver, "button", "@class", "sign_on");
                let reg2_5Buttons = await searchElements(extDriver, "button", "@class", "signon");

                let reg2_Span = await searchElements2(extDriver, "span", "@class", "button", "sign on");
                let reg2_2Span = await searchElements2(extDriver, "span", "@class", "button", "signon");
                let reg2_3Span = await searchElements(extDriver, "span", "@class", "sign on", "button");
                let reg2_4Span = await searchElements(extDriver, "span", "@class", "signon", "button");

                let reg3_Links = await searchElements(extDriver, "a", "text()", "sign up");
                let reg3_2Links = await searchElements(extDriver, "a", "text()", "signup");
                let reg3_3Links = await searchElements(extDriver, "a", "@class", "sign-up");
                let reg3_4Links = await searchElements(extDriver, "a", "@class", "sign_up");
                let reg3_5Links = await searchElements(extDriver, "a", "@class", "signup");
                let reg3_Buttons = await searchElements(extDriver, "button", "text()", "sign up");
                let reg3_2Buttons = await searchElements(extDriver, "button", "text()", "lsignup");
                let reg3_3Buttons = await searchElements(extDriver, "button", "@class", "sign-up");
                let reg3_4Buttons = await searchElements(extDriver, "button", "@class", "sign_up");
                let reg3_5Buttons = await searchElements(extDriver, "button", "@class", "signup");

                let reg3_Span = await searchElements2(extDriver, "span", "@class", "button", "sign up");
                let reg3_2Span = await searchElements2(extDriver, "span", "@class", "button", "signup");
                let reg3_3Span = await searchElements(extDriver, "span", "@class", "sign up", "button");
                let reg3_4Span = await searchElements(extDriver, "span", "@class", "signup", "button");


                let hasRegistrationButton = (
                    regLinks.length > 0 ||
                    reg2Links.length > 0 ||
                    reg3Links.length > 0 ||
                    reg4Links.length > 0 ||
                    reg5Links.length > 0 ||
                    regButtons.length > 0 ||
                    reg2Buttons.length > 0 ||
                    reg3Buttons.length > 0 ||
                    reg4Buttons.length > 0 ||
                    reg5Buttons.length > 0 ||
                    regSpan.length > 0 ||
                    reg2Span.length > 0 ||
                    reg3Span.length > 0 ||
                    reg4Span.length > 0 ||
                    reg_Links.length > 0 ||
                    reg_1Links.length > 0 ||
                    reg_2Links.length > 0 ||
                    reg_Buttons.length > 0 ||
                    reg_1Buttons.length > 0 ||
                    reg_Span.length > 0 ||
                    reg_2Span.length > 0 ||
                    reg2_Links.length > 0 ||
                    reg2_2Links.length > 0 ||
                    reg2_3Links.length > 0 ||
                    reg2_4Links.length > 0 ||
                    reg2_5Links.length > 0 ||
                    reg2_Buttons.length > 0 ||
                    reg2_2Buttons.length > 0 ||
                    reg2_3Buttons.length > 0 ||
                    reg2_4Buttons.length > 0 ||
                    reg2_5Buttons.length > 0 ||
                    reg2_Span.length > 0 ||
                    reg2_2Span.length > 0 ||
                    reg2_3Span.length > 0 ||
                    reg2_4Span.length > 0 ||
                    reg3_Links.length > 0 ||
                    reg3_2Links.length > 0 ||
                    reg3_3Links.length > 0 ||
                    reg3_4Links.length > 0 ||
                    reg3_5Links.length > 0 ||
                    reg3_Buttons.length > 0 ||
                    reg3_2Buttons.length > 0 ||
                    reg3_3Buttons.length > 0 ||
                    reg3_4Buttons.length > 0 ||
                    reg3_5Buttons.length > 0 ||
                    reg3_Span.length > 0 ||
                    reg3_2Span.length > 0 ||
                    reg3_3Span.length > 0 ||
                    reg3_4Span.length > 0
               );
                report.setResult(domain, EResultType.registerButton, hasRegistrationButton);

            } catch (error) {
                if (error instanceof webDriverErrors.TimeoutError) {
                    report.setResult(domain, EResultType.timeoutError, true);
                    L.error("TimeoutError! Skip ${domain}", error);
                } else {
                    report.setResult(domain, EResultType.unknownError, true);
                    L.error("UnknownError! Skip ${domain}", error);
                }
            }
        }

        report.finish();
        await driver.close();

        L.info("finish scanning");

        await driver.quit();
    }
}

L.info( "Scanner" );
Scanner.run();
