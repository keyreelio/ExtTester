import {EReportResult, EReportTest, IReport} from "./report";
import {reportLogger as L} from "../common/log.config";
import * as fs from "fs";
import {WriteStream} from "fs";

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
    protected fLog: WriteStream | undefined;
    protected date: Date = new Date()

    public start(): void {
        if (this.reports !== undefined) return;
        this.reports = new Map<string, Map<EResultType, boolean>>();
        this.date = new Date();
        let fName = `report-${this.date.toISOString()}.txt`;
        this.fLog = fs.createWriteStream(fName, { flags: 'a' });
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


    private line(l: string) {
       L.warn(l);
       if (this.fLog != null) {
           this.fLog.write(l + '\n');
       }
    }

    public finish() {
        if (this.reports === undefined) return;
        this.line(this.date.toString());
        this.line(`--------------------------------------------------------------------------------------------------------------`);
        this.line( ` No : domain                                                  : login :registr:account:` );
        this.line(`--------------------------------------------------------------------------------------------------------------`);
        var idx = 0;
        for (let line of this.reports) {
            idx += 1;
            let url = " ".concat(line[0]).padEnd(56, ' ');
            let no = idx.toString().padStart(4, ' ');
            this.line(`${no}:${url} :${line[1].get(EResultType.loginButton) ? "   X   " : "       "}:${line[1].get(EResultType.registerButton) ? "   X   " : "       "}:${line[1].get(EResultType.accountButton) ? "   X   " : "       "}:` );
        }
        this.line(`--------------------------------------------------------------------------------------------------------------`);
        if (this.fLog != null) {
            this.fLog.close();
            this.fLog = undefined
        }
        this.reports = undefined;
        return;
    }
}
