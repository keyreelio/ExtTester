// import {EReportParsePart, EReportResult, EReportTest} from "./report";
// import {ReportTxt} from "./reportTxt";
//
//
// export class ReportCsv extends ReportTxt {
//
//     public constructor(engineName: string, dumpFilePath: string, reportFile: string) {
//         super(engineName, dumpFilePath, reportFile);
//     }
//
//     protected async printHeader(): Promise<void> {
//         this.printLine("url;save_with_button;save_without_button;load;has_signin_button;" +
//             "has_full_form;has_first_step_form;has_second_step_form;has_loggedin;did_not_parse;fail_messages");
//     }
//
//     protected async printReport(): Promise<void> {
//         let marker = function (result: EReportResult | undefined) {
//             switch (result) {
//                 case EReportResult.skip: return "skip";
//                 case EReportResult.manual: return "manual";
//                 case EReportResult.manualBeforeLoggedIn: return "manual_before";
//                 case EReportResult.manualAfterLoggedIn: return "manual_after";
//                 case EReportResult.fail: return "fail";
//                 case EReportResult.auto: return "auto";
//                 case EReportResult.waitApprove: return "wait_approve";
//             }
//             return "";
//         }
//
//         let formMarker = function (result: boolean | undefined) {
//             return result ? "true" : "";
//         }
//
//         let map = new Map(Object.entries(this.reports));
//         map.forEach((report: ReportItem, u: string) => {
//             let part: string[] = [];
//
//             part.push(report.url);
//             part.push(marker(report.results[EReportTest.saveUsingButtons]));
//             part.push(marker(report.results[EReportTest.saveWithoutButtons]));
//             part.push(marker(report.results[EReportTest.load]));
//             part.push(formMarker(report.parseParts[EReportParsePart.signInButton]));
//             part.push(formMarker(report.parseParts[EReportParsePart.fullLoginForm]));
//             part.push(formMarker(report.parseParts[EReportParsePart.firstStepLoginForm]));
//             part.push(formMarker(report.parseParts[EReportParsePart.secondStepLoginForm]));
//             part.push(formMarker(report.parseParts[EReportParsePart.loggedIn]));
//             part.push(formMarker(report.parseParts[EReportParsePart.notParsed]));
//             part.push(report.failMessages.join(" : ").replace(/(\r\n|\n|\r)/gm, ""));
//
//             this.printLine(`${part.join(";")}`);
//         });
//     }
//
//     protected async printFooter(): Promise<void> {
//     }
// }
