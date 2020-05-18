import {Engine, IEngine} from './engine/engine'
import {scannerLogger as L} from "./common/log.config";
import {EResultType, ScanReportLogger} from "./report/scanReport";
import fs from "fs";
import * as URL from "url";
import {Timeouts} from "./common/timeouts";
import {error as webDriverErrors} from "selenium-webdriver";

let search_buttons_module = fs.readFileSync("./src/browser/searchButtons.js", "utf8");


class Scanner {
    private static readonly domains: Array<string> = JSON.parse(
        fs.readFileSync(
            './resources/domains.json',
            {encoding: 'UTF-8'}
        )
    ).map( (str: string) => {
        // use '#' as a comment (e.g. '#apple.com': skip apple.com)
        return str.split('#')[0].trim()
    }).filter( (str: string) => str.length > 0 );

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
        await engine.startup(false);

        let domains100 = Scanner.domains; //.slice(0, 1);
        L.debug(`domains100: ${domains100.join(',')}`);
        let driver = await engine.getDriver();
        let extDriver = await engine.getExtDriver();

        let report = new ScanReportLogger();
        report.start();
        for (let idx in domains100) {
            let domain = Scanner.domains[idx];
            try {
                let url = URL.parse("http://" + domain);
                L.info(`${+idx+1}: ${domain} [${url.href}]`);
                let time = Timeouts.begin();
                await extDriver.openUrlOnCurrentTab(url.href, 30000);
                L.info(`Page is loaded in ${Timeouts.end(time)}ms. Process it...`);

                await extDriver.webDriver.sleep(300);
                await driver.manage().setTimeouts({ script: 3000 });
                let r: Array<string> = await driver.executeScript(search_buttons_module) as Array<string>;

                L.info(`Search buttons result: ${r}`);
                report.setResult(domain, EResultType.registerButton, false);

                r.forEach( (type: string) => {
                    let resultType: EResultType = (<any>EResultType)[type];
                    report.setResult(domain, resultType, true);
                });
            } catch (error) {
                if (error instanceof webDriverErrors.TimeoutError) {
                    report.setResult(domain, EResultType.timeoutError, true);
                    L.error(`TimeoutError! Skip ${domain}`, error);
                } else {
                    report.setResult(domain, EResultType.unknownError, true);
                    L.error(`UnknownError! Skip ${domain}`, error);
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
