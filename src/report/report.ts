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
    results: IResults = {};
    parseParts: IParseParts = {};
    failMessages: string[] = [];

    public constructor(url: string) {
        this.url = url;
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

export interface IReport {
    startup(restoreFromDump: boolean): Promise<void>;
    shutdown(): Promise<void>;

    start(url: string): Promise<void>;
    setParsePart(url: string, part: EReportParsePart): Promise<void>;
    getParsePart(url: string, part: EReportParsePart): Promise<boolean | undefined>;
    setResult(url: string, result: EReportResult, test: EReportTest): Promise<void>;
    getResult(url: string, test: EReportTest): Promise<EReportResult | undefined>;
    setFail(url: string, failMessage: string, test: EReportTest): Promise<void>;
    getFails(url: string, test: EReportTest): Promise<string[] | undefined>;
    finish(url: string, test: EReportTest): Promise<void>;
}

export class ReportLogger implements IReport {

    protected engineName: string;
    protected dumpFilePath: string;
    protected reports: IReports = {};
    protected mutex = new Mutex();


    public constructor(engineName: string, dumpFilePath: string) {
        this.engineName = engineName;
        this.dumpFilePath = dumpFilePath;
    }

    public async startup(restoreFromDump: boolean): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (restoreFromDump) {
                await this.loadDump();
            }
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

            await this.print();
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
            if (report === undefined) return Promise.resolve();
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
                case EReportTest.saveWithButtons: return "SaveWithButtons";
                case EReportTest.saveWithoutButtons: return "SaveWithoutButtons";
                case EReportTest.load: return "Load";
            }
        }

        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve();
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

    public async finish(url: string, test: EReportTest, print: boolean = false): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            let report = this.reports[u.host];
            if (report === undefined) return Promise.resolve();
            if (report.results[test] === EReportResult.unknown) {
                report.results[test] = EReportResult.skip;
            }
            await this.saveDump();
            if (print) await this.print();
        });
    }

    protected async print(): Promise<void> {
        await this.clearPrint();
        await this.printHeader();
        await this.printReport();
        await this.printFooter();
    }

    protected async clearPrint(): Promise<void> {
    }

    protected async printHeader(): Promise<void> {
        this.printLine(`  swb - save with login button,  MBL - manual before logedin, MAL - manual after loggedin`);
        this.printLine(`  sob - save with out login button (press 'Enter'),  MBL - manual before logedin, MAL - manual after loggedin`);
        this.printLine(`  lod - load`);
        this.printLine(`  sib - page has singin button`);
        this.printLine(`  ffl - page has full login form`);
        this.printLine(`  ffs - page has first step of login form`);
        this.printLine(`  fss - page has second step of login form`);
        this.printLine(`  lin - page is logged in`);
        this.printLine(`  nps - page did not parse`);
        this.printLine(`----------------------------------------------------------------------------------------------------------------------`);
        this.printLine(`  engine: ${this.engineName}`);
        this.printLine(`----------------------------------------------------------------------------------------------------------------------`);
        this.printLine(" idx  | url                                                    | swb | sob | lod | sib | ffl | ffs | fss | lin | nps |");
        this.printLine(`----------------------------------------------------------------------------------------------------------------------`);
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
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

        let formMarker = function (result: boolean | undefined) {
            return result ? "  X  " : "     ";
        }

        let count = 0;
        let map = new Map(Object.entries(this.reports));
        map.forEach((report: ReportItem, u: string) => {
            let part: string[] = [];

            part.push(` ${count++}`.padEnd(6, " "));
            part.push("  ".concat(report.url).padEnd(56, " "));
            part.push(marker(report.results[EReportTest.saveWithButtons]));
            part.push(marker(report.results[EReportTest.saveWithoutButtons]));
            part.push(marker(report.results[EReportTest.load]));
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.notParsed]));
            part.push(report.failMessages.join("; ").replace(/(\r\n|\n|\r)/gm, ""));

            this.printLine(`${part.join("|")}`);
        });
    }

    protected async printFooter(): Promise<void> {
        this.printLine(`----------------------------------------------------------------------------------------------------------------------`);
        this.printLine(" idx  | url                                                    | swb | sob | lod | sib | ffl | ffs | fss | lin | nps |");
        this.printLine(`----------------------------------------------------------------------------------------------------------------------`);
    }

    protected printLine(message: string): void {
        L.warn(message);
    }

    protected async saveDump(): Promise<void> {
        try {
            fs.writeFileSync(this.dumpFilePath, JSON.stringify(this.reports), {encoding: 'utf8'});
        } catch (e) {}
    }

    protected async loadDump(): Promise<void> {
        try {
            this.reports = JSON.parse(fs.readFileSync(this.dumpFilePath, {encoding: 'utf8'}));
        } catch (e) {}
    }
}

export class ReportTxt extends ReportLogger {

    protected reportFile: string;


    public constructor(engineName: string, dumpFilePath: string, reportFile: string) {
        super(engineName, dumpFilePath);
        this.reportFile = reportFile;
    }

    public async finish(url: string, test: EReportTest, print: boolean = true): Promise<void> {
        return await super.finish(url, test, print);
    }

    protected async clearPrint(): Promise<void> {
        fs.writeFileSync(this.reportFile, "", {flag: "w"});
    }

    protected printLine(message: string): void {
        fs.writeFileSync(this.reportFile, `${message}\n`, {flag: "a"});
    }
}


export class ReportCsv extends ReportTxt {

    public constructor(engineName: string, dumpFilePath: string, reportFile: string) {
        super(engineName, dumpFilePath, reportFile);
    }

    protected async printHeader(): Promise<void> {
        this.printLine("url;save_with_button;save_without_button;load;has_singin_button;" +
            "has_full_form;has_first_step_form;has_second_step_form;has_loggedin;did_not_parse;fail_messages");
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
            switch (result) {
                case EReportResult.skip: return "skip";
                case EReportResult.manual: return "manual";
                case EReportResult.manualBeforeLoggedIn: return "manual_before";
                case EReportResult.manualAfterLoggedIn: return "manual_after";
                case EReportResult.fail: return "fail";
                case EReportResult.auto: return "auto";
                case EReportResult.waitApprove: return "wait_approve";
            }
            return "";
        }

        let formMarker = function (result: boolean | undefined) {
            return result ? "true" : "";
        }

        let map = new Map(Object.entries(this.reports));
        map.forEach((report: ReportItem, u: string) => {
            let part: string[] = [];

            part.push(report.url);
            part.push(marker(report.results[EReportTest.saveWithButtons]));
            part.push(marker(report.results[EReportTest.saveWithoutButtons]));
            part.push(marker(report.results[EReportTest.load]));
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.notParsed]));
            part.push(report.failMessages.join(" : ").replace(/(\r\n|\n|\r)/gm, ""));

            this.printLine(`${part.join(";")}`);
        });
    }

    protected async printFooter(): Promise<void> {
    }
}