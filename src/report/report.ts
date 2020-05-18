import fs from "fs";
import {Mutex} from "../common/mutex";


export interface IReports {
    [key: string]: ReportItem;
}

export interface IFlags {
    [key: number]: boolean;
}

export interface ITestResults {
    [key: number]: TestResult;
}

export interface ITimers {
    [key: number]: number;
}

export class TestResult {
    startTime: number = 0;
    timers: ITimers = {};
    result: number = EReportResult.unknown;
    flags: IFlags = {};
    failMessage: string = "";

    constructor() {
        this.startTime = Date.now();
        this.flags[EReportParsePart.singInButton] = false;
        this.flags[EReportParsePart.fullLoginForm] = false;
        this.flags[EReportParsePart.firstStepLoginForm] = false;
        this.flags[EReportParsePart.secondStepLoginForm] = false;
        this.flags[EReportParsePart.notParsed] = false;
        this.timers[ETimer.check] = -1;
        this.timers[ETimer.scanner] = -1;
        this.timers[ETimer.parser] = -1;
    }
}

export class ReportItem {
    url: string;
    createTime: number = Date.now();
    results: ITestResults = {};

    public constructor(url: string) {
        this.url = url;
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

export enum ETimer {
    check,
    scanner,
    parser
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
            for (let host in this.reports) {
                let results = this.reports[host];
                if (results === undefined) continue;
                let load = results.results[EReportTest.load];
                if (load.result === EReportResult.waitApprove) {
                    let saveWithButtons = results.results[EReportTest.saveWithButtons];
                    if (saveWithButtons !== undefined && saveWithButtons.result === EReportResult.manualAfterLoggedIn) {
                        load.result = EReportResult.manual;
                        continue;
                    }
                    let saveWithoutButtons = results.results[EReportTest.saveWithoutButtons];
                    if (saveWithoutButtons !== undefined && saveWithoutButtons.result === EReportResult.manualAfterLoggedIn) {
                        load.result = EReportResult.manual;
                        continue;
                    }
                }
            }
        });
    }

    public async getResult(url: string, test: EReportTest): Promise<EReportResult | undefined> {
        return await this.mutex.dispatch(async () => {
            let result = this.result(url, test);
            if (result === undefined) return undefined;
            return result.result;
        });
    }

    public async start(url: string, test: EReportTest): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let report = this.reports[this.getHost(url)];
            if (report === undefined) {
                report = new ReportItem(this.getHost(url));
                this.reports[this.getHost(url)] = report;
            }
            let result = report.results[test];
            if (result === undefined) {
                result = new TestResult();
                report.results[test] = result;
            }
        });
    }

    public async setParsePart(url: string, test: EReportTest, part: EReportParsePart): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let result = this.result(url, test);
            if (result === undefined) return Promise.resolve();
            result.flags[part] = true;
        });
    }

    public async setResult(url: string, test: EReportTest, result: EReportResult): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let res = this.result(url, test);
            if (res === undefined) return Promise.resolve();
            if (res.result != EReportResult.unknown) return Promise.resolve();
            res.result = result;
        });
    }

    public async setTimer(url: string, test: EReportTest, timer: ETimer, duration: number): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let result = this.result(url, test);
            if (result === undefined) return Promise.resolve();
            result.timers[timer] = duration;
        });
    }

    public async setFail(url: string, test: EReportTest, failMessage: string): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let res = this.result(url, test);
            if (res === undefined) return Promise.resolve();
            if (res.result != EReportResult.unknown) return Promise.resolve();
            res.result = EReportResult.fail;
            res.failMessage = failMessage;
        });
    }

    public async finish(url: string, test: EReportTest): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let result = this.result(url, test);
            if (result === undefined) return Promise.resolve();
            if (result.result === EReportResult.unknown) {
                result.result = EReportResult.skip;
            }
            result.timers[ETimer.check] = Date.now() - result.startTime;
            await this.saveDump();
        });
    }

    protected getHost(url: string): string {
        let u = new URL(url);
        return u.host;
    }

    protected result(url: string, test: EReportTest): TestResult | undefined {
        let report = this.reports[this.getHost(url)];
        if (report === undefined) return undefined;
        return  report.results[test];
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

    protected flagsToString(flags: IFlags): string {
        let part: string[] = [];

        part.push(this.flagToString(flags[EReportParsePart.singInButton]));
        part.push(this.flagToString(flags[EReportParsePart.fullLoginForm]));
        part.push(this.flagToString(flags[EReportParsePart.firstStepLoginForm]));
        part.push(this.flagToString(flags[EReportParsePart.secondStepLoginForm]));
        part.push(this.flagToString(flags[EReportParsePart.loggedIn]));
        part.push(this.flagToString(flags[EReportParsePart.notParsed]));

        return part.join(this.separator());
    }

    protected flagToString(flag: boolean): string {
        return flag ? "X" : " ";
    }

    protected timeToString(time: number): string {
        return `${(Math.round((time / 1000) * 100) / 100).toFixed(2)}`;
    }

    protected testName(test: EReportTest): string {
        switch (test) {
            case EReportTest.saveWithButtons: return " SWHB ";
            case EReportTest.saveWithoutButtons: return " SWOB ";
            case EReportTest.load: return " LOAD ";
        }
        return "      ";
    }

    protected separator(): string {
        return "|";
    }
}