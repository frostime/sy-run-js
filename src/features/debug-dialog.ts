/*
 * Copyright (c) 2024 by frostime. All Rights Reserved.
 * @Author       : frostime
 * @Date         : 2024-11-05 17:35:57
 * @FilePath     : /src/features/debug-dialog.ts
 * @LastEditTime : 2024-11-06 21:31:15
 * @Description  : 
 */
import type RunJsPlugin from "@/index";
import { openTab, Protyle } from "siyuan";

import { html2ele } from "@/libs/dialog";
import { getBlockByID } from "@/api";




/**
 * 将任意对象转换为字符串, 支持循环引用; 支持复杂类型
 * @param obj 
 */
const stringify = (obj: any) => {
    // Handle primitive types directly
    if (obj === null) return 'null';
    if (obj === undefined) return 'undefined';
    if (typeof obj === 'string') return obj;
    if (typeof obj === 'number' || typeof obj === 'boolean' || typeof obj === 'symbol') 
        return obj.toString();
    if (typeof obj === 'function') return obj.toString();

    // Handle circular references using a WeakSet
    const seen = new WeakSet();

    const innerStringify = (val: any, depth = 0): string => {
        if (val === null) return 'null';
        if (val === undefined) return 'undefined';
        if (typeof val === 'string') return `"${val}"`;
        if (typeof val === 'number' || typeof val === 'boolean' || typeof val === 'symbol') 
            return val.toString();
        if (typeof val === 'function') return '[Function]';

        // Handle circular references
        if (typeof val === 'object') {
            if (seen.has(val)) return '[Circular]';
            seen.add(val);

            // Handle special objects
            if (val instanceof Error) return val.toString();
            if (val instanceof Date) return val.toISOString();
            if (val instanceof RegExp) return val.toString();

            // Handle arrays
            if (Array.isArray(val)) {
                if (depth > 2) return '[Array]'; // Limit depth
                const items = val.map(item => innerStringify(item, depth + 1));
                return `[${items.join(', ')}]`;
            }

            // Handle objects
            if (depth > 2) return '[Object]'; // Limit depth
            const pairs = Object.entries(val)
                .map(([key, value]) => `${key}: ${innerStringify(value, depth + 1)}`);
            return `{${pairs.join(', ')}}`;
        }

        return String(val);
    };

    return innerStringify(obj);
};

/**
 * 返回一个假的 console 对象, 支持 debug, log, warn, error; 传入的结果会被放到字符串中
 */
const useFakeConsole = () => {
    const fakeConsole = document.createElement("div");
    Object.assign(fakeConsole.style, {
        fontSize: "16px",
        // width: "100%",
        // height: "100%",
        // overflow: "scroll",
    });

    const logToConsole = (type: "log" | "debug" | "warn" | "error", ...args: any[]) => {
        const ele = document.createElement("div");
        ele.textContent = args.map(arg => stringify(arg)).join(" ");
        const color = {
            log: "var(--b3-theme-primary)",
            debug: "var(--b3-theme-on-background)",
            warn: "var(--b3-card-error-color)",
            error: "var(--b3-card-error-color)",
        }[type];
        ele.style.color = color;
        ele.style.margin = "5px 0";
        fakeConsole.appendChild(ele);
    }

    return {
        ele: fakeConsole,
        clear: () => fakeConsole.innerHTML = "",
        log: (...args: any[]) => logToConsole("log", ...args),
        debug: (...args: any[]) => logToConsole("debug", ...args),
        warn: (...args: any[]) => logToConsole("warn", ...args),
        error: (...args: any[]) => logToConsole("error", ...args),
    }
}

const useDebugDialog = (plugin: RunJsPlugin, blockId: BlockId) => {
    const uiTemplate = `
<section style="display: flex; flex-direction: column; flex: 1; padding: 25px; height: 95%;">
  <div style="display: flex; justify-content: flex-start; margin-bottom: 10px; gap: 10px;">
    <span style="display: inline; color: var(--b3-theme-primary);">
      {{block-id}}
    </span>
    <span class="fn__flex-1"></span>
    <button id="clear-console" class="b3-button">Clear</button>
    <button id="run" class="b3-button">Run</button>
  </div>
  <div style="display: flex; flex: 1; gap: 10px;">
    <div id="protyle-container" style="flex: 3;"></div>
    <div class="fn__block" 
        id="console-container" 
        style="max-height: 100%; flex: 2; background-color: var(--b3-theme-background); padding: 10px; overflow: scroll;"
    >
    </div>
  </div>
</section>
`;

    const html = uiTemplate.replace("{{block-id}}", blockId);
    const frag = html2ele(html);

    const protyleContainer = frag.querySelector("#protyle-container") as HTMLDivElement;
    const protyle = new Protyle(plugin.app, protyleContainer, {
        blockId,
        // action: ['cb-get-all'],
        render: {
            gutter: false,
            // scroll: false,
            breadcrumb: false,
            // breadcrumbDocName: false,
        }
    });
    // const wysiwyg = protyleContainer.querySelector('.protyle-wysiwyg') as HTMLElement;
    // wysiwyg.style.padding = "0";

    const consoleContainer = frag.querySelector("#console-container") as HTMLDivElement;
    const fakeConsole = useFakeConsole();
    consoleContainer.appendChild(fakeConsole.ele);

    const consoleProxy = new Proxy(fakeConsole, {
        get: (target, prop: string) => {
            if (['log', 'debug', 'warn', 'error'].includes(prop)) {
                return target[prop];
            }
        }
    });

    const btnRun = frag.querySelector("#run") as HTMLButtonElement;

    const _runJsCode = async () => {
        const block = await getBlockByID(blockId);
        const code = block.content;

        // 将代码包装在 async 立即执行函数中，并添加错误处理
        const wrappedCode = `
            (async () => {
                try {
                    ${code}
                } catch(e) {
                    console.error(e);
                }
            })()
        `;

        const { siyuan, client, api } = plugin.funcViableVars();
        try {
            let func = new Function(
                'console', 'siyuan', 'client', 'api', 'plugin', 'thisBlock', 'args',
                wrappedCode
            );
            let result = await func(consoleProxy, siyuan, client, api, plugin, block, []);
            if (result) {
                consoleProxy.debug(result);
            }
        } catch (e) {
            consoleProxy.error(e);
        }
    }

    btnRun.addEventListener("click", _runJsCode);

    const btnClear = frag.querySelector("#clear-console") as HTMLButtonElement;
    btnClear.addEventListener("click", () => fakeConsole.clear());

    return {
        ele: frag,
        destroy: () => {
            protyle.destroy();
        }
    }
}

const debugJSBlock = (id: BlockId, plugin: RunJsPlugin) => {

    const { ele, destroy } = useDebugDialog(plugin, id);

    const tabId = `debug-dialog-${id}`;
    const tab = plugin.addTab({
        type: tabId,
        init() {
            this.element.appendChild(ele);
        }
    });
    openTab({
        app: plugin.app,
        custom: {
            id: plugin.name + tabId,
            title: `Debug ${id}`,
            icon: "iconGit",
        }
    })
}

export default debugJSBlock;
