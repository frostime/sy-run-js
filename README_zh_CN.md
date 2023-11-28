## 基本操作

- 运行代码块
  1. 新建一个 javascript 代码块
  2. 点击「块菜单——>Run JS——>运行代码」
  3. 插件将自动运行代码块中的代码
- 将代码块注册到顶栏按钮

  - 方案1: 点击「块菜单——>Run JS——>添加到顶栏」

    方案1需要设置代码块的名称

  - 方案2:`plugin.saveAction` API

- 将代码块注册为一个可供其他代码块调用的 Callable 模块

- 为代码块添加运行按钮
  见 `plugin.createRunButton` API

- 将一些接口注册到 `globalThis`/`window` 下

  访问 `window.runJs` 可以看到所有插件提供的额外 API (可以视为 open-api 插件的升级版)

  ![](asset/globalThis.png)

## 可用的 API

- `siyuan`: 插件的 `siyuan` module
- `plugin`: 本插件的 `this` 对象
- `thisBlock`: 代码块本身的 block 对象
- `client`: 一个 [@siyuan-community/siyuan-sdk](https://github.com/siyuan-community/siyuan-sdk/tree/main/node) 的 `client` 实例

### plugin api

- `saveAction`

  ```ts
  public saveAction(blockId: BlockId, title?: string, sort?: number)
  ```

  将指定 blockid 的 codeblock 保存, 保存的 action 可以通过顶栏菜单按钮来快速触发

    - blockId: 指定 codeblock 的 id
    - title: 标题, 如果留空，则使用块命名，如果命名为空，使用块 ID
    - sort: 排序

- `removeAction`

  ```ts
  public removeAction(blockId: BlockId)
  ```

  删除 action

- `runCodeBlock`

  ```ts
  public runCodeBlock(id: BlockId)
  ```

- `runJsCode`

  ```ts
  public async runJsCode(code: string)
  ```

- `createRunButton`

  ```ts
  public createRunButton(id: BlockId, title?: string)
  ```

  创建一个能快速运行相应代码块的按钮

  ```js
  plugin.createRunButton(thisBlock.id);
  ```

  ![CreateRunButton](asset/createRunButton.png)


- `call`

  ```ts
  public async call(callableId: string, ...args: any[]): Promise<any>
  ```

  调用注册的方法代码块

  详情见下方

## 样例

```js
console.log(siyuan);
console.log(plugin);
console.log(client);
console.log(thisBlock);
async function main() {
    const response = await client.pushMsg({
      msg: "This is a notification message", timeout: 7000,
    });
    console.log(response);
}
main();
plugin.saveAction(thisBlock.id, "Test Code");
```

## 将代码块注册为可调用的方法

点击代码块菜单，选择 "保存为可调用方法"，可以将对应代码块转换为一个可以被调用的。示例如下：

1. 首先新建一个包含了 return 语句的代码块

```js
function getActiveDoc() {
    let tab = document.querySelector("div.layout__wnd--active ul.layout-tab-bar>li.item--focus");
    let dataId= tab?.getAttribute("data-id");
    if (!dataId) {
        return null;
    }
    const activeTab = document.querySelector(
        `.layout-tab-container.fn__flex-1>div.protyle[data-id="${dataId}"]`
    );
    const eleTitle = activeTab?.querySelector(".protyle-title");
    let docId = eleTitle?.getAttribute("data-node-id");
    return docId;
}
console.log(args);
return getActiveDoc();
```
注意到 `args`, 这个将是调用的时候传入的参数组成的数组.

2. 将代码块命名为 `GetActiveDoc`
3. 保存为可调用的函数
4. 使用 `plugin.call("GetActiveDoc", ...args)` 来调用。 call 返回的对象为一个 Promise, 所以如果需要 await, 必须把它包裹在一个 async 函数当中调用。

```js
const main = async () => {
    let ans = await plugin.call('getActiveDoc', '参数1', '参数2');
    siyuan.showMessage("Current Document:" + ans, 5000);
}
main();
```
运行时 '参数1', '参数2' 将会组成 `args` 数组。


## EventBus

插件拓展了 `eventBus`，增加了外部可以调用的事件

```ts
interface MyEventBusMap extends IEventBusMap {
    'run-code-block': BlockId;
    'run-js-code': string;
}
```

1. `run-code-block`, 输入参数为 BlockID, 运行指定 ID 的 js 代码块
2. `run-js-code`, 输入参数为 js 代码字符串，运行指定的代码

```ts
let bus = window?.runJs.plugin.eventBus;
if (bus) {
    bus.emit("run-code-block", blockID);
    bus.emit("run-js-code", `
      console.log("Hello world");
    `);
}
```

> 但是实际上你也可以直接调用 `plugin.runCodeBlock` 和 `plugin.runJsCode` 函数而不必使用 eventBus.
