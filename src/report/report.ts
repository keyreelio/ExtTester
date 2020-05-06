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
        this.results[EReportTest.saveWithButtons] = EReportResult.skip;
        this.results[EReportTest.saveWithoutButtons] = EReportResult.skip;
        this.results[EReportTest.load] = EReportResult.skip;
        this.parseParts[EReportParsePart.singInButton] = false;
        this.parseParts[EReportParsePart.fullLoginForm] = false;
        this.parseParts[EReportParsePart.firstStepLoginForm] = false;
        this.parseParts[EReportParsePart.secondStepLoginForm] = false;
        this.parseParts[EReportParsePart.notParsed] = false;
    }
}


export enum EReportResult {
    skip,
    manual,
    manualBeforeLoggedIn,
    manualAfterLoggedIn,
    auto,
    waitApprove,
    fail
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
    setParsePart(part: EReportParsePart): Promise<void>;
    getParsePart(part: EReportParsePart): Promise<boolean | undefined>;
    setResult(result: EReportResult, test: EReportTest): Promise<void>;
    getResult(test: EReportTest): Promise<EReportResult | undefined>;
    setFail(failMessage: string, test: EReportTest): Promise<void>;
    getFails(test: EReportTest): Promise<string[] | undefined>;
    finish(): Promise<void>;
}

export class ReportLogger implements IReport {

    protected engineName: string;
    protected reports: IReports = {};
    protected currentReport: ReportItem | undefined = undefined;
    protected dumpFile: string;

    protected mutex = new Mutex();


    public constructor(engineName: string) {
        this.engineName = engineName;
        this.dumpFile = `./tmp/report_${engineName}.dump.json`;
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

            await this.printHeader();
            await this.printReport();
            await this.printFooter();
        });
    }

    public async start(url: string): Promise<void> {
        return await this.mutex.dispatch(async () => {
            let u = new URL(url);
            if (this.currentReport !== undefined) return Promise.resolve();
            this.currentReport = this.reports[u.host];
            if (this.currentReport === undefined) {
                this.currentReport = new ReportItem(u.host);
            }
        });
    }

    public async setParsePart(part: EReportParsePart): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return Promise.resolve();
            this.currentReport.parseParts[part] = true;
        });
    }

    public async getParsePart(part: EReportParsePart): Promise<boolean | undefined> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return undefined;
            return this.currentReport.parseParts[part];
        });
    }

    public async setResult(result: EReportResult, test: EReportTest): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return Promise.resolve();
            this.currentReport.results[test] = result;
        });
    }

    public async getResult(test: EReportTest): Promise<EReportResult | undefined> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return undefined;
            return this.currentReport.results[test];
        });
    }

    public async setFail(failMessage: string, test: EReportTest): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return Promise.resolve();
            this.currentReport.results[test] = EReportResult.fail;
            this.currentReport.failMessages.push(failMessage);
        });
    }

    public async getFails(test: EReportTest): Promise<string[] | undefined> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return undefined;
            return this.currentReport.failMessages;
        });
    }

    public async finish(): Promise<void> {
        return await this.mutex.dispatch(async () => {
            if (this.currentReport === undefined) return Promise.resolve();
            this.reports[this.currentReport.url] = this.currentReport;
            this.currentReport = undefined;
            await this.saveDump();
        });
    }


    protected async printHeader(): Promise<void> {
        this.print(`  swb - save with login button,  MBL - manual before logedin, MAL - manual after loggedin`);
        this.print(`  sob - save with out login button (press 'Enter'),  MBL - manual before logedin, MAL - manual after loggedin`);
        this.print(`  lod - load`);
        this.print(`  sib - page has singin button`);
        this.print(`  ffl - page has full login form`);
        this.print(`  ffs - page has first step of login form`);
        this.print(`  fss - page has second step of login form`);
        this.print(`  lin - page is logged in`);
        this.print(`  nps - page did not parse`);
        this.print(`---------------------------------------------------------------------------------------------------------------`);
        this.print(`  engine: ${this.engineName}`);
        this.print(`---------------------------------------------------------------------------------------------------------------`);
        this.print(" url                                                    | swb | sob | lod | sib | ffl | ffs | fss | lin | nps |");
        this.print(`---------------------------------------------------------------------------------------------------------------`);
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
            switch (result) {
                case undefined: return "     ";
                case EReportResult.skip: return "     ";
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

        let map = new Map(Object.entries(this.reports));
        map.forEach((report: ReportItem, u: string) => {
            let part: string[] = [];

            part.push("  ".concat(report.url).padEnd(56, " "));
            part.push(marker(report.results[EReportTest.saveWithButtons]));
            part.push(marker(report.results[EReportTest.saveWithButtons]));
            part.push(marker(report.results[EReportTest.load]));
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.notParsed]));
            part.push(report.failMessages.join("; "));

            this.print(`${part.join("|")}`);
        });
    }

    protected async printFooter(): Promise<void> {
        this.print(`---------------------------------------------------------------------------------------------------------------`);
        this.print(" url                                                    | swb | sob | lod | sib | ffl | ffs | fss | lin | nps |");
        this.print(`---------------------------------------------------------------------------------------------------------------`);
    }

    protected print(message: string): void {
        L.warn(message);
    }

    protected async saveDump(): Promise<void> {
        try {
            fs.writeFileSync(this.dumpFile, JSON.stringify(this.reports), {encoding: 'utf8'});
        } catch (e) {}
    }

    protected async loadDump(): Promise<void> {
        try {
            this.reports = JSON.parse(fs.readFileSync(this.dumpFile, {encoding: 'utf8'}));
        } catch (e) {}
    }
}

export class ReportTxt extends ReportLogger {

    protected reportFile: string;


    public constructor(engineName: string, reportFile: string) {
        super(engineName);
        this.reportFile = reportFile;
    }

    protected print(message: string): void {
        fs.writeFileSync(this.reportFile, `${message}\n`, {flag: "a"});
    }
}


export class ReportCsv extends ReportTxt {

    public constructor(engineName: string, reportFile: string) {
        super(engineName, reportFile);
    }

    protected async printHeader(): Promise<void> {
        this.print("url;save_with_button;save_without_button;load;has_singin_button;" +
            "has_full_form;has_first_step_form;has_second_step_form;has_loggedin;did_not_parse;fail_messages\n");
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
            switch (result) {
                case undefined: return "";
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
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.notParsed]));
            part.push(report.failMessages.join(" : "));

            this.print(`${part.join(";")}\n`);
        });
    }

    protected async printFooter(): Promise<void> {
    }
}