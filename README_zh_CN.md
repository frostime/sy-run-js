## 基本操作

- 运行代码块
  1. 新建一个 javascript 代码块
  2. 点击「块菜单——>Run JS——>运行代码」
  3. 插件将自动运行代码块中的代码
- 将代码块注册到顶栏按钮

  - 方案1: 点击「块菜单——>Run JS——>添加到顶栏」

    方案1需要设置代码块的名称

  - 方案2:`plugin.saveAction` API

- 为代码块添加运行按钮
  见 `plugin.createRunButton` API

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

- `createRunButton`

  ```ts
  public createRunButton(id: BlockId, title?: string)
  ```

  创建一个能快速运行相应代码块的按钮

  ```js
  plugin.createRunButton(thisBlock.id);
  ```

  ![CreateRunButton](asset/createRunButton.png)

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

## 开发者

插件对外暴露 `eventBus` 类型 `run-code-block`, 输入参数为 BlockID.

```ts
let bus = window.siyuan.ws.app.plugins.find(p => p.name === 'sy-run-js')?.eventBus;
if (bus) {
  bus.emit("run-code-block", blockID);
}
```
