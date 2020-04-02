import { log_message } from "./logger";
import {Builder, By, Key, until, WebDriver} from 'selenium-webdriver';
import * as chrome from "selenium-webdriver/chrome";

let test: number = 20;
let str: string = `test string ${ test }`;

(async function example() {
    let options = new chrome.Options();
    options.addArguments("user-data-dir=C:\\Users\\olek\\dev\\exttester\\resources\\chrome_profiles\\1password");

    let driver = await new Builder()
        .forBrowser('chrome')
        .setChromeOptions(options)
        .build();
    await driver.get('https://twitter.com/login');

})();

log_message(str);