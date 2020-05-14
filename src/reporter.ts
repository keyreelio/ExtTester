// import {IReport, ReportCsv, ReportLogger, ReportTxt} from "./report/report";
// import {ICredentialsFactory} from "./credentials/credentials";
// import {CredentialsFactoryDebug} from "./credentials/credentialsFactoryDebug";
// import {CredentialsFactoryPassDB} from "./credentials/credentialsFactoryPassDB";
// import {CredentialsFactorDomains} from "./credentials/credentialsFactoryDomains";
// import {IEngineFactory} from "./engine/engine";
// import {KeyReelEngineFactory} from "./engine/keyreel";
// import {TestAPI} from "./core/testapi";


let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`;
}


class Reporter {

    public static async run(args: string[]) {

        // let engineName = this.parseStrValueArg(args, "--engine", "keyreel");
        //
        // let report: IReport;
        // let reportDumpFilePath = `${Reporter.DumpFolderPath}tester.${engineName}.dump.json`;
        //
        // if (this.parseArg(args, "--txt")) {
        //
        //     let filePath = `${Reporter.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
        //     L.debug(`report to TXT file: ${filePath}`);
        //     report = new ReportTxt("KeyReel", reportDumpFilePath, filePath);
        // } else if (this.parseArg(args, "--csv")) {
        //
        //     let filePath = `${Reporter.ReportsFolderPath}tester-${timeFormat(new Date())}.csv`;
        //     L.debug(`report to CSV file: ${filePath}`);
        //     report = new ReportCsv("KeyReel", reportDumpFilePath, filePath);
        // } else {
        //
        //     L.debug("report to console");
        //     report = new ReportLogger("KeyReel", reportDumpFilePath);
        // }
        // await report.startup(true);
        // await report.shutdown();
    }
}


Reporter.run(process.argv)
    .then(() => {
    })
    .catch(e => {
        console.warn(`reporter error: ${e}`);
    });
