import {reportLogger as L} from "../common/log.config";
import * as fs from "fs";
import {WriteStream} from "fs";
import {EResultType} from "../core/EResultType";
import {PageInfo} from "../core/PageInfo";

export interface IScanReport {
    start(): void;
    setResult(url: string, result: PageInfo): void;
    finish(): void;
}

export class ScanReportLogger implements IScanReport {

    protected reports: Array<{url: string, page: PageInfo}> | undefined;
    protected fLog: WriteStream | undefined;
    protected date: Date = new Date()

    public start(): void {
        if (this.reports !== undefined) return;
        this.reports = [];
        this.date = new Date();
        let fName = `reports/report-${this.date.toISOString()}.txt`;
        this.fLog = fs.createWriteStream(fName, { flags: 'a' });
    }

    public setResult(
        domain: string,
        result: PageInfo
    ) {
        if (this.reports === undefined) return;
        this.reports.push({ url: domain, page: result});
    }


    private line(l: string) {
       L.warn(l);
       if (this.fLog != null) {
           this.fLog.write(l + '\n');
       }
    }

    public finish() {
        let sep = `----+----------------------------------------------------------+-------+-------+-------+-------+-------+----------------------`;
        if (this.reports === undefined) return;
        this.line(this.date.toString());
        this.line(sep);
        this.line(`    |                                                          |        Buttons        |     Forms     |`);
        this.line(` No | Domain                                                   +-------+-------+-------+-------+-------+        Error`);
        this.line(`    |                                                          | login |registr|account| login |registr|`);
        this.line(sep);
        var idx = 0;
        for (let info of this.reports) {
            idx += 1;
            let url = " ".concat(info.url.padEnd(56, ' '));
            let no = idx.toString().padStart(4, ' ');
            let l: PageInfo = info.page;
            let error = l.error || ''
            this.line(
              `${no}:${url} :` +
              `${l.buttons['login'] != null  ? "   X   " : "       "}:`+
              `${l.buttons['registration'] != null ? "   X   " : "       "}:`+
              `${l.buttons['account'] != null  ? "   X   " : "       "}:`+
              `${l.forms['login'] != null  ? "   X   " : "       "}:`+
              `${l.forms['registration'] != null ? "   X   " : "       "}:`+
              `${error}`
            );
        };
        this.line(sep);
        if (this.fLog != null) {
            this.fLog.close();
            this.fLog = undefined
        }
        this.reports = undefined;
        return;
    }
}
