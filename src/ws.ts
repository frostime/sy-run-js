/*
 * Copyright (c) 2024 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2024-09-04 17:13:05
 * @FilePath     : /src/ws.ts
 * @LastEditTime : 2024-09-06 22:06:21
 * @Description  : 
 */

import { type Client } from "@siyuan-community/siyuan-sdk";
import type RunJsPlugin from ".";

let ws: WebSocket;

const createWebsocket = (plugin: RunJsPlugin, client: Client) => {
    const CHANNEL_NAME = plugin.name;
    ws = client.broadcast({ channel: CHANNEL_NAME });

    ws.onmessage = (event: MessageEvent) => {
        const jsCode = event.data;
        console.groupCollapsed(`Received code from ws channel ${CHANNEL_NAME}`);
        plugin.runJsCodeAsync(jsCode);
        console.log(jsCode);
        console.groupEnd();
    }
}

const closeWebsocket = () => {
    if (ws === null || ws === undefined) {
        return;
    }

    ws.close();

    ws = null;
}

const startWebsocket = (plugin: RunJsPlugin, client: Client) => {
    if (isConnected()) {
        console.warn(`Websocket is already connected`);
        return;
    }

    closeWebsocket();
    createWebsocket(plugin, client);
}

const isConnected = () => {
    if (ws === null || ws === undefined) return false;
    return ws.readyState === ws.OPEN;
}

export {
    startWebsocket,
    isConnected,
    closeWebsocket
}
