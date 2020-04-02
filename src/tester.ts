import { log_message } from "./logger";

let test: number = 10;
let str: string = `test string ${ test }`;

log_message(str);