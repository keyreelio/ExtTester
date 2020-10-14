import {IEngine, IEngineFactory} from './engine/engine'
import {scannerLogger as L} from "./common/log.config";
import {ScanReportLogger} from "./report/scanReport";
import fs from "fs";
import * as URL from "url";
import {error as webDriverErrors} from "selenium-webdriver";
import {KeyReelEngineFactory} from "./engine/keyreel";
import {PageInfo} from "./core/PageInfo";

let gather_page_info_module = fs.readFileSync(
    "./src/browser/gatherPageInfo.js",
    "utf8"
);

class Scanner {
    private static readonly domains: Array<string> = JSON.parse(
        fs.readFileSync(
            './resources/error-domains7.json',
            {encoding: 'UTF-8'}
        )
    ).map( (str: string) => {
        // use '#' as a comment (e.g. '#apple.com': skip apple.com)
        return str.split(/[^\S]#/)[0].trim()
    }).filter( (str: string) => str.length > 0 );

    private engineFactory: IEngineFactory;

    public constructor() {
        this.engineFactory = new KeyReelEngineFactory({withoutProfile: true});
    }

    public run() {
        L.info("*** Run scanner ***");
        try {
            this.engineFactory.start().then( () => {
                this.engineFactory.createEngine().then( (engine: IEngine) => {
                    this.test(engine).then( result => {
                        L.info(`Scan result: ${result != null ? result : 'Ok'}`);
                        process.exit();
                    }).catch( error => {
                        L.error("Scan error:", error);
                    });
                }).catch( (error) => {
                    L.error("Create Engine error:", error);
                })
            }).catch( error => {
                L.error("Create Engine Factory error:", error);
            });
        }
        catch (e) {
            L.error("Scanning failed with", e);
        }
    }

    protected async test(engine: IEngine): Promise<void> {
        L.info("Start scanning");

        L.debug("Start engine");
        await engine.startup(false);

        let domains = Scanner.domains.slice(0, 1);
        L.debug(`domains: ${domains.join(',')}`);
        let driver = await engine.getDriver();
        let extDriver = await engine.getExtDriver();

        let report = new ScanReportLogger();
        report.start();
        for (let idx in domains) {
            let domain = Scanner.domains[idx];
            try {
                let url = URL.parse("http://" + domain);
                L.info(`${+idx+1}: ${domain} [${url.href}]`);

                await driver.manage().setTimeouts({ script: 30000 });
                await extDriver.openUrlInCurrentTab(url.href)

                // if (!await extDriver.loadOptimalSelectModule()) {
                //     let reason = "Unable to load the OptimalSelect module";
                //     console.error(reason);
                //     return Promise.reject(reason);
                // }
                //
                let r = await driver.executeAsyncScript(
                    gather_page_info_module,
                    -1,  // -1 - root page, 0..n - frameId
                    undefined
                ) as PageInfo;

                report.setResult(domain, r);
            } catch (error) {
                let error_info = new PageInfo();
                if (
                    error instanceof webDriverErrors.TimeoutError ||
                    error instanceof webDriverErrors.ScriptTimeoutError
                ) {
                    error_info.error = 'timeoutError';
                } else {
                    error_info.error = 'unknownError';
                }
                report.setResult(domain, error_info);
                L.error(`${error_info.error}! Skip ${domain}`, error);
            }
        }

        report.finish();
        await driver.close();

        L.info("Finish scanning");
        await driver.quit();
    }
}

L.info( "Scanner" );
new Scanner().run();
