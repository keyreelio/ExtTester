import {IEngineFactory} from './engine/engine'
import {ConfigureLoggerForDebug, testerLogger as L} from "./common/log.config";
import {ICredentialsFactory} from "./credentials/credentials";
import {Report, ReportExport} from "./report/report";
import {KeyReelEngineFactory} from './engine/keyreel';
import {CredentialsFactoryPassDB} from "./credentials/credentialsFactoryPassDB";
import {CredentialsFactoryDebug} from "./credentials/credentialsFactoryDebug";
import {CredentialsFactorDomains} from "./credentials/credentialsFactoryDomains";
import {TestAPI} from "./core/testapi";
import {Args} from "./common/args";
import {ReportExportLogger} from "./report/reportExportLogger";
import {ReportExportTxt} from "./report/reportExportTxt";


//TODO: add duration time to report (write/read, parser, scanner)
//TODO: separate flags to tests
//TODO: add store report to ./reports/report-{date}.{engine}.json
//TODO: add export report from .json file to .txt/.csv/ etc files with format
//        --txt, --csv  -  formats
//        --flags print flags
//        --withoutWrite
//        --withoutFailWrite
//        --withoutRead
//        --withoutTimes
//TODO: add test for negative save with ded credential
//TODO: add separates logs for credential


let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`;
}


class Tester {

    static DumpFolderPath = "./tmp/";
    static ReportsFolderPath = "./reports/";


    public static async run(args: string[]) {

        let debug = Args.parseArg(args, "debug")
        let toContinue = Args.parseArg(args, "continue")
        let domainDB = Args.parseArg(args, "--domains")
        let writeDisable = Args.parseArg(args, "--withoutWrite")            //|| true
        let failWriteDisable = Args.parseArg(args, "--withoutFailWrite")    //|| true
        let readDisable = Args.parseArg(args, "--withoutRead")              //|| true
        let threadCount = Args.parseNumValueArg(args, "--count", 1)
        let engineName = Args.parseStrValueArg(args, "--engine", "keyreel")

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
            let credentialsFactory: ICredentialsFactory;
            let dumpFilePath = `${Tester.DumpFolderPath}tester.${engineName}.dump.json`;
            let reportFilePath: string | undefined = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.${engineName}.json`;

            if (debug) {
                credentialsFactory = new CredentialsFactoryDebug();
                dumpFilePath = `${Tester.DumpFolderPath}tester-debug.${engineName}.dump.json`;
                reportFilePath = undefined;
            } else {
                credentialsFactory = new CredentialsFactoryPassDB();
            }
            let report = new Report(engineName, dumpFilePath, reportFilePath, toContinue);

            if (domainDB) {
                writeDisable = true;
                failWriteDisable = false;
                readDisable = false;
                credentialsFactory = new CredentialsFactorDomains();
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

            let reportExport: ReportExport;
            if (debug) {
                reportExport = new ReportExportLogger(dumpFilePath);
            } else {
                let reportTxtFilePath = `${Tester.ReportsFolderPath}tester-${timeFormat(new Date())}.${engineName}.txt`;
                reportExport = new ReportExportTxt(dumpFilePath, reportTxtFilePath);
            }
            await reportExport.export();
        }
        catch (e) {
            L.warn(`testing fail with: ${e}`);
            return Promise.reject(e);
        }
    }
}


Tester.run(process.argv)
    .then(() => {
    })
    .catch(e => {
        L.warn(`tester error: ${e}`);
    });

