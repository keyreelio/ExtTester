


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
    static WaitLocatedElement = 200;
    static WaitLocatedAnimationElement = 2000;

    static WaitParsedPage = 500;
    static WaitParsedPageMin = 50;


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
}
