import {
    Plugin,
    showMessage
} from "siyuan";
import "@/index.scss";

import * as api from "@/api";

export default class PluginSample extends Plugin {

    private blockIconEventBindThis = this.blockIconEvent.bind(this);

    async onload() {
        console.log(this.i18n.helloPlugin);
        this.eventBus.on("click-blockicon", this.blockIconEventBindThis);
    }

    onunload() {
        console.log(this.i18n.byePlugin);
        showMessage("Goodbye SiYuan Plugin");
        console.log("onunload");
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
        let block  = await api.getBlockByID(id);
        let code = block.content;

        detail.menu.addItem({
            label: "运行代码",
            click: () => {
                this.runCode(code);
            }
        });
    }

    private runCode(code: string) {
        console.log(code);
    }

}
