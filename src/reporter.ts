// import {IReport, ReportCsv, ReportLogger, ReportTxt} from "./report/report";
// import {ICredentialsFactory} from "./credentials/credentials";
// import {CredentialsFactoryDebug} from "./credentials/credentialsFactoryDebug";
// import {CredentialsFactoryPassDB} from "./credentials/credentialsFactoryPassDB";
// import {CredentialsFactorDomains} from "./credentials/credentialsFactoryDomains";
// import {IEngineFactory} from "./engine/engine";
// import {KeyReelEngineFactory} from "./engine/keyreel";
// import {TestAPI} from "./core/testapi";


import {Args} from "./common/args";
import {ReportExport} from "./report/report";
import {ReportExportTxt} from "./report/reportExportTxt";
import {ReportExportLogger} from "./report/reportExportLogger";

let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`;
}


class Reporter {

    static ReportsFolderPath = "./reports/";


    public static async run(args: string[]) {

        let dumpFile = Args.parseStrValueArg(args, "--dump");
        if (dumpFile === undefined) {
            console.warn("need --dump <file_path>");
            return;
        }

        let reportExport: ReportExport;
        if (Args.parseArg(args, "--txt")) {

            let filePath = `${Reporter.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
            reportExport = new ReportExportTxt(dumpFile, filePath);
        // } else if (Args.parseArg(args, "--csv")) {
        //
        //     let filePath = `${Reporter.ReportsFolderPath}tester-${timeFormat(new Date())}.csv`;
        //     reportExport = new ReportExportCsv(reportDumpFilePath, filePath);
        } else {

            reportExport = new ReportExportLogger(dumpFile);
        }
        await reportExport.export();
    }
}


Reporter.run(process.argv)
    .then(() => {
    })
    .catch(e => {
        console.warn(`reporter error: ${e}`);
    });
