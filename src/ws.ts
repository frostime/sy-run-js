/*
 * Copyright (c) 2024 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2024-09-04 17:13:05
 * @FilePath     : /src/ws.ts
 * @LastEditTime : 2024-12-12 13:39:30
 * @Description  : 
 */

import { type Client } from "@siyuan-community/siyuan-sdk";
import type RunJsPlugin from ".";
import { request } from "./api";

let ws: WebSocket;

const postMessage = (channel: string, message: any) => {
    request('/api/broadcast/postMessage', {
        channel,
        message
    });
}

const runCode = async (code: string, plugin: RunJsPlugin) => {
    const { siyuan, client, api } = plugin.funcViableVars();
    let func = new Function(
        'siyuan', 'client', 'api', 'plugin', 'ws', 'postMessage',
        code
    );
    const allowedProps = [
        'readyState', 'url', 'protocol', 'extensions', 'binaryType', 'bufferedAmount',
        'send'
    ];
    const proxy = new Proxy(ws, {
        set: (target, prop, _) => {
            console.warn(`Attempted to set property ${String(prop)} on ws, which is not allowed.`);
            return true; // 返回 true 表示设置成功，但实际上不进行任何操作
        },
        get: (target, prop: string) => {
            if (allowedProps.includes(prop)) {
                let value = target[prop];
                if (typeof value === 'function') {
                    value = value.bind(target);
                }
                return value;
            } else {
                console.warn(`Attempted to access property ${String(prop)} on ws, which is not allowed.`);
                return null;
            }
        }
    })
    func(siyuan, client, api, plugin, proxy, postMessage);
}

const createWebsocket = (plugin: RunJsPlugin, client: Client) => {
    const CHANNEL_NAME = plugin.name;
    ws = client.broadcast({ channel: CHANNEL_NAME });

    ws.onmessage = (event: MessageEvent) => {
        const jsCode = event.data;
        console.groupCollapsed(`Received code from ws channel ${CHANNEL_NAME}`);
        console.debug(jsCode);
        runCode(jsCode, plugin);
        console.groupEnd();
    }
}

const closeWebsocket = () => {
    if (ws === null || ws === undefined) {
        return;
    }

    ws.close();

    ws = null;
    console.debug(`Websocket closed`);
}

const startWebsocket = (plugin: RunJsPlugin, client: Client) => {
    const body = document.body;
    if (body.classList.contains('body--window')) {
        console.warn(`RunJS would not start ws in SiYuan mini windows.`);
        return;
    }

    if (isConnected()) {
        console.warn(`Websocket is already connected`);
        return;
    }

    closeWebsocket();
    createWebsocket(plugin, client);
    console.debug(`Websocket started: channel ${plugin.name}`);
}

const isConnected = () => {
    if (ws === null || ws === undefined) return false;
    return ws.readyState === ws.OPEN;
}

const urls = () => {
    return {
        ws: ws?.url ?? '无连接',
        api: `${window.location.origin}/api/broadcast/postMessage`
    };
}

export {
    startWebsocket,
    isConnected,
    closeWebsocket,
    urls as wsUrl
}
