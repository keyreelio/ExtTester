import {reportLogger as L} from "../common/log.config";


export enum EReportResult {
    success,
    fail
}

export enum EReportTest {
    saveManualBeforeLoggedIn,
    saveManualAfterLoggedIn,
    saveAutoAfterLoggedIn,
    loadManual,
    loadAuto
}

export interface IReport {
    startup(): Promise<void>;
    start(url: string): Promise<void>;
    setResult(result: EReportResult, test: EReportTest): Promise<void>;
    finish(): Promise<void>;
}

export class ReportLogger implements IReport {


    public constructor(engineName: string) {
    }

    public async startup(): Promise<void> {

    }

    public async start(url: string): Promise<void> {

    }

    public async setResult(result: EReportResult, test: EReportTest): Promise<void> {

    }

    public async finish(): Promise<void> {

    }
}