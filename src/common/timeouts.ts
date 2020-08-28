import {parserLogger as L} from "../common/log.config";

// times in milliseconds
export class Timeouts {

    // WebElementExt
    static BeforeClick = 200;
    static BeforeEnter = 200;
    static BeforeSendKeys = 200;
    static BetweenKey = 30;
    static WaitExistValue = 2000;

    // WebDriverExt
    static AfterOpenUrl = 200;
    static WaitOpenedUrl = 5000;
    static WaitPageLoading = 30000;
    static WaitLocatedElement = 200;
    static WaitLocatedAnimatedElement = 2000;
    static WaitCaptchaFilling = 10000;//2*60*1000; // 2 mins

    // tester
    static WaitParsedPage = 500;
    static WaitParsedPageMin = 50;
    static WaitCheckCredential = 3*60*1000; // 3mins

    //
    static WaitToAutosaveAccount = 10000;

    /**
     * For time measuring
     *
     * Example:
     *  let time = Timeouts.begin();
     *   ... long operations...
     *  l.info( "executed for ${Timeouts.end(time)}ms" );
     */
    static begin(): [number, number] {
        return process.hrtime();
    }

    static end(begin: [number, number]): number {
      let endTime = process.hrtime(begin);
      return Math.round(endTime[0] * 1000 + endTime[1] / 1000000);
    }

    static startExpirationTimer(timeout: number, error: Error): Promise<void> {
        return new Promise(function(resolve, reject) {
            setTimeout(function () {
                reject(error);
            }, timeout);
        });
    }
}
