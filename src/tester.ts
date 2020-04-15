import {IEngine} from './engine/engine'
import {DashlaneEngine} from './engine/dashline'
import {testerLogger as L} from "./common/log.config";
import {Credentials} from "./credentials";
import {TestAPI} from "./testapi";
import {ReportLogger} from "./report/report";
// import {KeyReelEngine} from './engine/keyreel'
// import {OnePasswordXEngine} from './engine/onepassword'
// import {LastPassEngine} from './engine/lastpass'


class Tester {
    public static async run() {
        L.info("start testing");
        try {
            // await Promise.all([
            //     testExecute(new KeyReelEngine()),
            //     testExecute(new LastPassEngine()),
            //     testExecute(new DashlaneEngine()),
            //     testExecute(new OnePasswordXEngine())]);

            await this.testExecute(new DashlaneEngine());
        }
        catch (e) {
            L.info(`testing fail with: ${e}`);
            return Promise.reject(e);
        }

        L.info("finish testing");
    }

    protected static async testExecute(engine: IEngine): Promise<void> {

        L.debug("startup engine");
        await engine.startup();

        await engine.dropAllCredentials();

        let report = new ReportLogger(await engine.getEngineName());
        await report.startup();

        let driver = await engine.getDriver();

        for (let credential of Credentials.all()) {
            await report.start(credential.url);

            L.debug("create test API");
            let api = new TestAPI(engine, credential, report);

            L.debug(`testing: '${credential.url}'`);
            try {
                L.debug("write credential");
                await api.checkWriteCredential();
                L.debug("did write credential");

                await driver.sleep(500);

                L.debug("read credential");
                await api.checkReadCredential();
                L.debug("did read credential");

                await driver.sleep(500);

                L.debug("drop credential");
                await engine.dropAllCredentials();
                L.debug("did drop credential");
            } catch (e) {
                L.debug(`test 'use login button' filed with: '${e}'`);
            }

            // try {
            //     L.debug("write credential with use only enter button");
            //     await api.checkWriteCredential({useOnlyEnterButton: true});
            //     L.debug("did write credential");
            //
            //     await driver.sleep(500);
            //
            //     L.debug("read credential");
            //     await api.checkReadCredential();
            //     L.debug("did read credential");
            //
            //     await driver.sleep(500);
            //
            //     L.debug("drop credential");
            //     await engine.dropAllCredentials();
            //     L.debug("did drop credential");
            // } catch (e) {
            //     L.debug(`test 'use enter key' filed with: '${e}'`);
            // }

            await report.finish();
        }

        await report.shutdown();

        await engine.dropAllCredentials();

        L.debug("shutdown engine");
        await engine.shutdown();

        await driver.quit();
    }
}

Tester.run()
    .then(result => {
        L.info(`test result: ${result}`);
    })
    .catch(error => {
        L.info(`test error: ${error}`);
    });

