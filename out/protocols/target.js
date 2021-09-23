"use strict";
//
// Copyright (C) Microsoft. All rights reserved.
//
Object.defineProperty(exports, "__esModule", { value: true });
exports.Target = void 0;
const WebSocket = require("ws");
const events_1 = require("events");
const logger_1 = require("../logger");
const createDebug = require("debug");
class Target extends events_1.EventEmitter {
    constructor(targetId, data) {
        super();
        this._data = data;
        this._messageBuffer = [];
        this._messageFilters = new Map();
        this._toolRequestMap = new Map();
        this._adapterRequestMap = new Map();
        this._requestId = 0;
        this._targetBased = false;
        this._targetId = null;
        // Chrome currently uses id, iOS usies appId
        this._id = targetId;
    }
    get data() {
        return this._data;
    }
    set targetBased(isTargetBased) {
        this._targetBased = isTargetBased;
    }
    set targetId(targetId) {
        this._targetId = targetId;
    }
    connectTo(url, wsFrom) {
        if (this._wsTarget) {
            logger_1.Logger.error(`Already connected`);
            return;
        }
        this._url = url;
        this._wsTools = wsFrom;
        // Create a connection to the real websocket endpoint
        this._wsTarget = new WebSocket(url);
        this._wsTarget.on("error", (err) => {
            createDebug("socket.error")(err);
        });
        this._wsTarget.on("message", (message) => {
            this.onMessageFromTarget(message.toString());
        });
        this._wsTarget.on("open", () => {
            createDebug("socket.open")(`Connection established to ${url}`);
            createDebug("socket.open")(this._wsTarget);
            this._isConnected = true;
            for (let i = 0; i < this._messageBuffer.length; i++) {
                this.onMessageFromTools(this._messageBuffer[i]);
            }
            this._messageBuffer = [];
        });
        this._wsTarget.on("close", () => {
            createDebug("socket.close")("Socket is closed");
        });
    }
    forward(message) {
        if (!this._wsTarget) {
            logger_1.Logger.error("No websocket endpoint found");
            return;
        }
        this.onMessageFromTools(message);
    }
    updateClient(wsFrom) {
        if (this._wsTarget) {
            this._wsTarget.close();
        }
        this._wsTarget = null;
        this._url && this.connectTo(this._url, wsFrom);
    }
    addMessageFilter(method, filter) {
        var _a;
        if (!this._messageFilters.has(method)) {
            this._messageFilters.set(method, []);
        }
        (_a = this._messageFilters.get(method)) === null || _a === void 0 ? void 0 : _a.push(filter);
    }
    callTarget(method, params) {
        return new Promise((resolve, reject) => {
            const request = {
                id: --this._requestId,
                method: method,
                params: params,
            };
            this._adapterRequestMap.set(request.id, {
                resolve: resolve,
                reject: reject,
            });
            this.sendToTarget(JSON.stringify(request));
        });
    }
    fireEventToTools(method, params) {
        const response = {
            method: method,
            params: params,
        };
        this.sendToTools(JSON.stringify(response));
    }
    fireResultToTools(id, params) {
        const response = {
            id: id,
            result: params,
        };
        this.sendToTools(JSON.stringify(response));
    }
    replyWithEmpty(msg) {
        this.fireResultToTools(msg.id, {});
        return Promise.resolve(null);
    }
    onMessageFromTools(rawMessage) {
        var _a;
        createDebug("message.tools")(rawMessage);
        if (!this._isConnected) {
            logger_1.debug("Connection not yet open, buffering message.");
            this._messageBuffer.push(rawMessage);
            return;
        }
        const msg = JSON.parse(rawMessage);
        const eventName = `tools::${msg.method}`;
        this._toolRequestMap.set(msg.id, msg.method);
        this.emit(eventName, msg.params);
        if (this._messageFilters.has(eventName)) {
            let sequence = Promise.resolve(msg);
            (_a = this._messageFilters.get(eventName)) === null || _a === void 0 ? void 0 : _a.forEach((filter) => {
                sequence = sequence.then((filteredMessage) => {
                    return filter(filteredMessage);
                });
            });
            sequence.then((filteredMessage) => {
                // Only send on the message if it wasn't completely filtered out
                if (filteredMessage) {
                    rawMessage = JSON.stringify(filteredMessage);
                    this.sendToTarget(rawMessage);
                }
            });
        }
        else {
            // Pass it on to the target
            this.sendToTarget(rawMessage);
        }
    }
    onMessageFromTarget(rawMessage) {
        var _a, _b;
        createDebug("message.raw")(rawMessage);
        let msg = JSON.parse(rawMessage);
        if (this._targetBased) {
            if (!msg.method || !msg.method.match(/^Target/)) {
                return;
            }
            if (msg.method === "Target.dispatchMessageFromTarget") {
                rawMessage = msg.params.message;
                msg = JSON.parse(rawMessage);
            }
        }
        if ("id" in msg) {
            if (this._toolRequestMap.has(msg.id)) {
                // Reply to tool request
                let eventName = `target::${this._toolRequestMap.get(msg.id)}`;
                this.emit(eventName, msg.params);
                this._toolRequestMap.delete(msg.id);
                if ("error" in msg &&
                    this._messageFilters.has("target::error")) {
                    eventName = "target::error";
                }
                if (this._messageFilters.has(eventName)) {
                    let sequence = Promise.resolve(msg);
                    (_a = this._messageFilters.get(eventName)) === null || _a === void 0 ? void 0 : _a.forEach((filter) => {
                        sequence = sequence.then((filteredMessage) => {
                            return filter(filteredMessage);
                        });
                    });
                    sequence.then((filteredMessage) => {
                        rawMessage = JSON.stringify(filteredMessage);
                        this.sendToTools(rawMessage);
                    });
                }
                else {
                    // Pass it on to the tools
                    this.sendToTools(rawMessage);
                }
            }
            else if (this._adapterRequestMap.has(msg.id)) {
                // Reply to adapter request
                const resultPromise = this._adapterRequestMap.get(msg.id);
                this._adapterRequestMap.delete(msg.id);
                if ("result" in msg) {
                    resultPromise === null || resultPromise === void 0 ? void 0 : resultPromise.resolve(msg.result);
                }
                else if ("error" in msg) {
                    resultPromise === null || resultPromise === void 0 ? void 0 : resultPromise.reject(msg.error);
                }
                else {
                    logger_1.Logger.error(`Unhandled type of request message from target ${rawMessage}`);
                }
            }
            else {
                logger_1.Logger.error(`Unhandled message from target ${rawMessage}`);
            }
        }
        else {
            const eventName = `target::${msg.method}`;
            this.emit(eventName, msg);
            if (this._messageFilters.has(eventName)) {
                let sequence = Promise.resolve(msg);
                (_b = this._messageFilters.get(eventName)) === null || _b === void 0 ? void 0 : _b.forEach((filter) => {
                    sequence = sequence.then((filteredMessage) => {
                        return filter(filteredMessage);
                    });
                });
                sequence.then((filteredMessage) => {
                    rawMessage = JSON.stringify(filteredMessage);
                    this.sendToTools(rawMessage);
                });
            }
            else {
                // Pass it on to the tools
                this.sendToTools(rawMessage);
            }
        }
    }
    sendToTools(rawMessage) {
        createDebug("sendTo.tools")(rawMessage);
        // Make sure the tools socket can receive messages
        if (this._wsTools && this.isSocketConnected(this._wsTools)) {
            this._wsTools.send(rawMessage);
        }
    }
    sendToTarget(rawMessage) {
        createDebug("sendTo.target")(rawMessage);
        if (this._targetBased) {
            const message = JSON.parse(rawMessage);
            if (!message.method.match(/^Target/)) {
                const newMessage = {
                    id: message.id,
                    method: "Target.sendMessageToTarget",
                    params: {
                        id: message.id,
                        message: JSON.stringify(message),
                        targetId: this._targetId,
                    },
                };
                rawMessage = JSON.stringify(newMessage);
                createDebug("sendTo.target.targeted")(rawMessage);
            }
        }
        // Make sure the target socket can receive messages
        if (this._wsTarget && this.isSocketConnected(this._wsTarget)) {
            this._wsTarget.send(rawMessage);
        }
        else {
            // The socket has closed, we should send this message up to the parent
            this._wsTarget = null;
            this.emit("socketClosed", this._id);
        }
    }
    isSocketConnected(ws) {
        return ws && ws.readyState === WebSocket.OPEN;
    }
}
exports.Target = Target;
