import fs from "fs";
import {ReportExportLogger} from "./reportExportLogger";


export class ReportExportTxt extends ReportExportLogger {

    public constructor(dumpFilePath: string, reportFilePath: string) {

        super(dumpFilePath, true, reportFilePath);
    }

    protected async clearExport(): Promise<void> {
        if (this.reportFilePath !== undefined) {
            fs.writeFileSync(this.reportFilePath, "", {flag: "w"});
        }
    }

    protected async exportLine(message: string): Promise<void> {
        if (this.reportFilePath !== undefined) {
            fs.writeFileSync(this.reportFilePath, `${message}\n`, {flag: "a"});
        }
    }
}
