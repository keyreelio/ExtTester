import {reportLogger as L} from "../common/log.config";
import {EReportParsePart, EReportResult, ReportExport, IFlags, ReportItem, EReportTest, ETimer} from "./report";


export class ReportExportLogger extends ReportExport {

    public constructor(dumpFilePath: string, reportFilePath: string | undefined = undefined) {

        super(dumpFilePath, reportFilePath);
    }


    protected async exportHeader(): Promise<void> {
        await this.exportLine(`  test:`);
        await this.exportLine(`    SWHB - save with login button,  MBL - manual before logedin, MAL - manual after loggedin`);
        await this.exportLine(`    SWOB - save with out login button (press 'Enter'),  MBL - manual before logedin, MAL - manual after loggedin`);
        await this.exportLine(`    LOAD - load`);
        await this.exportLine(`  result:`);
        await this.exportLine(`    MBL - manual before logedin`);
        await this.exportLine(`    MAL - manual after loggedin`);
        await this.exportLine(`     A  - auto after loggedin`);
        await this.exportLine(`     F  - failed`);
        await this.exportLine(`     -  - skipped`);
        await this.exportLine(`  flags: SFLPIN`);
        await this.exportLine(`    S - page has sing in button`);
        await this.exportLine(`    F - page has full login form`);
        await this.exportLine(`    L - page has first step of login form`);
        await this.exportLine(`    P - page has second step of login form`);
        await this.exportLine(`    I - page is logged in`);
        await this.exportLine(`    N - page did not parse`);
        await this.exportLine(`  times:`);
        await this.exportLine(`    tchck - duration time of test (sec)`);
        await this.exportLine(`    tscnr - duration time of run scanner (sec)`);
        await this.exportLine(`    tprsr - duration time of run parser (sec)`);
        await this.exportLine(`==============================================================================================================`);
        await this.exportLine("  idx | url                                                    | test | res | SFLPIN | tchck | tscnr | tprsr |");
        await this.exportLine(`--------------------------------------------------------------------------------------------------------------`);
    }

    protected async exportReport(index: number, report: ReportItem): Promise<void> {
        let firstline = true;
        for (let test in report.results) {
            let result = report.results[test];
            if (result === undefined) continue;

            let part: string[] = [];

            part.push(firstline ? this.indexToString(index) : "".padEnd(6));
            part.push(firstline ? this.urlToString(report.url) : "".padEnd(56));
            part.push(this.testName(Number(test)));
            part.push(this.resultToString(result.result));
            part.push(this.flagsToString(result.flags));
            part.push(this.timeToString(result.timers[ETimer.check]));
            part.push(this.timeToString(result.timers[ETimer.scanner]));
            part.push(this.timeToString(result.timers[ETimer.parser]));
            part.push(` ${result.failMessage}`);

            this.exportLine(`${part.join(this.separator())}`);
            firstline = false;
        }
        await this.exportLine(`--------------------------------------------------------------------------------------------------------------`);
    }

    protected async exportLine(line: string): Promise<void> {
        L.warn(line);
    }

    protected async exportFooter(): Promise<void> {
        await this.exportLine("  idx | url                                                    | test | res | SFLPIN | tchck | tscnr | tprsr |");
        await this.exportLine(`==============================================================================================================`);
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

    protected flagsToString(flags: IFlags): string {
        let part: string[] = [];

        part.push(this.flagToString(flags[EReportParsePart.singInButton]));
        part.push(this.flagToString(flags[EReportParsePart.fullLoginForm]));
        part.push(this.flagToString(flags[EReportParsePart.firstStepLoginForm]));
        part.push(this.flagToString(flags[EReportParsePart.secondStepLoginForm]));
        part.push(this.flagToString(flags[EReportParsePart.loggedIn]));
        part.push(this.flagToString(flags[EReportParsePart.notParsed]));

        return ` ${part.join("")} `;
    }

    protected timeToString(time: number): string {
        return ` ${super.timeToString(time).padStart(5)} `;
    }
}
