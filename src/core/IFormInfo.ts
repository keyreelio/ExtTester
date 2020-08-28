interface IFormInfo {
    frame: string | undefined;
    selector: string;
    inputs: {[tag: string]: string};
    buttons: {[tag: string]: string};
    unsecured: boolean;
}
