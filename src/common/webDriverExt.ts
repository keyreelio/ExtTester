import {By, error, until, WebDriver, WebElement} from "selenium-webdriver";
import {Timeouts} from "./timeouts";
import {testapiLogger as L} from "./log.config";
import {WebElementExt} from "./webElementExt";
import fs from "fs";
import TimeoutError = error.TimeoutError;

const optimalSelect_module = fs.readFileSync(
    //"./node_modules/optimal-select/dist/optimal-select.js",
    "./src/browser/optimal-select.js",
    "utf8"
)

export class WebDriverExt {

    webDriver: WebDriver;

    public constructor(webDriver: WebDriver) {
        this.webDriver = webDriver;
    }


    public async openUrlInCurrentTab(url: string) {
        L.debug(`open url: ${url}`);
        let time = Timeouts.begin();
        await this.webDriver.get('about:blank');
        await this.webDriver.get(url);
        L.info(`Page is loaded in ${Timeouts.end(time)}ms. Process it...`);
    }

    public async loadOptimalSelectModule(): Promise<boolean> {
        let loaded = false;
        let tried = 5;
        while(tried > 0) {
            L.trace(`try to install the OptimalSelect module... countdown: ${tried}`);
            tried -= 1;

            await this.webDriver.executeScript(
                "if ('object'!=typeof window.module) window.module={};" +
                "if ('object'!=typeof window.exports) window.exports={}"
            );

            await this.webDriver.executeScript(optimalSelect_module);
            if (await this.webDriver.executeScript(
                "let success = ('object' === typeof window.module &&" +
                "'object' === typeof window.module.exports)" +
                "? 'function' === typeof window.module.exports.select: false;" +
                "if (success) {" +
                "   window.OptimalSelect = window.module.exports;" +
                "   if ('object' != typeof window.exports) window.export = {}; "+
                "   window.exports.OptimalSelect = window.module.exports;" +
                "}; return success;")
            ) {
                L.trace(`The OptimalSelect module installed successfully!`);
                loaded = true;
                break;
            }

            await this.webDriver.sleep(300);
        }
        return loaded;
    }

    public async openUrlOnCurrentTab(
        url: string,
        waitingTimeout: number = Timeouts.WaitOpenedUrl
    ) {
        await this.webDriver.get(url);
        await this.waitUrlOpened(waitingTimeout);
    }

    public async openUrlOnNewTab(
        url: string,
        waitingTimeout: number = Timeouts.WaitOpenedUrl
    ) {
        let tabs = await this.webDriver.getAllWindowHandles();
        await this.webDriver.switchTo().window(tabs[tabs.length - 1]);

        await this.webDriver.executeScript("window.open();");

        tabs = await this.webDriver.getAllWindowHandles();
        await this.webDriver.switchTo().window(tabs[tabs.length - 1]);

        await this.openUrlOnCurrentTab(url, waitingTimeout);
    }

    public async closeCurrentTab() {
        return
        //
        // L.debug("close current tab");
        // let tabs = await this.webDriver.getAllWindowHandles();
        // if (tabs.length > 1) {
        //     await this.webDriver.close();
        //     await this.webDriver.switchTo().window(tabs[0]);
        // }
    }

    public async switchToRootFrame(): Promise<void> {
        await this.webDriver.switchTo().defaultContent();
        // for (let i = 0; i < 10; ++i) {
        //     await this.webDriver.switchTo().parentFrame();
        // }
    }

    public async switchInRootToFrame(
        frameSelector: string | undefined
    ): Promise<WebElement | undefined> {
        let iframe: WebElement | undefined = undefined;
        await this.switchToRootFrame();
        if (frameSelector != null) {
            let iframe = await this.webDriver.findElement(By.css(frameSelector));
            if (iframe != null) {
                await this.webDriver.switchTo().frame(iframe);
            }
        }
        return iframe;
    }

   public async waitLocated(css: string, timeout: number): Promise<WebElement> {
        return Promise.resolve(
            await this.webDriver.wait(
                until.elementLocated(By.css(css)),
                timeout
            )
        );
    }

    public async waitLocatedExt(css: string, timeout: number): Promise<WebElementExt> {
        return Promise.resolve(
            new WebElementExt(
                await this.webDriver.wait(
                    until.elementLocated(By.css(css)),
                    timeout
                )
            )
        );
    }

    public async waitVisibleElementsLocated(
        xpath: string,
        timeout: number
    ): Promise<Array<WebElement>> {
        try {
            let elements = (await this.webDriver.wait(
                until.elementsLocated(By.xpath(xpath)),
                timeout
            ));

            let visibleElements = Array<WebElement>();
            for (let element of elements) {
                if (await element.isDisplayed()) {
                    visibleElements.push(element);
                }
            }

            return Promise.resolve(visibleElements);
        } catch (e) {
            return Promise.resolve(Array());
        }
    }

    public async clearBrowserData(): Promise<void> {
        try {
            await this.webDriver.manage().deleteAllCookies();
            await this.openUrlOnNewTab("chrome://settings/clearBrowserData");
            let element = new WebElementExt(
                this.webDriver.wait(
                    until.elementLocated(By.xpath("//settings-ui")),
                    Timeouts.WaitOpenedUrl
                )
            );
            await element.pressEnter();
            await this.closeCurrentTab();
        } catch (e) {
            L.warn(e);
        }
    }

    protected async waitUrlOpened(timeout: number = Timeouts.WaitOpenedUrl) {
        await this.webDriver.sleep(Timeouts.AfterOpenUrl);
        let webDriver = this.webDriver;
        await this.webDriver.wait(function() {
            return webDriver.executeScript('return document.readyState')
                .then(readyState => readyState === 'complete');
        }, timeout);
    }
}
