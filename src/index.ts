/*
 * Copyright (c) 2023 by Yp Z (frostime). All Rights Reserved.
 * @Author       : Yp Z
 * @Date         : 2023-08-14 18:01:15
 * @FilePath     : /src/index.ts
 * @LastEditTime : 2024-10-08 12:44:04
 * @Description  : 
 */
import {
    Plugin,
    showMessage,
    getFrontend,
    openTab,
    Menu,
    EventBus,
    IEventBusMap,
    Protyle,
    IMenuItemOption
} from "siyuan";
import siyuan from "siyuan";
import * as ws from "./ws";
// import "@/index.scss";
// import { changelog } from 'sy-plugin-changelog';


import * as api from "@/api";

import { Client } from "@siyuan-community/siyuan-sdk";
import { SettingUtils } from "./libs/setting-utils";
import { getFileBlob } from "@/api";
import { confirmDialog, html2ele } from "./libs/dialog";

const client = new Client({
    //@ts-ignore
    token: window.siyuan.config.api.token
});


interface MyEventBusMap extends IEventBusMap {
    'run-code-block': string;
    'run-js-code': string;
}
type MyEventBus = EventBus & {
    on<
        K extends keyof MyEventBusMap,
        D = MyEventBusMap[K],
    >(type: K, listener: (event: CustomEvent<D>) => any): void;
}


const SAVED_CODE = "SavedCode.json";
const CALLABLE = "Callable.json";

const ButtonTemplate = {
    template: `
<div>
    <button onclick="{{funcname}}()" class="b3-button b3-button--outline fn__flex-center fn__size200">
        {{text}}
    </button>
</div>
<style>
    .b3-button {
        cursor: pointer;
        color: var(--b3-theme-on-primary);
        border-radius: var(--b3-border-radius);
        line-height: 20px;
        padding: 4px 8px;
        background-color: var(--b3-theme-primary);
        white-space: nowrap;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        transition: box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1);
        border: 0;
        box-sizing: border-box;
        text-align: center;
    }
    .b3-button--outline {
        color: var(--b3-theme-primary);
        box-shadow: inset 0 0 0 .6px var(--b3-theme-primary);
        background-color: rgba(0,0,0,0);
    }
    .fn__size200 {
        width: 200px;
        flex-shrink: 0;
    }
    .fn__flex-center {
        align-self: center;
    }
    .b3-button--outline:hover, .b3-button--outline:focus {
        background-color: var(--b3-theme-primary-lightest);
        box-shadow: inset 0 0 0 1px var(--b3-theme-primary);
        text-decoration: none;
    }
</style>
<script>
    function {{funcname}}()
    {
        console.log('update')
        let plugin = window.siyuan.ws.app.plugins.find(p => p.name === 'sy-run-js');
        console.log(plugin);
        if (plugin)
        {
            plugin.runCodeBlock("{{id}}");
            // plugin?.eventBus?.emit("run-code-block", "{{id}}");
        }
    }
</script>
`,
    new(text: string, id: BlockId) {
        let funcname = `Run_${id.replace(/-/g, "_")}`
        return this.template.replace(/{{text}}/g, text)
            .replace(/{{id}}/g, id)
            .replace(/{{funcname}}/g, funcname);
    }
};

/**
 * Copyright (c) 2023 [Zuoqiu-Yingyi](https://github.com/Zuoqiu-Yingyi/siyuan-packages-monorepo)
 * 判断一个元素是否为思源块元素
 * @param element 元素
 * @returns 是否为思源块元素
 */
export function isSiyuanBlock(element: any): boolean {
    return !!(element
        && element instanceof HTMLElement
        && element.dataset.type
        && element.dataset.nodeId
        && /^\d{14}-[0-9a-z]{7}$/.test(element.dataset.nodeId)
    );
}

/**
 * Copyright (c) 2023 [Zuoqiu-Yingyi](https://github.com/Zuoqiu-Yingyi/siyuan-packages-monorepo)
 * 获取当前光标所在的块
 * @returns 当前光标所在的块的 HTML 元素
 */
export function getFocusedBlock(): HTMLElement | null | undefined {
    const selection = document.getSelection();
    let element = selection?.focusNode;
    while (element // 元素存在
        && (!(element instanceof HTMLElement) // 元素非 HTMLElement
            || !isSiyuanBlock(element) // 元素非思源块元素
        )
    ) {
        element = element.parentElement;
    }
    return element as HTMLElement;
}

export default class RunJsPlugin extends Plugin {

    private settingUtils: SettingUtils;

    private static readonly GLOBAL: Record<string, any> = globalThis;
    private static readonly PROPERTY_NAME: string = "runJs";

    isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    private onAssetBindThis = this.onAssetMenu.bind(this);

    declare data: {
        SAVE_CODE: { [key: string]: IAction[] }
        CALLABLE: { [key: string]: BlockId }
    };
    declare eventBus: MyEventBus;

    BindEvent: { [key: string]: (event: CustomEvent<any>) => any } = {};

    async onload() {

        //Copyright (c) 2023 by Zuoqiu-Yingyi
        //Copy from https://github.com/Zuoqiu-Yingyi/siyuan-plugin-open-api/blob/main/src/index.ts
        RunJsPlugin.GLOBAL[RunJsPlugin.PROPERTY_NAME] = {
            plugin: this,
            siyuan: siyuan,
            client: client,
            api: api
        };

        this.addIcons(`<symbol id="iconJS" viewBox="0 0 1024 1024"><path d="M640 128H576v256h64V128zM832 320h-192v64h192V320zM896 896H128v64h768v-64z" p-id="4062"></path><path d="M640 64H128v128h64V128h421.76L832 346.24V960h64V320l-256-256zM256 384H192v349.44q0 42.24-34.56 42.24h-19.84V832h28.16Q256 832 256 736V384z" p-id="4063"></path><path d="M448 384a131.84 131.84 0 0 0-87.04 28.16 94.72 94.72 0 0 0-33.28 77.44 87.68 87.68 0 0 0 34.56 73.6 208.64 208.64 0 0 0 73.6 31.36 256 256 0 0 1 59.52 21.12 45.44 45.44 0 0 1 26.24 41.6c0 33.28-23.68 49.28-71.04 49.28a71.04 71.04 0 0 1-49.28-14.08 88.96 88.96 0 0 1-21.76-52.48H320a120.96 120.96 0 0 0 132.48 128c87.68 0 131.84-38.4 131.84-115.84A89.6 89.6 0 0 0 549.12 576a225.28 225.28 0 0 0-75.52-33.92 391.68 391.68 0 0 1-60.16-22.4 37.76 37.76 0 0 1-23.68-32 35.84 35.84 0 0 1 16-32.64A69.76 69.76 0 0 1 448 448a70.4 70.4 0 0 1 46.72 12.8 72.32 72.32 0 0 1 21.76 40.32H576A113.28 113.28 0 0 0 448 384zM224 256a32 32 0 1 0 32 32 32 32 0 0 0-32-32z" p-id="4064"></path></symbol>`)
        // console.log(this.i18n.helloPlugin);

        const frontEnd = getFrontend();
        this.isMobile = frontEnd === "mobile" || frontEnd === "browser-mobile";

        const topBarElement = this.addTopBar({
            icon: "iconJS",
            title: "Run JS",
            callback: async () => {
                if (this.isMobile) {
                    this.showTopbarMenu();
                } else {
                    let rect = topBarElement.getBoundingClientRect();
                    // 如果被隐藏，则使用更多按钮
                    if (rect.width === 0) {
                        rect = document.querySelector("#barMore").getBoundingClientRect();
                    }
                    if (rect.width === 0) {
                        rect = document.querySelector("#barPlugins").getBoundingClientRect();
                    }
                    this.showTopbarMenu(rect);
                }
            }
        });

        this.eventBus.on("open-menu-link", this.onAssetBindThis);
        this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
        //@ts-ignore
        this.eventBus.on("run-code-block", ({ detail }) => {
            this.runCodeBlock(detail);
        });
        this.eventBus.on("run-js-code", ({ detail }) => {
            this.runJsCode(detail);
        });

        this.addCommand({
            langKey: "run-js-block",
            hotkey: "⌥F5",
            editorCallback: async () => {
                console.log("run-js-block");
                let ele: HTMLElement = getFocusedBlock();
                let dataId = ele.getAttribute("data-node-id");
                console.log("dataId", dataId);
                this.runCodeBlock(dataId);
            }
        });

        await Promise.all([this.loadData(SAVED_CODE), this.loadData(CALLABLE)]);
        this.data[SAVED_CODE] = this.data[SAVED_CODE] || {};
        this.data[CALLABLE] = this.data[CALLABLE] || {};

        await this.initSetting();

        // changelog(this, 'i18n/CHANGELOG.md').then((result) => {
        //     let dialog = result.Dialog;
        //     if (dialog) {
        //         // dialog?.setSize({width: '50em', height: '35em'})
        //         dialog?.setSize({width: '30em', height: '20em'})
        //         dialog?.setFont('1.2rem');
        //     }
        // });
    }

    private async initSetting() {
        // let timer: ReturnType<typeof setInterval> = null;
        // const closeTimer = () => {
        //     if (timer) {
        //         clearInterval(timer);
        //         timer = null;
        //     }
        // }

        this.settingUtils = new SettingUtils({
            plugin: this,
            height: '30rem',
            confirmCallback: (data: { enableWs: boolean }) => {
                // console.log("enableWs", value);
                let value = data.enableWs;
                if (value) {
                    ws.startWebsocket(this, client);
                } else {
                    if (ws.isConnected()) {
                        ws.closeWebsocket();
                    }
                }
            }
        });
        this.settingUtils.addItem({
            type: 'checkbox',
            title: 'Start Websocket Broadcast',
            description: 'You can use SiYuan\'s postMessage API to send js code, this plugin will execute it.',
            key: 'enableWs',
            value: false
        });
        this.settingUtils.addItem({
            type: 'hint',
            title: 'Broadcast',
            description: '',
            direction: 'row',
            omit: true,
            key: 'wsUrl',
            value: null,
            createElement: () => {
                let ele = document.createElement("span");
                ele.className = 'b3-label';
                ele.style.flex = '1';
                ele.style.padding = '0px';
                let urls = ws.wsUrl();
                ele.innerHTML = `<div>API: ${urls.api}</div><div>Token: ${window.siyuan.config.api.token}</div>`
                return ele;
            }
        });
        // this.settingUtils.addItem({
        //     type: 'custom',
        //     title: 'Websocket 连接状态',
        //     description: '当前 Websocket 连接状态',
        //     key: 'wsStatus',
        //     value: null,
        //     omit: true,
        //     setEleVal: () => {},
        //     getEleVal: () => null,
        //     createElement: () => {
        //         let ele = document.createElement("span");
        //         ele.className = 'b3-label';
        //         ele.style.flex = '0';
        //         ele.style.padding = '0px';
        //         const updateStatus = () => {
        //             let status = ws.isConnected();
        //             ele.innerText = status? "🟢" : "🔴";
        //             console.debug('Update WS Status', status);
        //         }
        //         timer = setInterval(updateStatus, 1000);
        //         updateStatus();
        //         return ele;
        //     }
        // });

        let data = await this.settingUtils.load();
        if (data?.enableWs === true) {
            ws.startWebsocket(this, client);
        }
    }

    onunload() {
        for (let event in this.BindEvent) {
            //@ts-ignore
            this.eventBus.off(event, this.BindEvent[event]);
        }
        // this.saveData(SAVED_CODE, this.data[SAVED_CODE]);
        ws.closeWebsocket();
    }

    funcViableVars() {
        return {
            siyuan,
            client,
            api,
            plugin: this,
        }
    }

    public async call(callableId: string, ...args: any[]): Promise<any> {
        console.log("call", callableId, args);
        let blockId = this.data[CALLABLE]?.[callableId];
        if (!blockId) {
            console.error("Callable Not Found", callableId);
            showMessage(`Callable Not Found: ${callableId}`);
            return;
        }
        let block = await api.getBlockByID(blockId);
        if (!block) {
            console.error("Code Block ", blockId, " Not Found");
            showMessage(`Code Block Not Found`);
            console.groupEnd();
            return;
        }
        if (block.type !== "c") {
            console.error("Block ", blockId, " is not Code Block");
            showMessage(`Block is not Code Block`);
            console.groupEnd();
            return;
        }
        let code = block.content;
        let func = new Function(
            'siyuan', 'client', 'api', 'plugin', 'thisBlock', 'args',
            code
        );
        return func(siyuan, client, api, this, block, args);
    }

    public async saveAction(blockId: BlockId, title?: string, sort?: number) {
        if (blockId in this.data[SAVED_CODE]) {
            return;
        }
        let block = await api.getBlockByID(blockId);
        console.log("Save Code Block:", block);
        if (block.type !== "c") {
            return;
        }

        if (title === undefined) {
            let attrs = await api.getBlockAttrs(blockId);
            title = attrs?.name ?? blockId;
        }
        sort = sort || 0;

        this.data[SAVED_CODE][blockId] = {
            id: blockId,
            title: title,
            sort: sort
        };
        showMessage(`Save Code Block Success "${title}"`);
        this.saveData(SAVED_CODE, this.data[SAVED_CODE]);
    }

    public removeAction(blockId: BlockId) {
        if (!(blockId in this.data[SAVED_CODE])) {
            return;
        }
        delete this.data[SAVED_CODE][blockId];
        showMessage(`Remove Code Block Success`);
        this.saveData(SAVED_CODE, this.data[SAVED_CODE]);
    }

    public onEvent(event: any, func: (event: CustomEvent<any>) => any) {
        if (this.BindEvent[event] === undefined) {
            this.BindEvent[event] = func;
            this.eventBus.on(event, func);
        } else {
            this.eventBus.off(event, this.BindEvent[event]);
            this.BindEvent[event] = func;
            this.eventBus.on(event, func);
        }
    }

    public offEvent(event: any) {
        if (this.BindEvent[event] !== undefined) {
            this.eventBus.off(event, this.BindEvent[event]);
            this.BindEvent[event] = undefined;
        }
    }

    public addProtyleSlash(slash: {
        filter: string[],
        html: string,
        id: string,
        callback(protyle: Protyle): void,
    }) {
        let found = this.protyleSlash.find(s => s.id === slash.id);
        if (found) {
            return;
        }
        this.protyleSlash.push(slash);
    }

    public removeProtyleSlash(id: string) {
        this.protyleSlash = this.protyleSlash.filter(s => s.id !== id);
    }

    public async createRunButton(id: BlockId, title?: string) {
        title = title || "Run";
        let html = ButtonTemplate.new(title, id);
        api.insertBlock("markdown", html, id);
    }

    public async runCodeBlock(id: BlockId) {
        let block = await api.getBlockByID(id);
        console.group(`Run Javascript Code Block ${block.id}`);
        if (!block) {
            console.error("Code Block ", id, " Not Found");
            showMessage(`Code Block Not Found`);
            console.groupEnd();
            return;
        }
        if (block.type !== "c") {
            console.error("Block ", id, " is not Code Block");
            showMessage(`Block is not Code Block`);
            console.groupEnd();
            return;
        }
        let code = block.content;
        console.debug(code);
        this.runJsCode(code, block);
        console.groupEnd();
    }

    /**
     * 运行指定的代码
     * @param code string, 代码字符串
     */
    public async runJsCode(code: string, codeBlock?: Block) {
        let func = new Function(
            'siyuan', 'client', 'api', 'plugin', 'thisBlock', 'args',
            code
        );
        return func(siyuan, client, api, this, codeBlock, []);
    }

    public runJsCodeAsync = this.runJsCode;

    public runJsCodeSync(code: string, codeBlock?: Block) {
        let func = new Function(
            'siyuan', 'client', 'api', 'plugin', 'thisBlock', 'args',
            code
        );
        return func(siyuan, client, api, this, codeBlock, []);
    }

    /******************** Private ********************/

    private async onAssetMenu({ detail }) {
        let menu = detail.menu;
        // let protyle = detail.protyle;
        const hrefSpan = detail.element;

        let dataHref = hrefSpan.getAttribute("data-href");
        if (!dataHref?.startsWith("assets/")) {
            return;
        }
        if (!dataHref.toLowerCase().endsWith(".js")) {
            return;
        }

        menu.addItem({
            icon: "iconUrl",
            label: this.i18n.index_ts.runjsscript,
            click: async () => {
                const blob = await getFileBlob(`/data/${dataHref}`);
                if (!blob) {
                    showMessage(this.i18n.index_ts.getjsscriptfail);
                    return;
                }
                const jsText = await blob.text();
                const ele = html2ele(`<div style="display: flex; flex-direction: column; gap: 1rem; height: 100%;">
                    <div>${this.i18n.index_ts.confirmexecjs}</div>
                    <textarea style="width: 100%; flex: 1; resize: none;" readonly>${jsText}</textarea>
                    </div>`);
                confirmDialog({
                    title: this.i18n.index_ts.confirmexec,
                    content: ele,
                    confirm: () => {
                        this.runJsCode(jsText);
                    },
                    height: "30rem",
                    width: "30rem",
                });
            }
        });
    }

    private async blockIconEvent({ detail }: any) {
        if (detail.blockElements.length > 1) {
            return;
        }
        let ele: HTMLDivElement = detail.blockElements[0];
        let type = ele.getAttribute("data-type");
        if (type !== "NodeCodeBlock") {
            return;
        }
        let span = ele.querySelector(
            "span.protyle-action__language"
        ) as HTMLSpanElement;
        if (!span) {
            return;
        } else {
            let text = span.innerText.toLocaleLowerCase();
            if (text !== "js" && text !== "javascript") {
                return;
            }
        }

        let id = ele.getAttribute("data-node-id");
        let menu: Menu = detail.menu;
        let submenus: IMenuItemOption[] = [
            {
                icon: 'iconPlay',
                label: this.i18n.runit,
                click: async () => {
                    this.runCodeBlock(id);
                }
            },
            {
                icon: 'iconFiles',
                label: this.i18n.saveit,
                click: async () => {
                    let name = ele.getAttribute("name");
                    if (name === undefined || name === null || name === "") {
                        showMessage(`Please name the block first`);
                        return;
                    }
                    this.saveAction(id, name);
                }
            },
            {
                icon: 'iconBug',
                label: this.i18n.saveascallable,
                click: async () => {
                    let name = ele.getAttribute("name");
                    if (name === undefined || name === null || name === "") {
                        showMessage(`Please name the block first`);
                        return;
                    }
                    if (this.data[CALLABLE]?.[name] !== undefined) {
                        showMessage(`Callable has been defined: ${name}`);
                        return;
                    }
                    this.data[CALLABLE][name] = id;
                    showMessage(`Callable saved: ${name}`);
                    this.saveData(CALLABLE, this.data[CALLABLE]);
                }
            },
            {
                icon: 'iconSelectText',
                label: this.i18n.savebutton,
                click: async () => {
                    let name = ele.getAttribute("name");
                    this.createRunButton(id, name);
                }
            }
        ];
        menu.addItem({
            icon: 'iconJS',
            label: "Run JS",
            type: "submenu",
            submenu: submenus
        });
    }

    private showTopbarMenu(rect?: DOMRect) {
        const menu = new Menu("savedJsAction");
        let items: IAction[] = Object.values(this.data[SAVED_CODE]);
        items = items.sort((a, b) => {
            return a.sort - b.sort;
        });
        for (let item of items) {
            let ele: HTMLElement = menu.addItem({
                icon: "iconJS",
                label: item.title,
                action: "iconFocus",
                click: () => {
                    this.runCodeBlock(item.id);
                }
            });
            let svg = ele.querySelector(".b3-menu__action") as HTMLElement;
            svg.classList.add("action-focus");
            svg.setAttribute("title", "Focus to block");
            svg.onclick = (e) => {
                e.stopPropagation();
                openTab({
                    app: this.app,
                    doc: {
                        id: item.id,
                    }
                });
            }

            let rmsvg = `<svg class="b3-menu__action action-remove"><use xlink:href="#iconClose"></use></svg>`;
            ele.insertAdjacentHTML("beforeend", rmsvg);
            let rm = ele.querySelector(".action-remove") as HTMLElement;
            rm.setAttribute("title", "Remove");
            rm.onclick = (e) => {
                e.stopPropagation();
                this.removeAction(item.id);
            }
        }
        menu.addSeparator();
        let callSubmenu: IMenuItemOption[] = [];
        for (let [name, id] of Object.entries(this.data[CALLABLE])) {
            let ele = document.createElement("button");
            ele.className = "b3-menu__item";
            ele.setAttribute("data-block-id", id as string);
            ele.innerHTML = `<span class="b3-menu__label">${name}</span><svg class="b3-menu__action action-remove" title="Remove"><use xlink:href="#iconClose"></use></svg>`;
            ele.onclick = () => {
                openTab({
                    app: this.app,
                    doc: {
                        //@ts-ignore
                        id: id,
                        zoomIn: false
                    }
                });
            }
            let rm = ele.querySelector(".action-remove") as HTMLElement;
            rm.setAttribute("title", "Remove");
            rm.onclick = (e) => {
                e.stopPropagation();
                // this.data[CALLABLE][name] = undefined;
                delete this.data[CALLABLE][name];
                this.saveData(CALLABLE, this.data[CALLABLE]);
                showMessage(`Remove Callable Success`);
            }
            callSubmenu.push({
                element: ele
            });
        }

        menu.addItem({
            icon: 'iconLayoutBottom',
            label: "Callable",
            type: "submenu",
            submenu: callSubmenu
        });

        menu.addItem({
            icon: 'iconLayoutBottom',
            label: "Document",
            type: "submenu",
            submenu: [
                {
                    label: "SiYuan Petal",
                    click: () => {
                        window.open("https://github.com/siyuan-note/petal/blob/main/siyuan.d.ts");
                    }
                },
                {
                    label: "SiYuan SDK",
                    click: () => {
                        window.open("https://docs.siyuan-note.club/zh-Hans/reference/community/siyuan-sdk/");
                    }
                }
            ]
        });

        if (this.isMobile) {
            menu.fullscreen();
        } else {
            menu.open({
                x: rect.right,
                y: rect.bottom,
                isLeft: true,
            });
        }
    }
}
