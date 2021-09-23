/// <reference types="node" />
import * as WebSocket from "ws";
import { EventEmitter } from "events";
import { ChildProcess } from "child_process";
import { ITarget, IAdapterOptions, IIOSDeviceTarget } from "./adapterInterfaces";
import { Target } from "../protocols/target";
export declare class Adapter extends EventEmitter {
    protected _id: string;
    protected _adapterType: string;
    protected _proxyUrl: string;
    protected _options: IAdapterOptions;
    protected _url: string;
    protected _proxyProc: ChildProcess | undefined;
    protected _targetMap: Map<string, Target>;
    protected _targetIdToTargetDataMap: Map<string, ITarget>;
    constructor(id: string, socket: string, options: IAdapterOptions);
    get id(): string;
    start(): Promise<any>;
    stop(): void;
    getTargets(metadata?: any): Promise<ITarget[]>;
    connectTo(targetId: string, wsFrom: WebSocket): Target | undefined;
    forwardTo(targetId: string, message: string): void;
    forceRefresh(): void;
    protected setTargetInfo(t: ITarget, metadata?: IIOSDeviceTarget): ITarget;
    protected refreshProcess(process: ChildProcess, path: string, args: string[]): Promise<ChildProcess | undefined>;
    protected spawnProcess(path: string, args: string[]): Promise<ChildProcess | undefined>;
}
