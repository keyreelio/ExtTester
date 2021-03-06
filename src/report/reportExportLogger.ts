import {reportLogger as L} from "../common/log.config";
import {EReportParsePart, EReportResult, ReportExport, IFlags, ReportItem, EReportTest, ETimer} from "./report";


export class ReportExportLogger extends ReportExport {

    public constructor(dumpFilePath: string, reportFilePath: string | undefined = undefined) {

        super(dumpFilePath, reportFilePath);
    }


    protected async exportHeader(): Promise<void> {
        await this.exportLine(`  test:`);
        await this.exportLine(`    SUB  - save using login button`);
        await this.exportLine(`    SWB  - save without login button (press 'Enter')`);
        await this.exportLine(`    FSUB - false save using login button`);
        await this.exportLine(`    FSWB - false save without login button (press 'Enter')`);
        await this.exportLine(`    FILL - insert credentials into login form`);
        await this.exportLine(`  save credentials result:`);
        await this.exportLine(`    MBL - manually before logged in`);
        await this.exportLine(`    MAL - manually after logged in`);
        await this.exportLine(`     A  - automatically after logged in`);
        await this.exportLine(`     F  - failed (not saved)`);
        await this.exportLine(`     -  - skipped`);
        await this.exportLine(`  flags: SFLPIN`);
        await this.exportLine(`    S - page has a "Sign In" button`);
        await this.exportLine(`    I - page is logged in`);
        await this.exportLine(`    F - page has a full login form`);
        await this.exportLine(`    L - page has a first step of login form`);
        await this.exportLine(`    P - page has a second step of login form`);
        await this.exportLine(`    N - page is not logged in`); //page did not parse`);
        await this.exportLine(`  times:`);
        await this.exportLine(`    tchck - duration time of test (sec)`);
        await this.exportLine(`    tprsr - duration time of run parser (sec)`);
        await this.exportLine(`======================================================================================================`);
        await this.exportLine("  idx | url                                                    | test | res | SIFLPN | tchck | tprsr |");
        await this.exportLine(`------------------------------------------------------------------------------------------------------`);
    }

    protected async exportReport(index: number, report: ReportItem): Promise<void> {
        let firstline = true;
        var testCount = 0;
        for (let test in report.results) {
            let result = report.results[test];
            if (result === undefined) continue;
            testCount++;

            let part: string[] = [];

            part.push(firstline ? this.indexToString(index) : "".padEnd(6));
            part.push(firstline ? this.urlToString(this.getHost(report.url)) : "".padEnd(56));
            part.push(ReportExport.testName(Number(test)));
            part.push(this.resultToString(result.result));
            part.push(` ${this.flagsToString(result.flags)} `);
            part.push(this.timeToString(result.timers[ETimer.check]));
            //part.push(this.timeToString(result.timers[ETimer.scanner]));
            part.push(this.timeToString(result.timers[ETimer.parser]));
            part.push(` ${result.failMessage.length > 0 ? result.failMessage.replace(/\\s+/g, ' ').trim() : "+"}`);

            await this.exportLine(`${part.join(this.separator())}`);
            firstline = false;
        }
        if (testCount > 1) {
            await this.exportLine(`------------------------------------------------------------------------------------------------------`);
        }
    }

    protected async exportLine(line: string): Promise<void> {
        L.warn(line);
    }

    protected async exportFooter(): Promise<void> {
        await this.exportLine(`------------------------------------------------------------------------------------------------------`);
        await this.exportLine("  idx | url                                                    | test | res | SIFLPN | tchck | tprsr |");
        await this.exportLine(`======================================================================================================`);
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

        part.push(flags[EReportParsePart.signInButton] ? "S" : "-");
        part.push(flags[EReportParsePart.loggedIn] ? "I" : "-");
        part.push(flags[EReportParsePart.fullLoginForm] ? "F" : "-");
        part.push(flags[EReportParsePart.firstStepLoginForm] ? "L" : "-");
        part.push(flags[EReportParsePart.secondStepLoginForm] ? "P" : "-");
        part.push(flags[EReportParsePart.noLoggedIn] ? "N" : "-");

        return part.join("");
    }

    protected timeToString(time: number): string {
        return ` ${super.timeToString(time).padStart(5)} `;
    }
}
