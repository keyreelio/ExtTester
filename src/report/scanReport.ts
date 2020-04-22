import {EReportResult, EReportTest, IReport} from "./report";
import {reportLogger as L} from "../common/log.config";

export enum EResultType {
    unknownError,
    timeoutError,
    accessDeniedError,
    siteNotFoundError,
    suspiciousSiteError,
    loginButton,
    registerButton,
    accountButton
}

export interface IScanReport {
    start(): void;
    setResult(url: string, resultType: EResultType, resultValue: boolean): void;
    finish(): void;
}

export class ScanReportLogger implements IScanReport {

    protected reports: Map<string, Map<EResultType, boolean>> | undefined;

    public start(): void {
        if (this.reports !== undefined) return;
        this.reports = new Map<string, Map<EResultType, boolean>>();
        return
    }

    public setResult(
        domain: string,
        resultType: EResultType,
        resultValue: boolean
    ) {
        if (this.reports === undefined) return;

        var result = this.reports.get(domain);
        if (result == null) {
            result = new Map()
        }
        result.set(resultType, resultValue);
        this.reports.set(domain, result);
        return;
    }

    public finish() {
        if (this.reports === undefined) return;

        L.warn(`---------------------------------------------------------------------------------------------------------`);
        L.warn( ` domain                                                  : login :registr:account:` );
        L.warn(`---------------------------------------------------------------------------------------------------------`);
        for (let line of this.reports) {
            let url = "  ".concat(line[0]).padEnd(56, " ");
            L.warn(`${url} :${line[1].get(EResultType.loginButton) ? "   X   " : "       "}:${line[1].get(EResultType.registerButton) ? "   X   " : "       "}:${line[1].get(EResultType.accountButton) ? "   X   " : "       "}:` );
        }
        L.warn(`---------------------------------------------------------------------------------------------------------`);

        this.reports = undefined;
        return;
    }
}
