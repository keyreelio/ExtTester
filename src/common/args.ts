
export class Args {

    public static parseArg(args: string[], arg: string): boolean {
        return args.includes(arg);
    }

    public static parseStrValueArg(args: string[], arg: string, defValue: string | undefined = undefined): string | undefined {
        if (!args.includes(arg)) return defValue;
        let index = args.indexOf(arg);
        if (index < 0 || index === (args.length - 1)) return defValue;
        let value = args[index + 1]
        if (value === undefined) return defValue;
        return value;
    }

    public static parseNumValueArg(args: string[], arg: string, defValue: number = 0): number {
        let value = Number(this.parseStrValueArg(args, arg, `${defValue}`));
        if (value === undefined || isNaN(value)) return defValue;
        return value;
    }
}
