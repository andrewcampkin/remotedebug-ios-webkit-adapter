import * as createDebug from "debug";
declare class LoggerUtil {
    constructor();
    log(msg: string): void;
    error(msg: string): void;
}
export declare const debug: createDebug.Debugger;
export declare const Logger: LoggerUtil;
export {};
