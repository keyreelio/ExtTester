import {IEngine} from './engine/engine'
import {ConfigureLoggerForDebug, testerLogger as L} from "./common/log.config";
import {Credentials} from "./credentials/credentials";
import {TestAPI} from "./testapi";
import {EReportResult, EReportTest, IReport, ReportCsv, ReportLogger, ReportTxt} from "./report/report";
import {KeyReelEngine} from './engine/keyreel';
import {DatabaseFile} from "./database/databaseFile";


let timeFormat = function(date: Date): string {
    return `${date.getUTCFullYear()}.${date.getUTCMonth()}.${date.getUTCDate()}.${date.getUTCHours()}.${date.getUTCMinutes()}.${date.getUTCSeconds()}`;
}


class Tester {

    static DBFolderPath = "./chrome_profiles/";
    static ReportsFolderPath = "./reports/";


    public static async run(args: string[]) {

        if (args.includes("report")) {
            L.info("generate report");

            await this.report(args);
        } else {
            L.info("start testing");

            let debug = args.includes("debug");
            let toContinue = args.includes("continue");

            L.debug(`  arg.debug: ${debug}`);
            L.debug(`  arg.continue: ${toContinue}`);

            if (debug) {
                ConfigureLoggerForDebug();
            }

            try {
                let report: IReport;
                let credentials: Credentials = new Credentials();
                if (!debug) {
                    L.debug("load credential from: './src/common/passdb.ts'");
                    //credentials.loadFromPassDB();

                    let reportFilePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
                    L.debug(`save report to txt file: ${reportFilePath}`);
                    report = new ReportTxt("KeyReel", reportFilePath);
                } else {
                    report = new ReportLogger("KeyReel");
                }

                L.debug("startup report");
                await report.startup(toContinue);

                L.debug("testing KeyReel (ServiceJS)");
                await this.testKeyreel(report, credentials);

                L.debug("shutdown report")
                await report.shutdown();
            }
            catch (e) {
                L.warn(`testing fail with: ${e}`);
                return Promise.reject(e);
            }

            L.info("finish testing");
        }
    }

    protected static async report(args: string[]) {
        let report: IReport;
        if (args.includes("--txt")) {
            let filePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
            L.debug(`report to TXT file: ${filePath}`);
            report = new ReportTxt("KeyReel", filePath);
        } else if (args.includes("--csv")) {
            let filePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.csv`;
            L.debug(`report to CSV file: ${filePath}`);
            report = new ReportCsv("KeyReel", filePath);
        } else {
            L.debug("report to console");
            report = new ReportLogger("KeyReel");
        }
        await report.startup(true);
        await report.shutdown();
    }

    protected static async testKeyreel(report: IReport, credentials: Credentials): Promise<void> {

        let db1FilePath = `${Tester.DBFolderPath}keyreel.${Date.now()}.db.json`;
        L.debug(`create DB1: ${db1FilePath}`);
        let db1 = new DatabaseFile(db1FilePath);

        L.debug("testing write - withoutProfile: true");
        await this.testWrite(new KeyReelEngine(db1, { withoutProfile: true }), report, credentials);

        let db2FilePath = `${Tester.DBFolderPath}keyreel.${Date.now()}.db.json`;
        L.debug(`create DB2: ${db2FilePath}`);
        let db2 = new DatabaseFile(db2FilePath);

        L.debug("testing write without click on buttons (only sites which did not save) - withoutProfile: true");
        await this.testWrite(new KeyReelEngine(db2, { withoutProfile: true }), report, credentials, true);

        L.debug("testing read from DB1 (only sites which saved) - withoutProfile: true");
        await this.testRead(new KeyReelEngine(db1, { withoutProfile: true }), report, credentials);

        L.debug("testing read from DB2 (only sites which saved) - withoutProfile: true");
        await this.testRead(new KeyReelEngine(db2, { withoutProfile: true }), report, credentials);

        L.debug("delete DBs");
        db1.deleteFile();
        db2.deleteFile();
    }

    protected static async testWrite(engine: IEngine, report: IReport, credentials: Credentials, useOnlyEnterButton = false): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        for (let credential of credentials.all()) {
            L.debug(`report start: ${credential.url}`);
            await report.start(credential.url);

            let result = await report.getResult(useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons);
            if (result !== undefined && result !== EReportResult.skip) {
                L.debug(`skip credential (already checked - ${result})`);
                await report.finish();
                continue;
            }

            L.debug("create test API");
            let api = new TestAPI(engine, credential, report);

            try {
                L.debug("check write credential");
                await api.checkWriteCredential({useOnlyEnterButton: useOnlyEnterButton});
            } catch (e) {
                L.warn(`write credential filed with: '${e}'`);
            }

            L.debug("report finish");
            await report.finish();
        }

        L.debug("shutdown engine");
        await engine.shutdown();

        L.debug("driver quit");
        await driver.quit();
    }

    protected static async testRead(engine: IEngine, report: IReport, credentials: Credentials): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        for (let credential of credentials.all()) {
            L.debug(`report start: ${credential.url}`);
            await report.start(credential.url);

            if (!await engine.canSaved(credential.url)) {
                L.debug(`skip credential (not saved)`);
                await report.finish();
                continue;
            }

            let result = await report.getResult(EReportTest.load);
            if (result !== undefined && result !== EReportResult.skip) {
                L.debug(`skip credential (already checked - ${result})`);
                await report.finish();
                continue;
            }

            L.debug("create test API");
            let api = new TestAPI(engine, credential, report);

            try {
                L.debug("read credential");
                await api.checkReadCredential();
            } catch (e) {
                L.warn(`read credential filed with: '${e}'`);
            }

            L.debug("report finish");
            await report.finish();
        }

        L.debug("shutdown engine");
        await engine.shutdown();

        L.debug("driver quit");
        await driver.quit();
    }
}


Tester.run(process.argv)
    .then(result => {
    })
    .catch(e => {
        L.warn(`tester error: ${e}`);
    });

