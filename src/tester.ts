import {IEngine} from './engine/engine'
import {DashlaneEngine} from './engine/dashline'
// import {KeyReelEngine} from './engine/keyreel'
// import {OnePasswordXEngine} from './engine/onepassword'
// import {LastPassEngine} from './engine/lastpass'

import {testerLogger as L} from "./common/log.config";

import {Builder, By, Key, until, WebDriver} from 'selenium-webdriver';
import {Credentials} from "./credentials";
import {TestAPI} from "./testapi";
import {ReportLogger} from "./report/report";


class Tester {
    public static async run() {
        L.info("start testing...");
        try {
            // await Promise.all([
            //     testExecute(new KeyReelEngine()),
            //     testExecute(new LastPassEngine()),
            //     testExecute(new DashlaneEngine()),
            //     testExecute(new OnePasswordXEngine())]);

            await Promise.all([this.testExecute(new DashlaneEngine())]);

            L.info("finish testing");
        }
        catch (e) {
            Promise.reject(e);
            // L.error(e.toString);
        }
    }

    protected static async testExecute(engine: IEngine): Promise<void> {

        L.debug("startup engine");
        await engine.startup();

        let report = new ReportLogger(await engine.getEngineName());
        await report.startup();

        let driver = await engine.getDriver();

        for (let credential of Credentials.all()) {

            await report.start(credential.url);

            try {
                L.debug("create test API");
                let api = new TestAPI(engine, credential, report);

                L.debug(`testing: '${credential.url}'`);

                try {
                    L.debug("write credential");
                    await api.checkWriteCredential();
                    L.debug("did write credential");
                } catch (e) {
                    L.debug("write credential with use only enter button");
                    await api.checkWriteCredential({useOnlyEnterButton: true});
                    L.debug("did write credential");
                }

                await driver.sleep(1000);

                L.debug("read credential");
                await api.checkReadCredential();
                L.debug("did read credential");

                L.debug("drop credential");
                await api.dropCredential();
                L.debug("did drop credential");
            }
            catch (e) {
                L.debug(`test filed with: '${e}'`);
            }

            await report.finish();

            await driver.sleep(1000);
        }

        await driver.sleep(100000);

        L.debug("shutdown engine");
        await engine.shutdown();
    }
}

Tester.run()
    .then(result => {
        L.info(`test result: ${result}`);
    })
    .catch(error => {
        L.info(`test error: ${error}`);
    });

