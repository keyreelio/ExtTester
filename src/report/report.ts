import {reportLogger as L} from "../common/log.config";


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
    startup(): Promise<void>;
    shutdown(): Promise<void>;
    start(url: string): Promise<void>;
    setParsePart(part: EReportParsePart): Promise<void>;
    setResult(result: EReportResult, test: EReportTest): Promise<void>;
    setFail(failMessage: string, test: EReportTest): Promise<void>;
    finish(): Promise<void>;
}


class ReportItem {
    url: string;
    results: Map<EReportTest, EReportResult> = new Map<EReportTest, EReportResult>([
        [EReportTest.unknown, EReportResult.skip],
        [EReportTest.saveBeforeLoggedInWithButtons, EReportResult.skip],
        [EReportTest.saveBeforeLoggedInWithoutButtons, EReportResult.skip],
        [EReportTest.saveAfterLoggedInWithButtons, EReportResult.skip],
        [EReportTest.saveAfterLoggedInWithoutButtons, EReportResult.skip],
        [EReportTest.load, EReportResult.skip]
    ]);
    parseParts: Map<EReportParsePart, boolean> = new Map<EReportParsePart, boolean>([
        [EReportParsePart.singInButton, false],
        [EReportParsePart.fullLoginForm, false],
        [EReportParsePart.firstStepLoginForm, false],
        [EReportParsePart.secondStepLoginForm, false],
        [EReportParsePart.reloaded, false]
    ]);
    failMessages: string[] = [];

    public constructor(url: string) {
        this.url = url;
    }
}


export class ReportLogger implements IReport {

    protected engineName: string;
    protected reports: Map<string, ReportItem> = new Map<string, ReportItem>();
    protected currentReport: ReportItem | undefined = undefined;

    public constructor(engineName: string) {
        this.engineName = engineName;
    }

    public async printResult(): Promise<void> {
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

        this.reports.forEach((report: ReportItem, u: string) => {
            if (report.results.get(EReportTest.load) === EReportResult.waitApprove) {
                if (report.results.get(EReportTest.saveAfterLoggedInWithButtons) === EReportResult.manual
                    || report.results.get(EReportTest.saveAfterLoggedInWithoutButtons) === EReportResult.manual) {

                    report.results.set(EReportTest.load, EReportResult.manual);
                }
            }

            let part: string[] = [];

            part.push("  ".concat(report.url).padEnd(56, " "));
            part.push(marker(report.results.get(EReportTest.saveBeforeLoggedInWithButtons)));
            part.push(marker(report.results.get(EReportTest.saveBeforeLoggedInWithoutButtons)));
            part.push(marker(report.results.get(EReportTest.saveAfterLoggedInWithButtons)));
            part.push(marker(report.results.get(EReportTest.saveAfterLoggedInWithoutButtons)));
            part.push(marker(report.results.get(EReportTest.load)));
            part.push(formMarker(report.parseParts.get(EReportParsePart.singInButton)));
            part.push(formMarker(report.parseParts.get(EReportParsePart.fullLoginForm)));
            part.push(formMarker(report.parseParts.get(EReportParsePart.firstStepLoginForm)));
            part.push(formMarker(report.parseParts.get(EReportParsePart.secondStepLoginForm)));
            part.push(formMarker(report.parseParts.get(EReportParsePart.loggedIn)));
            part.push(formMarker(report.parseParts.get(EReportParsePart.reloaded)));
            part.push(report.failMessages.join("; "));

            L.warn(`${part.join("|")}`);
        });

        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
        L.warn(" url                                                    | sbb | sbe | sab | sae | lod | sib | ffl | ffs | fss | lin | rld |");
        L.warn(`---------------------------------------------------------------------------------------------------------------------------`);
    }

    public async startup(): Promise<void> {
    }

    public async shutdown(): Promise<void> {
    }

    public async start(url: string): Promise<void> {
        let u = new URL(url);
        if (this.currentReport !== undefined) return Promise.resolve();
        this.currentReport = this.reports.get(u.host);
        if (this.currentReport === undefined) {
            this.currentReport = new ReportItem(u.host);
        }
        return Promise.resolve();
    }

    public async setParsePart(part: EReportParsePart): Promise<void> {
        if (this.currentReport === undefined) return Promise.resolve();
        this.currentReport.parseParts.set(part, true);
        return Promise.resolve();
    }

    public async setResult(result: EReportResult, test: EReportTest): Promise<void> {
        if (this.currentReport === undefined) return Promise.resolve();
        this.currentReport.results.set(test, result);
        return Promise.resolve();
    }

    public async setFail(failMessage: string, test: EReportTest): Promise<void> {
        if (this.currentReport === undefined) return Promise.resolve();
        this.currentReport.results.set(test, EReportResult.fail);
        this.currentReport.failMessages.push(failMessage);
        return Promise.resolve();
    }

    public async finish(): Promise<void> {
        if (this.currentReport === undefined) return Promise.resolve();
        this.reports.set(this.currentReport.url, this.currentReport);
        this.currentReport = undefined;
        return Promise.resolve();
    }
}