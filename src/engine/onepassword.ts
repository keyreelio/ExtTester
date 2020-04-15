import {Engine} from './engine'
import {onePasswordEngineLogger as L} from "../common/log.config";


// export class OnePasswordXEngine extends Engine {
//     public async startup(): Promise<WebDriver> {
//         let options = new chrome.Options();
//         options.addArguments("user-data-dir=./chrome_profiles/onepassword");
//         let crx = fs.readFileSync('./resources/crxs/1passwordx.crx', {encoding: "base64"});
//         options.addExtensions(crx);
//         let krcrx = fs.readFileSync('./resources/crxs/keyreel.crx', {encoding: "base64"});
//         options.addExtensions(krcrx);
//
//         let driver = await this.createDriver(options);
//
//         await driver.sleep(1000);
//
//         var welcome = false;
//         try {
//             await driver.get('chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/app/app.html#/page/welcome')
//             await driver.wait(until.elementLocated(By.id("signInButton")), 2000).click();
//             await driver.wait(until.urlContains("/signin"), 2000);
//
//             await driver.wait(until.elementLocated(By.id("email")), 2000).sendKeys("hdayfg6wq5sq@gmail.com");
//             await driver.findElement(By.id("account-key")).sendKeys("A3-4J9LQG-APXJD3-KYXNL-ARBGG-TLKV3-YVMYQ");
//             await driver.findElement(By.id("master-password")).sendKeys("hrfW-Y1q3_4%");
//             await driver.findElement(By.className("signin-actions")).findElement(By.xpath("button")).click();
//
//             welcome = true;
//         } catch (UnhandledPromiseRejectionWarning) {
//         }
//
//         if (!welcome) {
//             try {
//                 await driver.get('chrome-extension://aeblfdkhhhdcdjpifhhbdiojplfjncoa/mini/mini.html');
//                 await driver.wait(until.elementLocated(By.id("masterPassword-input")), 2000).sendKeys("hrfW-Y1q3_4%", Key.RETURN);
//             } catch (UnhandledPromiseRejectionWarning) {
//             }
//         }
//
//         await driver.sleep(2000);
//
//         return Promise.resolve(driver);
//     }
// }
