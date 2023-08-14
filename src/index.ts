/*
 * Copyright (c) 2023 by Yp Z (frostime). All Rights Reserved.
 * @Author       : Yp Z
 * @Date         : 2023-08-14 18:01:15
 * @FilePath     : /src/index.ts
 * @LastEditTime : 2023-08-14 21:41:17
 * @Description  : 
 */
import {
    Plugin,
    showMessage,
    getFrontend,
    openTab,
    Menu
} from "siyuan";
import siyuan from "siyuan";
import "@/index.scss";

import * as api from "@/api";

import { Client } from "@siyuan-community/siyuan-sdk";

const client = new Client({
    //@ts-ignore
    token: window.siyuan.config.api.token
});


const SAVED_CODE = "SavedCode.json";

export default class PluginSample extends Plugin {

    isMobile: boolean;
    private blockIconEventBindThis = this.blockIconEvent.bind(this);
    declare data: {
        SAVE_CODE: {[key: string]: IAction[]}
    };

    async onload() {
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

        this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
        //@ts-ignore
        this.eventBus.on("run-code-block", ({blockID}: CustomEvent) => {
            this.runCodeBlock(blockID);
        });

        this.loadData(SAVED_CODE);
        this.data[SAVED_CODE] = this.data[SAVED_CODE] || {};
    }

    onunload() {
        this.saveData(SAVED_CODE, this.data[SAVED_CODE]);
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
        } else if (span.innerText !== "js" && span.innerText !== "javascript") {
            return;
        }

        let id = ele.getAttribute("data-node-id");
        let menu: Menu = detail.menu;
        menu.addItem({
            icon: 'iconJS',
            label: "Run JS",
            click: async () => {
                this.runCodeBlock(id);
            }
        });
    }

    public async runCodeBlock(id: BlockId) {
        let block = await api.getBlockByID(id);
        console.group("Run Javascript Code Block");
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
        console.log('Code Block:', block.id);
        console.log(code);
        let func = new Function(
            'siyuan', 'client', 'api', 'plugin', 'thisBlock',
            code
        );
        func(siyuan, client, api, this, block);
        console.groupEnd();
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
