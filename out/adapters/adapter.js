"use strict";
//
// Copyright (C) Microsoft. All rights reserved.
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.Adapter = void 0;
const request = require("request");
const events_1 = require("events");
const child_process_1 = require("child_process");
const target_1 = require("../protocols/target");
const logger_1 = require("../logger");
const debug = require("debug");
class Adapter extends events_1.EventEmitter {
    constructor(id, socket, options) {
        var _a;
        super();
        this._id = id;
        this._proxyUrl = socket;
        this._targetMap = new Map();
        this._targetIdToTargetDataMap = new Map();
        (_a = options.frontendUrl) !== null && _a !== void 0 ? _a : (options.frontendUrl = "http://127.0.0.1:9200/inspector.html");
        // Apply default options
        options.pollingInterval = options.pollingInterval || 3000;
        options.baseUrl = options.baseUrl || "http://127.0.0.1";
        options.path = options.path || "/json";
        options.port = options.port || 9222;
        this._options = options;
        this._url = `${this._options.baseUrl}:${this._options.port}${this._options.path}`;
        const index = this._id.indexOf("/", 1);
        if (index >= 0) {
            this._adapterType = "_" + this._id.substr(1, index - 1);
        }
        else {
            this._adapterType = this._id.replace("/", "_");
        }
    }
    get id() {
        debug(`adapter.id`)(this._id);
        return this._id;
    }
    start() {
        var _a;
        debug(`adapter.start`)(this._options);
        if (!this._options.proxyExePath) {
            debug(`adapter.start`)(`Skip spawnProcess, no proxyExePath available`);
            return Promise.resolve(`skipped`);
        }
        return this.spawnProcess(this._options.proxyExePath, (_a = this._options.proxyExeArgs) !== null && _a !== void 0 ? _a : []);
    }
    stop() {
        debug(`adapter.stop`);
        if (this._proxyProc) {
            // Terminate the proxy process
            this._proxyProc.kill("SIGTERM");
            this._proxyProc = undefined;
        }
    }
    getTargets(metadata) {
        debug(`adapter.getTargets`)(`metadata=${JSON.stringify(metadata)}`);
        return new Promise((resolve, reject) => {
            request(this._url, (error, response, body) => {
                if (error) {
                    resolve([]);
                    return;
                }
                const targets = [];
                const rawTargets = JSON.parse(body);
                rawTargets.forEach((t) => {
                    var _a;
                    if (!("deviceId" in metadata) ||
                        metadata.deviceId !== ((_a = t.metadata) === null || _a === void 0 ? void 0 : _a.deviceId)) {
                        targets.push(this.setTargetInfo(t, metadata));
                    }
                });
                resolve(targets);
            });
        });
    }
    connectTo(targetId, wsFrom) {
        debug(`adapter.connectTo`)(`targetId=${targetId}`);
        if (!this._targetIdToTargetDataMap.has(targetId)) {
            logger_1.Logger.error(`No endpoint url found for id ${targetId}`);
            return;
        }
        else if (this._targetMap.has(targetId)) {
            debug(`Existing target found for id ${targetId}`);
            const existingTarget = this._targetMap.get(targetId);
            existingTarget === null || existingTarget === void 0 ? void 0 : existingTarget.updateClient(wsFrom);
            return existingTarget;
        }
        const targetData = this._targetIdToTargetDataMap.get(targetId);
        const target = new target_1.Target(targetId, targetData);
        targetData && target.connectTo(targetData.webSocketDebuggerUrl, wsFrom);
        // Store the tools websocket for this target
        this._targetMap.set(targetId, target);
        target.on("socketClosed", (id) => {
            this.emit("socketClosed", id);
        });
        return target;
    }
    forwardTo(targetId, message) {
        var _a;
        debug(`adapter.forwardTo`)(`targetId=${targetId}`);
        if (!this._targetMap.has(targetId)) {
            logger_1.Logger.error(`No target found for id ${targetId}`);
            return;
        }
        (_a = this._targetMap.get(targetId)) === null || _a === void 0 ? void 0 : _a.forward(message);
    }
    forceRefresh() {
        debug("adapter.forceRefresh");
        if (this._proxyProc &&
            this._options.proxyExePath &&
            this._options.proxyExeArgs) {
            this.refreshProcess(this._proxyProc, this._options.proxyExePath, this._options.proxyExeArgs);
        }
    }
    setTargetInfo(t, metadata) {
        debug("adapter.setTargetInfo")(t, metadata);
        // Ensure there is a valid id
        const id = t.id || t.webSocketDebuggerUrl;
        t.id = id;
        // Set the adapter type
        t.adapterType = this._adapterType;
        t.type = t.type || "page";
        // Append the metadata
        t.metadata = metadata;
        // Store the real endpoint
        const targetData = JSON.parse(JSON.stringify(t));
        this._targetIdToTargetDataMap.set(t.id, targetData);
        // Overwrite the real endpoint with the url of our proxy multiplexor
        t.webSocketDebuggerUrl = `${this._proxyUrl}${this._id}/${t.id}`;
        let wsUrl = `${this._proxyUrl.replace("ws://", "")}${this._id}/${t.id}`;
        t.devtoolsFrontendUrl = `${this._options.frontendUrl}?experiments=true&remoteFrontend=screencast&ws=${wsUrl}`;
        return t;
    }
    refreshProcess(process, path, args) {
        debug("adapter.refreshProcess");
        process.kill("SIGTERM");
        return this.spawnProcess(path, args);
    }
    spawnProcess(path, args) {
        debug(`adapter.spawnProcess, path=${path}`);
        return new Promise((resolve, reject) => {
            var _a, _b;
            if (this._proxyProc) {
                reject("adapter.spawnProcess.error, err=process already started");
            }
            this._proxyProc = child_process_1.spawn(path, args, {
                detached: true,
                stdio: ["ignore"],
            });
            this._proxyProc.on("error", (err) => {
                debug(`adapter.spawnProcess.error, err=${err}`);
                reject(`adapter.spawnProcess.error, err=${err}`);
            });
            this._proxyProc.on("close", (code) => {
                debug(`adapter.spawnProcess.close, code=${code}`);
                reject(`adapter.spawnProcess.close, code=${code}`);
            });
            (_a = this._proxyProc.stdout) === null || _a === void 0 ? void 0 : _a.on("data", (data) => {
                debug(`adapter.spawnProcess.stdout, data=${data.toString()}`);
            });
            (_b = this._proxyProc.stderr) === null || _b === void 0 ? void 0 : _b.on("data", (data) => {
                debug(`adapter.spawnProcess.stderr, data=${data.toString()}`);
            });
            setTimeout(() => {
                resolve(this._proxyProc);
            }, 200);
        });
    }
}
exports.Adapter = Adapter;
