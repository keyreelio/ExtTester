import {reportLogger as L} from "../common/log.config";
import { EReportResult, ReportExport} from "./report";


export class ReportExportLogger extends ReportExport {

    public constructor(dumpFilePath: string, reportFilePath: string | undefined = undefined) {

        super(dumpFilePath, reportFilePath);
    }


    protected async exportHeader(): Promise<void> {
        await this.exportLine(`  swb - save with login button,  MBL - manual before logedin, MAL - manual after loggedin`);
        await this.exportLine(`  sob - save with out login button (press 'Enter'),  MBL - manual before logedin, MAL - manual after loggedin`);
        await this.exportLine(`  lod - load`);
        await this.exportLine(`  sib - page has sing in button`);
        await this.exportLine(`  ffl - page has full login form`);
        await this.exportLine(`  ffs - page has first step of login form`);
        await this.exportLine(`  fss - page has second step of login form`);
        await this.exportLine(`  lin - page is logged in`);
        await this.exportLine(`  nps - page did not parse`);
        await this.exportLine(`----------------------------------------------------------------------------------------------------------------------`);
        await this.exportLine(`  engine: ${this.engineName}`);
        await this.exportLine(`----------------------------------------------------------------------------------------------------------------------`);
        await this.exportLine("  idx | url                                                    | swb | sob | lod | sib | ffl | ffs | fss | lin | nps |");
        await this.exportLine(`----------------------------------------------------------------------------------------------------------------------`);
    }

    protected async exportLine(line: string): Promise<void> {
        L.warn(line);
    }

    protected async exportFooter(): Promise<void> {
        await this.exportLine(`----------------------------------------------------------------------------------------------------------------------`);
        await this.exportLine("  idx | url                                                    | swb | sob | lod | sib | ffl | ffs | fss | lin | nps |");
        await this.exportLine(`----------------------------------------------------------------------------------------------------------------------`);
    }

    protected indexToString(index: number): string {
        return `${super.indexToString(index).padStart(5, " ")} `;
    }

    protected urlToString(url: string): string {
        return "  ".concat(url).padEnd(56, " ");
    }

    protected resultToString(result: EReportResult): string {
        switch (result) {
            case EReportResult.skip: return "  -  ";
            case EReportResult.manual: return "  M  ";
            case EReportResult.manualBeforeLoggedIn: return " MBL ";
            case EReportResult.manualAfterLoggedIn: return " MAL ";
            case EReportResult.fail: return "  F  ";
            case EReportResult.auto: return "  A  ";
            case EReportResult.waitApprove: return "  W  ";
        }
        return "     ";
    }

    protected flagToString(flag: boolean): string {
        return flag ? "  X  " : "     ";
    }

    protected separator(): string {
        return "|";
    }
}
