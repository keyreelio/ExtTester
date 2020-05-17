import {reportLogger as L} from "../common/log.config";
import fs from "fs";
import {Mutex} from "../common/mutex";


interface IReports {
    [key: string]: ReportItem
}

interface IResults {
    [key: number]: EReportResult
}

interface IParseParts {
    [key: number]: boolean
}

class ReportItem {
    url: string;
    createTime: number = 0;
    results: IResults = {};
    parseParts: IParseParts = {};
    failMessages: string[] = [];

    public constructor(url: string) {
        this.url = url;
        this.createTime = Date.now();
        this.results[EReportTest.saveWithButtons] = EReportResult.unknown;
        this.results[EReportTest.saveWithoutButtons] = EReportResult.unknown;
        this.results[EReportTest.load] = EReportResult.unknown;
        this.parseParts[EReportParsePart.singInButton] = false;
        this.parseParts[EReportParsePart.fullLoginForm] = false;
        this.parseParts[EReportParsePart.firstStepLoginForm] = false;
        this.parseParts[EReportParsePart.secondStepLoginForm] = false;
        this.parseParts[EReportParsePart.notParsed] = false;
    }
}


export enum EReportResult {
    unknown,
    skip,
    manual,
    manualBeforeLoggedIn,
    manualAfterLoggedIn,
    auto,
    waitApprove,
    fail,
}

export enum EReportTest {
    saveWithButtons,
    saveWithoutButtons,
    load
}

export enum EReportParsePart {
    singInButton,
    fullLoginForm,
    firstStepLoginForm,
    secondStepLoginForm,
    loggedIn,
    notParsed
}

export class Report {

    protected engineName: string;
    protected dumpFilePath: string;
    protected reportFilePath: string | undefined;
    protected reports: IReports = {};
    protected mutex = new Mutex();


    public constructor(
            engineName: string,
            dumpFilePath: string,
            reportFilePath: string | undefined,
            restoreFromDump: boolean) {

        this.engineName = engineName;
        this.dumpFilePath = dumpFilePath;
        this.reportFilePath = reportFilePath;
        if (restoreFromDump) {
            this.loadDump();
        }
    }

    public async startup(restoreFromDump: boolean): Promise<void> {
        return await this.mutex.dispatch(async () => {
        });
    }

    public async shutdown(): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let map = new Map(Object.entries(this.reports));
            map.forEach((report: ReportItem, u: string) => {
                if (report.results[EReportTest.load] === EReportResult.waitApprove) {
                    if (report.results[EReportTest.saveWithButtons] === EReportResult.manualAfterLoggedIn
                        || report.results[EReportTest.saveWithoutButtons] === EReportResult.manualAfterLoggedIn) {

                        report.results[EReportTest.load] = EReportResult.manual;
                    }
                }
            });
        });
    }

    public async start(url: string): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) {
                report = new ReportItem(u.host);
                this.reports[u.host] = report;
            }
        });
    }

    public async setParsePart(url: string, part: EReportParsePart): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve();
            report.parseParts[part] = true;
        });
    }

    public async getParsePart(url: string, part: EReportParsePart): Promise<boolean | undefined> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve(undefined);
            return report.parseParts[part];
        });
    }

    public async setResult(url: string, result: EReportResult, test: EReportTest): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined || report.results[test] != EReportResult.unknown) return Promise.resolve();
            report.results[test] = result;
        });
    }

    public async getResult(url: string, test: EReportTest): Promise<EReportResult | undefined> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve(undefined);
            return report.results[test];
        });
    }

    public async setFail(url: string, failMessage: string, test: EReportTest): Promise<void> {
        let getPrefix = function (test: EReportTest): string {
            switch (test) {
                case EReportTest.saveWithButtons: return "SWB";
                case EReportTest.saveWithoutButtons: return "SWOB";
                case EReportTest.load: return "LOAD";
            }
        }

        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined || report.results[test] != EReportResult.unknown) return Promise.resolve();
            report.results[test] = EReportResult.fail;
            report.failMessages.push(`[${getPrefix(test)}] ${failMessage}`);
        });
    }

    public async getFails(url: string, test: EReportTest): Promise<string[] | undefined> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve(undefined);
            return report.failMessages;
        });
    }

    public async finish(url: string, test: EReportTest): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve();
            if (report.results[test] === EReportResult.unknown) {
                report.results[test] = EReportResult.skip;
            }
            await this.saveDump();
        });
    }

    protected async saveDump(): Promise<void> {
        try {
            let dump = JSON.stringify(this.reports);
            fs.writeFileSync(this.dumpFilePath, dump, {encoding: 'utf8'});
            if (this.reportFilePath !== undefined) {
                fs.writeFileSync(this.reportFilePath, dump, {encoding: 'utf8'});
            }
        } catch (e) {}
    }

    protected loadDump(): void {
        try {
            this.reports = JSON.parse(fs.readFileSync(this.dumpFilePath, {encoding: 'utf8'}));
        } catch (e) {}
    }
}


export class ReportExport extends Report {

    public constructor(dumpFilePath: string, reportFilePath: string | undefined) {

        super("", dumpFilePath, reportFilePath, true);
    }

    public async export(): Promise<void> {
        await this.clearExport();
        await this.exportHeader();
        await this.exportReports();
        await this.exportFooter();
    }

    protected async clearExport(): Promise<void> {
    }

    protected async exportHeader(): Promise<void> {
    }

    protected async exportReports(): Promise<void> {
        let count = 0;
        let map = new Map(Object.entries(this.reports));
        let reports: ReportItem[] = [];
        map.forEach((report: ReportItem, u: string) => {
            reports.push(report);
        });
        reports.sort(function(r1, r2) {
            return r1.createTime - r2.createTime;
        });
        for (let report of reports) {
            this.exportReport(count++, report).then();
        }
    }

    protected async exportReport(index: number, report: ReportItem): Promise<void> {
        let part: string[] = [];

        part.push(this.indexToString(index));
        part.push(this.urlToString(report.url));
        part.push(this.resultToString(report.results[EReportTest.saveWithButtons]));
        part.push(this.resultToString(report.results[EReportTest.saveWithoutButtons]));
        part.push(this.resultToString(report.results[EReportTest.load]));
        part.push(this.flagToString(report.parseParts[EReportParsePart.singInButton]));
        part.push(this.flagToString(report.parseParts[EReportParsePart.fullLoginForm]));
        part.push(this.flagToString(report.parseParts[EReportParsePart.firstStepLoginForm]));
        part.push(this.flagToString(report.parseParts[EReportParsePart.secondStepLoginForm]));
        part.push(this.flagToString(report.parseParts[EReportParsePart.loggedIn]));
        part.push(this.flagToString(report.parseParts[EReportParsePart.notParsed]));
        part.push(`${report.failMessages.join("; ").replace(/(\r\n|\n|\r)/gm, "")}`);

        this.exportLine(`${part.join(this.separator())}`);
    }

    protected async exportLine(message: string): Promise<void> {
    }

    protected async exportFooter(): Promise<void> {
    }

    protected indexToString(index: number): string {
        return `${index}`;
    }

    protected urlToString(url: string): string {
        return url;
    }

    protected resultToString(result: EReportResult): string {
        return "";
    }

    protected flagToString(flag: boolean): string {
        return "";
    }

    protected separator(): string {
        return "";
    }
}