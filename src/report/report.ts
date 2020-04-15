import {reportLogger as L} from "../common/log.config";


export enum EReportResult {
    success,
    fail
}

export enum EReportTest {
    saveManualBeforeLoggedInWithButtons,
    saveManualBeforeLoggedInWithoutButtons,
    saveManualAfterLoggedInWithButtons,
    saveManualAfterLoggedInWithoutButtons,
    saveAutoAfterLoggedInWithButtons,
    saveAutoAfterLoggedInWithoutButtons,
    loadManual,
    loadAuto
}

export interface IReport {
    startup(): Promise<void>;
    shutdown(): Promise<void>;
    start(url: string): Promise<void>;
    setResult(result: EReportResult, test: EReportTest): Promise<void>;
    finish(): Promise<void>;
}


class ReportItem {
    url: string;
    results: Map<EReportTest, EReportResult> = new Map<EReportTest, EReportResult>([
        [EReportTest.saveManualBeforeLoggedInWithButtons, EReportResult.fail],
        [EReportTest.saveManualBeforeLoggedInWithoutButtons, EReportResult.fail],
        [EReportTest.saveManualAfterLoggedInWithButtons, EReportResult.fail],
        [EReportTest.saveManualAfterLoggedInWithoutButtons, EReportResult.fail],
        [EReportTest.saveAutoAfterLoggedInWithButtons, EReportResult.fail],
        [EReportTest.saveAutoAfterLoggedInWithoutButtons, EReportResult.fail],
        [EReportTest.loadManual, EReportResult.fail],
        [EReportTest.loadAuto, EReportResult.fail]
    ]);

    public constructor(url: string) {
        this.url = url;
    }
}


export class ReportLogger implements IReport {

    protected engineName: string;
    protected currentReport: ReportItem | undefined;

    public constructor(engineName: string) {
        this.engineName = engineName;
    }

    public async startup(): Promise<void> {
        L.warn(`  sm1 - manual save before logged in with login button`);
        L.warn(`  sm2 - manual save before logged in with out login button (press 'Enter')`);
        L.warn(`  sm3 - manual save after logged in with login button`);
        L.warn(`  sm4 - manual save after logged in with out login button (press 'Enter')`);
        L.warn(`  sa1 - auto save after logged in with login button`);
        L.warn(`  sa2 - auto save after logged in with out login button (press 'Enter')`);
        L.warn(`  lm1 - manual load`);
        L.warn(`  la1 - auto load`);
        L.warn(`---------------------------------------------------------------------------------------------------------`);
        L.warn(`  engine: ${this.engineName}`);
        L.warn(`---------------------------------------------------------------------------------------------------------`);
        L.warn(" url                                                    | sm1 | sm2 | sm3 | sm4 | sa1 | sa2 | lm1 | la1 |");
        L.warn(`---------------------------------------------------------------------------------------------------------`);
    }

    public async shutdown(): Promise<void> {
        L.warn(`---------------------------------------------------------------------------------------------------------`);
        L.warn(" url                                                    | sm1 | sm2 | sm3 | sm4 | sa1 | sa2 | lm1 | la1 |");
        L.warn(`---------------------------------------------------------------------------------------------------------`);
    }

    public async start(url: string): Promise<void> {
        if (this.currentReport !== undefined) return Promise.resolve();
        this.currentReport = new ReportItem(url);
        return Promise.resolve();
    }

    public async setResult(result: EReportResult, test: EReportTest): Promise<void> {
        if (this.currentReport === undefined) return Promise.resolve();
        this.currentReport.results.set(test, result);
        return Promise.resolve();
    }

    public async finish(): Promise<void> {
        if (this.currentReport === undefined) return Promise.resolve();

        let url = new URL(this.currentReport.url);

        let rUrl = "  ".concat(url.host).padEnd(56, " ");

        let map = this.currentReport.results;

        if (map.get(EReportTest.saveAutoAfterLoggedInWithButtons) === EReportResult.success) {
            if (map.get(EReportTest.loadManual) === EReportResult.fail
                && map.get(EReportTest.loadAuto) === EReportResult.fail) {

                map.set(EReportTest.saveAutoAfterLoggedInWithButtons, EReportResult.fail);
            }
        }

        if (map.get(EReportTest.saveAutoAfterLoggedInWithoutButtons) === EReportResult.success) {
            if (map.get(EReportTest.loadManual) === EReportResult.fail
                && map.get(EReportTest.loadAuto) === EReportResult.fail) {

                map.set(EReportTest.saveAutoAfterLoggedInWithoutButtons, EReportResult.fail);
            }
        }

        let SM1 = map.get(EReportTest.saveManualBeforeLoggedInWithButtons) === EReportResult.success ? "X" : " ";
        let SM2 = map.get(EReportTest.saveManualBeforeLoggedInWithoutButtons) === EReportResult.success ? "X" : " ";
        let SM3 = map.get(EReportTest.saveManualAfterLoggedInWithButtons) === EReportResult.success ? "X" : " ";
        let SM4 = map.get(EReportTest.saveManualAfterLoggedInWithoutButtons) === EReportResult.success ? "X" : " ";
        let SA1 = map.get(EReportTest.saveAutoAfterLoggedInWithButtons) === EReportResult.success ? "X" : " ";
        let SA2 = map.get(EReportTest.saveAutoAfterLoggedInWithoutButtons) === EReportResult.success ? "X" : " ";
        let LM1 = map.get(EReportTest.loadManual) === EReportResult.success ? "X" : " ";
        let LA2 = map.get(EReportTest.loadAuto) === EReportResult.success ? "X" : " ";

        L.warn(`${rUrl}|  ${SM1}  |  ${SM2}  |  ${SM3}  |  ${SM4}  |  ${SA1}  |  ${SA2}  |  ${LM1}  |  ${LA2}  |`);

        this.currentReport = undefined;

        return Promise.resolve();
    }
}