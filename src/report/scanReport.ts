import {reportLogger as L} from "../common/log.config";
import * as fs from "fs";
import {WriteStream} from "fs";
import {EResultType} from "../core/EResultType";

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
        let fName = `reports/report-${this.date.toISOString()}.txt`;
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
        this.line(` No : domain                                                  : login :registr:account: error` );
        this.line(`--------------------------------------------------------------------------------------------------------------`);
        var idx = 0;
        for (let line of this.reports) {
            idx += 1;
            let url = " ".concat(line[0]).padEnd(56, ' ');
            let no = idx.toString().padStart(4, ' ');
            let l: Map<EResultType, boolean> = line[1];
            let errors = Array.from(l.keys())
                .map( (k) => EResultType[k] || `unknownError(${k})` )
                .filter( (k) => k.endsWith('Error') );

            this.line(
              `${no}:${url} :` +
              `${l.get(EResultType.loginButton)    ? "   X   " : "       "}:`+
              `${l.get(EResultType.registerButton) ? "   X   " : "       "}:`+
              `${l.get(EResultType.accountButton)  ? "   X   " : "       "}:`+
              `${errors.length>0 ? ' ' + errors.join(', ') : ""}`
            );
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
