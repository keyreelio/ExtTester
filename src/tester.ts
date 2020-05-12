import {IEngine} from './engine/engine'
import {ConfigureLoggerForDebug, testerLogger as L} from "./common/log.config";
import {Credentials, ICredentialsFactory} from "./credentials/credentials";
import {TestAPI} from "./testapi";
import {EReportResult, EReportTest, IReport, ReportCsv, ReportLogger, ReportTxt} from "./report/report";
import {KeyReelEngine} from './engine/keyreel';
import {DatabaseFile} from "./database/databaseFile";
import {CredentialsFactoryPassDB} from "./credentials/credentialsFactoryPassDB";
import {CredentialsFactoryDebug} from "./credentials/credentialsFactoryDebug";
import {Server} from "./service/server";
import {IDatabase} from "./database/database";


let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`;
}


class Tester {

    static DBFolderPath = "./tmp/";
    static DumpFolderPath = "./tmp/";
    static ReportsFolderPath = "./reports/";


    public static async run(args: string[]) {

        if (args.includes("report")) {
            L.info("generate report");

            await this.report(args);
        } else {
            L.info("start testing");

            await this.testing(args);
        }
    }


    protected static async report(args: string[]) {
        let report: IReport;
        let reportDumpFilePath = `${Tester.DumpFolderPath}tester.dump.json`;
        if (args.includes("--txt")) {
            let filePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
            L.debug(`report to TXT file: ${filePath}`);
            report = new ReportTxt("KeyReel", reportDumpFilePath, filePath);
        } else if (args.includes("--csv")) {
            let filePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.csv`;
            L.debug(`report to CSV file: ${filePath}`);
            report = new ReportCsv("KeyReel", reportDumpFilePath, filePath);
        } else {
            L.debug("report to console");
            report = new ReportLogger("KeyReel", reportDumpFilePath);
        }
        await report.startup(true);
        await report.shutdown();
    }

    protected static async testing(args: string[]) {
        let debug = args.includes("debug");
        let toContinue = args.includes("continue");
        let paraller = args.includes("--count");

        let instanceCount = 1;
        if (paraller) {
            let index = args.indexOf("--count");
            let count = args[index + 1];
            if (count !== undefined) {
                let num = Number(count);
                if (num !== undefined && !isNaN(num)) {
                    instanceCount = num;
                }
            }
        }

        L.debug(`  arg.debug: ${debug}`);
        L.debug(`  arg.continue: ${toContinue}`);
        L.debug(`  arg.count: ${instanceCount}`);

        if (debug) {
            ConfigureLoggerForDebug();
        }

        try {
            let report: IReport;
            let credentialsFactory: ICredentialsFactory;
            if (debug) {
                credentialsFactory = new CredentialsFactoryDebug();
                let reportDumpFilePath = `${Tester.DumpFolderPath}tester-debug.dump.json`;
                report = new ReportLogger("KeyReel", reportDumpFilePath);
            } else {
                credentialsFactory = new CredentialsFactoryPassDB();
                let reportDumpFilePath = `${Tester.DumpFolderPath}tester.dump.json`;
                let reportFilePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
                L.debug(`save report to txt file: ${reportFilePath}`);
                report = new ReportTxt("KeyReel", reportDumpFilePath, reportFilePath);
            }

            L.debug("startup report");
            await report.startup(toContinue);

            L.debug("testing KeyReel (ServiceJS)");
            await this.testKeyreel(report, credentialsFactory, debug, toContinue, instanceCount);

            L.debug("shutdown report")
            await report.shutdown();
        }
        catch (e) {
            L.warn(`testing fail with: ${e}`);
            return Promise.reject(e);
        }

        L.info("finish testing");
    }

    protected static async testKeyreel(
            report: IReport,
            credentialsFactory: ICredentialsFactory,
            debug: boolean,
            toContinue: boolean,
            instanceCount: number): Promise<void> {

        let db1FilePath = `${Tester.DBFolderPath}keyreel.db.json`;
        let db2FilePath = `${Tester.DBFolderPath}keyreel.db.json`;
        if (debug) {
            db1FilePath = `${Tester.DBFolderPath}keyreel-debug.db.json`;
            db2FilePath = `${Tester.DBFolderPath}keyreel-debug.db.json`;
        }

        let db1 = new DatabaseFile(db1FilePath);
        if (!toContinue) db1.clear();

        let db2 = new DatabaseFile(db2FilePath);
        if (!toContinue) db2.clear();

        L.debug("testing write");
        await this.testWrites(db1, report,credentialsFactory, instanceCount, false);

        L.debug("testing write without click on buttons (only sites which did not save) - withoutProfile: true");
        await this.testWrites(db2, report,credentialsFactory, instanceCount, true);

        L.debug("testing read from DB1 (only sites which saved) - withoutProfile: true");
        await this.testReads(db1, report,credentialsFactory, instanceCount);

        L.debug("testing read from DB2 (only sites which saved) - withoutProfile: true");
        await this.testReads(db2, report,credentialsFactory, instanceCount);
    }

    protected static async testWrites(
        database: IDatabase,
        report: IReport,
        credentialsFactory: ICredentialsFactory,
        instanceCount: number,
        useOnlyEnterButton: boolean): Promise<void> {

        let server = new Server(database);

        L.debug("start server");
        await server.start();

        L.debug("testing write");
        let credentials = credentialsFactory.credentials();
        let writeTests1: any[] = [];
        for (let i = 0; i < instanceCount; i++) {
            let engine = new KeyReelEngine(server, { withoutProfile: true });
            writeTests1.push(this.testWrite(engine, report, credentials, useOnlyEnterButton));
        }
        await Promise.all(writeTests1);

        L.debug("stop server");
        await server.stop();
    }

    protected static async testReads(
        database: IDatabase,
        report: IReport,
        credentialsFactory: ICredentialsFactory,
        instanceCount: number): Promise<void> {

        let server = new Server(database);

        L.debug("start server");
        await server.start();

        L.debug("testing write");
        let credentials = credentialsFactory.credentials();
        let readTests1: any[] = [];
        for (let i = 0; i < instanceCount; i++) {
            let engine = new KeyReelEngine(server, { withoutProfile: true });
            readTests1.push(this.testRead(engine, report, credentials));
        }
        await Promise.all(readTests1);

        L.debug("stop server");
        await server.stop();
    }

    protected static async testWrite(
            engine: IEngine,
            report: IReport,
            credentials: Credentials,
            useOnlyEnterButton: boolean): Promise<void> {

        L.debug("startup engine");
        await engine.startup(true);

        let driver = await engine.getDriver();

        let credential = await credentials.shift();
        while (credential !== undefined) {
            L.debug(`report start: ${credential.url}`);
            await report.start(credential.url);

            let test = useOnlyEnterButton ? EReportTest.saveWithoutButtons : EReportTest.saveWithButtons;
            let result = await report.getResult(credential.url, test);

            if (result !== undefined && result !== EReportResult.unknown) {
                L.debug(`skip credential (already checked - ${result})`);
                await report.finish(credential.url, test);
                credential = await credentials.shift();
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
            await report.finish(credential.url, test);

            credential = await credentials.shift();
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

        let credential = await credentials.shift();
        while (credential !== undefined) {
            L.debug(`report start: ${credential.url}`);
            await report.start(credential.url);

            if (!await engine.canSaved(credential.url)) {
                L.debug(`skip credential (not saved)`);
                await report.finish(credential.url, EReportTest.load);
                credential = await credentials.shift();
                continue;
            }

            let result = await report.getResult(credential.url, EReportTest.load);
            if (result !== undefined && result !== EReportResult.unknown) {
                L.debug(`skip credential (already checked - ${result})`);
                await report.finish(credential.url, EReportTest.load);
                credential = await credentials.shift();
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
            await report.finish(credential.url, EReportTest.load);

            credential = await credentials.shift();
        }

        L.debug("shutdown engine");
        await engine.shutdown();

        L.debug("driver quit");
        await driver.quit();

        return Promise.resolve();
    }
}


Tester.run(process.argv)
    .then(() => {
    })
    .catch(e => {
        L.warn(`tester error: ${e}`);
    });

