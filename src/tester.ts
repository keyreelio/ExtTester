import {IEngine} from './engine/engine'
import {testerLogger as L} from "./common/log.config";
import {Credentials} from "./credentials/credentials";
import {TestAPI} from "./testapi";
import {EReportResult, EReportTest, IReport, ReportLogger, ReportTxt} from "./report/report";
import {KeyReelEngine} from './engine/keyreel';
import {DatabaseFile} from "./database/databaseFile";


class Tester {

    static DBFolderPath = "./chrome_profiles/";
    static ReportsFolderPath = "./reports/";


    public static async run(args: string[]) {

        L.info("start testing");

        let debug = args.includes("debug");
        let toContinue = args.includes("continue");

        try {
            let report: IReport;
            let credentials: Credentials = new Credentials();
            if (!debug) {
                credentials.loadFromPassDB();
                report = new ReportTxt("KeyReel", `${Tester.ReportsFolderPath}tester-${Date.now()}.txt`);
            } else {
                report = new ReportLogger("KeyReel");
            }

            await report.startup(toContinue);
            await this.testKeyreel(report, credentials);
            await report.shutdown();
        }
        catch (e) {
            L.info(`testing fail with: ${e}`);
            return Promise.reject(e);
        }

        L.info("finish testing");
    }


    protected static async testKeyreel(report: IReport, credentials: Credentials): Promise<void> {

        L.debug("create DB_1");
        let db1 = new DatabaseFile(`${Tester.DBFolderPath}keyreel.${Date.now()}.db.json`);

        L.debug("testing write");
        let engine1 = new KeyReelEngine(db1, { withoutProfile: true });
        await this.testWrite(engine1, report, credentials);

        L.debug("create DB_2");
        let db2 = new DatabaseFile(`${Tester.DBFolderPath}keyreel.${Date.now()}.db.json`);

        L.debug("testing write without click on buttons (only sites which did not save)");
        let engine2 = new KeyReelEngine(db2, { withoutProfile: true });
        await this.testWrite(engine2, report, credentials, true);

        L.debug("testing read (only sites which saved)");
        await this.testRead(new KeyReelEngine(db1, { withoutProfile: true }), report, credentials);
        await this.testRead(new KeyReelEngine(db2, { withoutProfile: true }), report, credentials);

        L.debug("delete DB");
        db1.deleteFile();
        db2.deleteFile();
    }

    protected static async testWrite(engine: IEngine, report: IReport, credentials: Credentials, useOnlyEnterButton = false): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        for (let credential of credentials.all()) {
            await report.start(credential.url);

            let result = await report.getResult(useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons);
            if (result !== undefined && result !== EReportResult.skip) {
                L.debug(`skip credential (already checked - ${result}, ${useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons})`);
                await report.finish();
                continue;
            }
            result = await report.getResult(useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons);
            if (result !== undefined && result !== EReportResult.skip) {
                L.debug(`skip credential (already checked - ${result}, ${useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons})`);
                await report.finish();
                continue;
            }

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

    protected static async testRead(engine: IEngine, report: IReport, credentials: Credentials): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        for (let credential of credentials.all()) {
            if (!await engine.canSaved(credential.url)) {
                L.debug(`skip credential (not saved)`);
                await report.finish();
                continue;
            }

            await report.start(credential.url);

            let result = await report.getResult(EReportTest.load);
            if (result !== undefined && result !== EReportResult.skip) {
                L.debug(`skip credential (already checked - ${result})`);
                await report.finish();
                continue;
            }

            L.debug("create test API");
            let api = new TestAPI(engine, credential, report);

            L.debug(`testing: '${credential.url}'`);
            try {
                L.debug("read credential");
                await api.checkReadCredential();
                L.debug("did read credential");
            } catch (e) {
                L.debug(`test filed with: '${e}'`);
            }

            await report.finish();
        }

        L.debug("shutdown engine");
        await engine.shutdown();

        await driver.quit();
    }
}


Tester.run(process.argv)
    .then(result => {
        L.info(`test result: ${result}`);
    })
    .catch(error => {
        L.info(`test error: ${error}`);
    });

