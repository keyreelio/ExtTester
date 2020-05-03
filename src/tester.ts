import {IEngine} from './engine/engine'
import {testerLogger as L} from "./common/log.config";
import {Credentials} from "./credentials";
import {TestAPI} from "./testapi";
import {IReport, ReportLogger} from "./report/report";
import {KeyReelEngine} from './engine/keyreel';
import {DatabaseFile} from "./database/databaseFile";
// import {DashlaneEngine} from './engine/dashline'
// import {OnePasswordXEngine} from './engine/onepassword'
// import {LastPassEngine} from './engine/lastpass'


class Tester {

    static DBFolderPath = "./chrome_profiles/";


    public static async run() {
        L.info("start testing");
        try {
            await this.testKeyreel();
        }
        catch (e) {
            L.info(`testing fail with: ${e}`);
            return Promise.reject(e);
        }

        L.info("finish testing");
    }


    protected static async testKeyreel(): Promise<void> {

        let report = new ReportLogger("KeyReel");
        await report.startup();

        L.debug("create DB_1");
        let db1 = new DatabaseFile(`${Tester.DBFolderPath}keyreel.${Date.now()}.db.json`);

        L.debug("testing write");
        let engine1 = new KeyReelEngine(db1, { withoutProfile: true });
        await this.testWrite(engine1, report);

        L.debug("create DB_2");
        let db2 = new DatabaseFile(`${Tester.DBFolderPath}keyreel.${Date.now()}.db.json`);

        L.debug("testing write without click on buttons (only sites which did not save)");
        let engine2 = new KeyReelEngine(db2, { withoutProfile: true });
        await this.testWrite(engine2, report, true);

        // L.debug("testing read (only sites which saved)");
        // await this.testRead(new KeyReelEngine(db, { withoutProfile: true }), report);

        await report.printResult();
        await report.shutdown();

        L.debug("delete DB");
        db1.deleteFile();
        db2.deleteFile();
    }

    protected static async testWrite(engine: IEngine, report: IReport, useOnlyEnterButton = false): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        for (let credential of Credentials.all()) {
            await report.start(credential.url);

            L.debug("create test API");
            let api = new TestAPI(engine, credential, report);

            L.debug(`testing: '${credential.url}'`);
            try {
                L.debug("write credential");
                await api.checkWriteCredential({useOnlyEnterButton: useOnlyEnterButton});
                L.debug("did write credential");
            } catch (e) {
                L.debug(`test filed with: '${e}'`);
            }

            await report.finish();
        }

        L.debug("shutdown engine");
        await engine.shutdown();

        await driver.quit();
    }

    protected static async testRead(engine: IEngine, report: IReport): Promise<void> {

        // L.debug("startup engine");
        // await engine.startup();
        //
        // let report = new ReportLogger(await engine.getEngineName());
        // await report.startup();
        //
        // let driver = await engine.getDriver();
        //
        // for (let credential of Credentials.all()) {
        //     await report.start(credential.url);
        //
        //     L.debug("create test API");
        //     let api = new TestAPI(engine, credential, report);
        //
        //     L.debug(`testing: '${credential.url}'`);
        //     try {
        //         if (Tester.testWriteCredentialWithLoginButton) {
        //             L.debug("write credential");
        //             await api.checkWriteCredential();
        //             L.debug("did write credential");
        //         }
        //
        //         // await driver.sleep(500);
        //
        //         // if (Tester.testReadCredentialWithLoginButton) {
        //         //     L.debug("read credential");
        //         //     await api.checkReadCredential();
        //         //     L.debug("did read credential");
        //         // }
        //     } catch (e) {
        //         L.debug(`test 'use login button' filed with: '${e}'`);
        //     }
        //
        //     // L.debug("drop credential");
        //     // await engine.dropAllCredentials();
        //     // L.debug("did drop credential");
        //
        //     // try {
        //     //     if (Tester.testWriteCredentialWithoutLoginButton) {
        //     //         L.debug("write credential with use only enter button");
        //     //         await api.checkWriteCredential({useOnlyEnterButton: true});
        //     //         L.debug("did write credential");
        //     //     }
        //     //
        //     //     // await driver.sleep(500);
        //     //
        //     //     if (Tester.testReadCredentialWithoutLoginButton) {
        //     //         L.debug("read credential");
        //     //         await api.checkReadCredential();
        //     //         L.debug("did read credential");
        //     //     }
        //     // } catch (e) {
        //     //     L.debug(`test 'use enter key' filed with: '${e}'`);
        //     // }
        //     //
        //     // L.debug("drop credential");
        //     // await engine.dropAllCredentials();
        //     // L.debug("did drop credential");
        //
        //     await report.finish();
        // }
        //
        // await report.shutdown();
        //
        // await engine.dropAllCredentials();
        //
        // await driver.sleep(100000);
        //
        // L.debug("shutdown engine");
        // await engine.shutdown();
        //
        // await driver.quit();
    }
}

Tester.run()
    .then(result => {
        L.info(`test result: ${result}`);
    })
    .catch(error => {
        L.info(`test error: ${error}`);
    });

