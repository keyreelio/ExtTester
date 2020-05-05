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
        this.results[EReportTest.unknown] = EReportResult.skip;
        this.results[EReportTest.saveBeforeLoggedInWithButtons] = EReportResult.skip;
        this.results[EReportTest.saveBeforeLoggedInWithoutButtons] = EReportResult.skip;
        this.results[EReportTest.saveAfterLoggedInWithButtons] = EReportResult.skip;
        this.results[EReportTest.saveAfterLoggedInWithoutButtons] = EReportResult.skip;
        this.results[EReportTest.load] = EReportResult.skip;
        this.parseParts[EReportParsePart.singInButton] = false;
        this.parseParts[EReportParsePart.fullLoginForm] = false;
        this.parseParts[EReportParsePart.firstStepLoginForm] = false;
        this.parseParts[EReportParsePart.secondStepLoginForm] = false;
        this.parseParts[EReportParsePart.reloaded] = false;
    }
}


export enum EReportResult {
    skip,
    manual,
    auto,
    waitApprove,
    fail
}

export enum EReportTest {
    unknown,
    saveBeforeLoggedInWithButtons,
    saveBeforeLoggedInWithoutButtons,
    saveAfterLoggedInWithButtons,
    saveAfterLoggedInWithoutButtons,
    load
}

export enum EReportParsePart {
    singInButton,
    fullLoginForm,
    firstStepLoginForm,
    secondStepLoginForm,
    loggedIn,
    reloaded
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
                    if (report.results[EReportTest.saveAfterLoggedInWithButtons] === EReportResult.manual
                        || report.results[EReportTest.saveAfterLoggedInWithoutButtons] === EReportResult.manual) {

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
        L.warn(`  sbb - save before logged in with login button`);
        L.warn(`  sbe - save before logged in with out login button (press 'Enter')`);
        L.warn(`  sab - save after logged in with login button`);
        L.warn(`  sae - save after logged in with out login button (press 'Enter')`);
        L.warn(`  lod - load`);
        L.warn(`  sib - page has singin button`);
        L.warn(`  ffl - page has full login form`);
        L.warn(`  ffs - page has first step of login form`);
        L.warn(`  fss - page has second step of login form`);
        L.warn(`  lin - page is logged in`);
        L.warn(`  rld - page reloaded for parse again`);
        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
        L.warn(`  engine: ${this.engineName}`);
        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
        L.warn(" url                                                    | sbb | sbe | sab | sae | lod | sib | ffl | ffs | fss | lin | rld |");
        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
            switch (result) {
                case undefined: return "     ";
                case EReportResult.skip: return "     ";
                case EReportResult.manual: return "  M  ";
                case EReportResult.fail: return "  F  ";
                case EReportResult.auto: return "  A  ";
                case EReportResult.waitApprove: return "  W  ";
            }
        }

        let formMarker = function (result: boolean | undefined) {
            return result ? "  X  " : "     ";
        }

        let map = new Map(Object.entries(this.reports));
        map.forEach((report: ReportItem, u: string) => {
            let part: string[] = [];

            part.push("  ".concat(report.url).padEnd(56, " "));
            part.push(marker(report.results[EReportTest.saveBeforeLoggedInWithButtons]));
            part.push(marker(report.results[EReportTest.saveBeforeLoggedInWithoutButtons]));
            part.push(marker(report.results[EReportTest.saveAfterLoggedInWithButtons]));
            part.push(marker(report.results[EReportTest.saveAfterLoggedInWithoutButtons]));
            part.push(marker(report.results[EReportTest.load]));
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.reloaded]));
            part.push(report.failMessages.join("; "));

            L.warn(`${part.join("|")}`);
        });
    }

    protected async printFooter(): Promise<void> {
        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
        L.warn(" url                                                    | sbb | sbe | sab | sae | lod | sib | ffl | ffs | fss | lin | rld |");
        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
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

    protected async printHeader(): Promise<void> {
        this.writeToFile(`  sbb - save before logged in with login button\n`);
        this.writeToFile(`  sbe - save before logged in with out login button (press 'Enter')\n`);
        this.writeToFile(`  sab - save after logged in with login button\n`);
        this.writeToFile(`  sae - save after logged in with out login button (press 'Enter')\n`);
        this.writeToFile(`  lod - load\n`);
        this.writeToFile(`  sib - page has singin button\n`);
        this.writeToFile(`  ffl - page has full login form\n`);
        this.writeToFile(`  ffs - page has first step of login form\n`);
        this.writeToFile(`  fss - page has second step of login form\n`);
        this.writeToFile(`  lin - page is logged in\n`);
        this.writeToFile(`  rld - page reloaded for parse again\n`);
        this.writeToFile(`---------------------------------------------------------------------------------------------------------------------------\n`);
        this.writeToFile(`  engine: ${this.engineName}\n`);
        this.writeToFile(`---------------------------------------------------------------------------------------------------------------------------\n`);
        this.writeToFile(" url                                                    | sbb | sbe | sab | sae | lod | sib | ffl | ffs | fss | lin | rld |\n");
        this.writeToFile(`---------------------------------------------------------------------------------------------------------------------------\n`);
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
            switch (result) {
                case undefined: return "     ";
                case EReportResult.skip: return "  -  ";
                case EReportResult.manual: return "  M  ";
                case EReportResult.fail: return "  F  ";
                case EReportResult.auto: return "  A  ";
                case EReportResult.waitApprove: return "  W  ";
            }
        }

        let formMarker = function (result: boolean | undefined) {
            return result ? "  X  " : "     ";
        }

        let map = new Map(Object.entries(this.reports));
        map.forEach((report: ReportItem, u: string) => {
            let part: string[] = [];

            part.push("  ".concat(report.url).padEnd(56, " "));
            part.push(marker(report.results[EReportTest.saveBeforeLoggedInWithButtons]));
            part.push(marker(report.results[EReportTest.saveBeforeLoggedInWithoutButtons]));
            part.push(marker(report.results[EReportTest.saveAfterLoggedInWithButtons]));
            part.push(marker(report.results[EReportTest.saveAfterLoggedInWithoutButtons]));
            part.push(marker(report.results[EReportTest.load]));
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.reloaded]));
            part.push(report.failMessages.join("; "));

            this.writeToFile(`${part.join("|")}\n`);
        });
    }

    protected async printFooter(): Promise<void> {
        this.writeToFile(`---------------------------------------------------------------------------------------------------------------------------\n`);
        this.writeToFile(" url                                                    | sbb | sbe | sab | sae | lod | sib | ffl | ffs | fss | lin | rld |\n");
        this.writeToFile(`---------------------------------------------------------------------------------------------------------------------------\n`);
    }

    protected writeToFile(line: string) {
        fs.writeFileSync(this.reportFile, line, {flag: "a"});
    }
}


export class ReportCsv extends ReportTxt {

    public constructor(engineName: string, reportFile: string) {
        super(engineName, reportFile);
    }

    protected async printHeader(): Promise<void> {
        this.writeToFile("url;save_before_loggedin_with_button;save_before_loggedin_without_button;" +
            "save_after_loggedin_with_button;save_after_loggedin_without_button;load;has_singin_button;" +
            "has_full_form;has_first_step_form;has_second_step_form;has_loggedin;reloaded;fail_messages\n");
    }

    protected async printReport(): Promise<void> {
        let marker = function (result: EReportResult | undefined) {
            switch (result) {
                case undefined: return "";
                case EReportResult.skip: return "skip";
                case EReportResult.manual: return "manual";
                case EReportResult.fail: return "fail";
                case EReportResult.auto: return "auto";
                case EReportResult.waitApprove: return "wait_approve";
            }
        }

        let formMarker = function (result: boolean | undefined) {
            return result ? "true" : "";
        }

        let map = new Map(Object.entries(this.reports));
        map.forEach((report: ReportItem, u: string) => {
            let part: string[] = [];

            part.push(report.url);
            part.push(marker(report.results[EReportTest.saveBeforeLoggedInWithButtons]));
            part.push(marker(report.results[EReportTest.saveBeforeLoggedInWithoutButtons]));
            part.push(marker(report.results[EReportTest.saveAfterLoggedInWithButtons]));
            part.push(marker(report.results[EReportTest.saveAfterLoggedInWithoutButtons]));
            part.push(marker(report.results[EReportTest.load]));
            part.push(formMarker(report.parseParts[EReportParsePart.singInButton]));
            part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
            part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
            part.push(formMarker(report.parseParts[EReportParsePart.reloaded]));
            part.push(report.failMessages.join(" : "));

            this.writeToFile(`${part.join(";")}\n`);
        });
    }

    protected async printFooter(): Promise<void> {
    }

    protected writeToFile(line: string) {
        fs.writeFileSync(this.reportFile, line, {flag: "a"});
    }
}