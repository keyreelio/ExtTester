import { log_message } from "./logger";

let test: number = 20;
let str: string = `test string ${ test }`;

log_message(str);