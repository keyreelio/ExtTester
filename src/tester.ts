import {IEngineFactory} from './engine/engine'
import {ConfigureLoggerForDebug, testerLogger as L} from "./common/log.config";
import {ICredentialsFactory} from "./credentials/credentials";
import {IReport, ReportCsv, ReportLogger, ReportTxt} from "./report/report";
import {KeyReelEngineFactory} from './engine/keyreel';
import {CredentialsFactoryPassDB} from "./credentials/credentialsFactoryPassDB";
import {CredentialsFactoryDebug} from "./credentials/credentialsFactoryDebug";
import {CredentialsFactorDomains} from "./credentials/credentialsFactoryDomains";
import {TestAPI} from "./testapi";


//TODO: add duration time to report
//TODO: separate flags to tests
//TODO: add test for negative save with ded credential
//TODO: add test for autoload for sites without credential


let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`;
}


class Tester {

    static DumpFolderPath = "./tmp/";
    static ReportsFolderPath = "./reports/";


    public static async run(args: string[]) {

        if (this.parseArg(args, "report")) {
            L.debug("generate report");

            await this.report(args);
        } else {
            L.debug("start testing");

            await this.testing(args);

            L.debug("finish testing");
        }
    }

    protected static async testing(args: string[]) {
        let debug = this.parseArg(args, "debug");
        let toContinue = this.parseArg(args, "continue");
        let domainDB = this.parseArg(args, "--domains");
        let writeDisable = this.parseArg(args, "--withoutWrite");
        let failWriteDisable = this.parseArg(args, "--withoutFailWrite");
        let readDisable = this.parseArg(args, "--withoutRead");
        let threadCount = this.parseNumValueArg(args, "--count", 1);
        let engineName = this.parseStrValueArg(args, "--engine", "keyreel");

        failWriteDisable = true;
        if (domainDB) {
            writeDisable = true;
            failWriteDisable = false;
            readDisable = false;
        }

        if (debug) {
            ConfigureLoggerForDebug();
        }

        L.debug(`args:`);
        L.debug(`  debug: ${debug}`);
        L.debug(`  continue: ${toContinue}`);
        L.debug(`  domainDB: ${domainDB}`);
        L.debug(`  writeDisable: ${writeDisable}`);
        L.debug(`  failWriteDisable: ${failWriteDisable}`);
        L.debug(`  readDisable: ${readDisable}`);
        L.debug(`  threadCount: ${threadCount}`);
        L.debug(`  engine: ${engineName}`);

        try {
            let report: IReport;
            let credentialsFactory: ICredentialsFactory;
            if (debug) {
                credentialsFactory = new CredentialsFactoryDebug();
                let reportDumpFilePath = `${Tester.DumpFolderPath}tester-debug.${engineName}.dump.json`;
                report = new ReportLogger(engineName, reportDumpFilePath);
            } else {
                if (domainDB) {
                    writeDisable = true;
                    failWriteDisable = false;
                    readDisable = false;
                    credentialsFactory = new CredentialsFactorDomains();
                } else {
                    credentialsFactory = new CredentialsFactoryPassDB();
                }
                let reportDumpFilePath = `${Tester.DumpFolderPath}tester.${engineName}.dump.json`;
                let reportFilePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.${engineName}.txt`;
                report = new ReportTxt(engineName, reportDumpFilePath, reportFilePath);
            }

            let engineFactory: IEngineFactory;
            if (engineName === "keyreel") {
                engineFactory = new KeyReelEngineFactory({ withoutProfile: true });
            } else /* by default use KeyReel engine*/ {
                engineFactory = new KeyReelEngineFactory({ withoutProfile: true });
            }

            L.debug("startup report");
            await report.startup(toContinue);

            let test = new TestAPI(report, engineFactory, credentialsFactory, threadCount);

            if (!writeDisable) {
                L.debug("testing write");
                await test.checkWrites(false);

                L.debug("testing write without click on buttons (only sites which did not save) - withoutProfile: true");
                await test.checkWrites(true);
            }

            if (!failWriteDisable) {
                L.debug("testing fail write");
                await test.checkFailWrites();
            }

            if (!readDisable) {
                L.debug("testing read (only sites which saved) - withoutProfile: true");
                await test.checkReads();
            }

            L.debug("shutdown report")
            await report.shutdown();
        }
        catch (e) {
            L.warn(`testing fail with: ${e}`);
            return Promise.reject(e);
        }
    }


    protected static async report(args: string[]) {
        let engineName = this.parseStrValueArg(args, "--engine", "keyreel");

        let report: IReport;
        let reportDumpFilePath = `${Tester.DumpFolderPath}tester.${engineName}.dump.json`;

        if (this.parseArg(args, "--txt")) {

            let filePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
            L.debug(`report to TXT file: ${filePath}`);
            report = new ReportTxt("KeyReel", reportDumpFilePath, filePath);
        } else if (this.parseArg(args, "--csv")) {

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

    protected static parseArg(args: string[], arg: string): boolean {
        return args.includes(arg);
    }

    protected static parseStrValueArg(args: string[], arg: string, defValue: string = ""): string {
        if (!args.includes(arg)) return defValue;
        let index = args.indexOf(arg);
        if (index < 0 || index === (args.length - 1)) return defValue;
        let value = args[index + 1]
        if (value === undefined) return defValue;
        return value;
    }

    protected static parseNumValueArg(args: string[], arg: string, defValue: number = 0): number {
        let value = Number(this.parseStrValueArg(args, arg, `${defValue}`));
        if (value === undefined || !isNaN(value)) return defValue;
        return value;
    }
}


Tester.run(process.argv)
    .then(() => {
    })
    .catch(e => {
        L.warn(`tester error: ${e}`);
    });

