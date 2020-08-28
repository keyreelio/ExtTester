/*
import {EReportParsePart, EReportResult, EReportTest} from "./report";
import {ReportTxt} from "./reportTxt";
*/


import {EReportParsePart, EReportResult, EReportTest, ETimer, IFlags, ReportExport, ReportItem} from "./report";
import fs from "fs";

export class ReportExportCsv extends ReportExport {

    public constructor(dumpFilePath: string, reportFilePath: string | undefined = undefined) {

        super(dumpFilePath, reportFilePath);
    }


    protected async clearExport(): Promise<void> {
        if (this.reportFilePath !== undefined) {
            fs.writeFileSync(this.reportFilePath, "", {flag: "w"});
        }
    }

    protected async exportHeader(): Promise<void> {

        let map = new Map(Object.entries(this.reports));
        let reports: ReportItem[] = [];
        map.forEach((report: ReportItem, u: string) => {
            reports.push(report);
        });
        reports.sort(function(r1, r2) {
            return r1.createTime - r2.createTime;
        });

        let errors = 0
        let warnings = 0
        let success = 0
        let skipped = 0
        for (let report of reports) {
            let result = report.results[EReportTest.fill];
            if (result === undefined) continue;

            switch (result.result) {
                case EReportResult.skip:
                    skipped++;
                    break;
                case EReportResult.auto:
                    success++;
                    break;
                case EReportResult.manual:
                case EReportResult.manualAfterLoggedIn:
                case EReportResult.manualBeforeLoggedIn:
                    warnings++;
                    break;
                case EReportResult.fail:
                    errors++;
                    break;
                default:
                    skipped++;
            }
        }

        let passed = reports.length - skipped
        let fails_with_warnings = '' + Math.round((errors + warnings) / passed * 100) + '%';
        let fails_without_warnings = Math.round((errors) / passed * 100) + '%';


        await this.exportLine(`"","","","","","",""`);
        await this.exportLine(`"","date:","","","","",""`);
        await this.exportLine(`"","version:","","","","",""`);
        await this.exportLine(`"","comment:","","","","",""`);
        await this.exportLine(`"","DB comment:","","","","",""`);
        await this.exportLine(`"","","","","","",""`);
        await this.exportLine(`"","passed:","${passed}","","","",""`);
        await this.exportLine(`"","errors:","${errors}","","","",""`);
        await this.exportLine(`"","warnings:","${warnings}","","","",""`);
        await this.exportLine(`"","success:","","${success}","","",""`);
        await this.exportLine(`"","fails with warnings:","${fails_with_warnings}","","","",""`);
        await this.exportLine(`"","fails without warnings:","${fails_without_warnings}","","","",""`);
        await this.exportLine(`"","","","","","",""`);
        await this.exportLine(`"index","url","result","flags","time (s)","reasons","comment"`);
    }

    protected async exportReports(): Promise<void> {
        let map = new Map(Object.entries(this.reports));
        let reports: ReportItem[] = [];
        map.forEach((report: ReportItem, u: string) => {
            reports.push(report);
        });
        reports.sort(function(r1, r2) {
            return r1.createTime - r2.createTime;
        });
        let count = 0;
        for (let report of reports) {
            this.exportReportTest(count++, report, EReportTest.fill).then();
        }
    }

    protected async exportReportTest(index: number, report: ReportItem, test: EReportTest): Promise<void> {
        let result = report.results[test];
        if (result === undefined) return;

        let part: string[] = [];

        part.push(`"${index+1}"`);
        part.push(`"${report.url}"`);
        switch (result.result) {
            case EReportResult.skip:
                part.push(`"SKIP"`)
                break;
            case EReportResult.auto:
                part.push(`"SUCCESS"`)
                break;
            case EReportResult.manual:
            case EReportResult.manualAfterLoggedIn:
            case EReportResult.manualBeforeLoggedIn:
                part.push(`"WARNING"`)
                break;
            case EReportResult.fail:
                part.push(`"ERROR"`)
                break;
            default:
                part.push(`"SKIP"`)
        }
        part.push(`"${this.flagsToString(result.flags)}"`);
        part.push(`"${Math.round(result.timers[ETimer.check] / 1000)}"`);
        switch (result.result) {
            case EReportResult.auto:
                part.push(`"Auto-fill worked, auto-login not worked"`)
                break;
            case EReportResult.manual:
            case EReportResult.manualAfterLoggedIn:
            case EReportResult.manualBeforeLoggedIn:
                part.push(`"Manual fill worked, auto-fill not worked"`)
                break;
            case EReportResult.fail:
                part.push(`"Site opened but was not able to insert password without copy-paste"`)
                break;
            default:
                part.push(`""`)
        }
        part.push(`"${result.failMessage}"`)

        await this.exportLine(`${part.join(this.separator())}`);
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

    protected async exportLine(message: string): Promise<void> {
        if (this.reportFilePath !== undefined) {
            fs.writeFileSync(this.reportFilePath, `${message}\n`, {flag: "a"});
        }
    }

    protected separator(): string {
        return ",";
    }
}
