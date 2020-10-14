import {Args} from "./common/args";
import {ReportExport} from "./report/report";
import {ReportExportTxt} from "./report/reportExportTxt";
import {ReportExportLogger} from "./report/reportExportLogger";
import {ReportExportCsv} from "./report/reportExportCsv";
import {ReportExportSuccessDomains} from "./report/reportExportSuccessDomains";


let timeFormat = function(d: Date): string {
    return `${d.getUTCFullYear()}.${d.getUTCMonth()}.${d.getUTCDate()}.${d.getUTCHours()}.${d.getUTCMinutes()}.${d.getUTCSeconds()}`;
}


class Reporter {

    static ReportsFolderPath = "./reports/";
    static ResourcesFolderPath = "./resources/";


    public static async run(args: string[]) {

        let dumpFile = Args.parseStrValueArg(args, "--dump");
        if (dumpFile === undefined) {
            console.warn("need --dump <file_path>");
            return;
        }

        let reportExport: ReportExport;
        if (Args.parseArg(args, "--domains")) {

            let filePath = `${Reporter.ResourcesFolderPath}domains-success.json`;
            reportExport = new ReportExportSuccessDomains(dumpFile, filePath);
        } else if (Args.parseArg(args, "--txt")) {

            let filePath = `${Reporter.ReportsFolderPath}tester-${timeFormat(new Date())}.txt`;
            reportExport = new ReportExportTxt(dumpFile, filePath);
        } else if (Args.parseArg(args, "--csv")) {

            let filePath = `${Reporter.ReportsFolderPath}tester-${timeFormat(new Date())}.csv`;
            reportExport = new ReportExportCsv(dumpFile, filePath);
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
