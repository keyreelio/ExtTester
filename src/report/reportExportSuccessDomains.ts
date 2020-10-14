import {reportLogger as L} from "../common/log.config";
import {EReportParsePart, EReportResult, ReportExport, IFlags, ReportItem, EReportTest, ETimer} from "./report";
import fs from "fs";


export class ReportExportSuccessDomains extends ReportExport {

    public constructor(dumpFilePath: string, reportFilePath: string | undefined = undefined) {

        super(dumpFilePath, reportFilePath);
    }


    protected async clearExport(): Promise<void> {
        if (this.reportFilePath !== undefined) {
            fs.writeFileSync(this.reportFilePath, "", {flag: "w"});
        }
    }

    protected async exportHeader(): Promise<void> {
        await this.exportLine(`[`);
    }

    protected async exportReport(index: number, report: ReportItem): Promise<void> {
        for (let test in report.results) {
            let result = report.results[test];
            if (result === undefined || result.result !== EReportResult.auto) continue;
            if (result.failMessage.includes("[VPN]")) continue;

            await this.exportLine(`"${report.url}",`);
        }
    }

    protected async exportLine(message: string): Promise<void> {
        if (this.reportFilePath !== undefined) {
            fs.writeFileSync(this.reportFilePath, `${message}\n`, {flag: "a"});
        }
    }

    protected async exportFooter(): Promise<void> {
        await this.exportLine(`""`);
        await this.exportLine(`]`);
    }
}
