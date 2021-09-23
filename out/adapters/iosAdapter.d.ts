import * as WebSocket from "ws";
import { Target } from "../protocols/target";
import { AdapterCollection } from "./adapterCollection";
import { ITarget, IIOSProxySettings } from "./adapterInterfaces";
export declare class IOSAdapter extends AdapterCollection {
    private _proxySettings;
    private _protocolMap;
    constructor(id: string, socket: string, proxySettings: IIOSProxySettings, frontEndUrl?: string);
    getTargets(): Promise<ITarget[]>;
    connectTo(url: string, wsFrom: WebSocket): Target;
    static getProxySettings(args: Partial<IIOSProxySettings>): Promise<IIOSProxySettings | string | null>;
    private static getProxyPath;
    private getProtocolFor;
}
