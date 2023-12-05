
## Basic Operations

- Run code block

  1. Create a new JavaScript code block
  2. Click "Block Menu -> Run JS -> Run it"
  3. The plugin will automatically run the code in the code block

- `Alt+F5` hotkey run js block

- Register code block to the top bar button

  - Way 1: Click "Block Menu -> Run JS -> Save to topbar"

    You should set the name of the code block first

  - Way 2: use `plugin.saveAction` API

- Register code block as a callable module by other code blocks

- Add run button to code block
  See `plugin.createRunButton` API

- Register some api interfaces under `globalThis`/`window`

  You can visit `window.runJs` to use them (like open-api plugin)

  ![](asset/globalThis.png)


## Available APIs

- `siyuan`: The `siyuan` module of the plugin
- `plugin`: The `this` object of this plugin
- `thisBlock`: The block object of the code block itself
- `client`: A `client` instance from [@siyuan-community/siyuan-sdk](https://github.com/siyuan-community/siyuan-sdk/tree/main/node)

### plugin APIs

- `saveAction`

  ```ts
  public saveAction(blockId: BlockId, title?: string, sort?: number)
  ```

  Save the code block with the specified block ID. The saved action can be triggered quickly through the top bar menu button.

    - blockId: The ID of the code block to be saved
    - title: Title. If left empty, use the block name. If the name is empty, use the block ID
    - sort: Sorting

- `removeAction`

  ```ts
  removeAction(blockId: BlockId)
  ```

  public Remove action

- `runCodeBlock`

  ```ts
  public runCodeBlock(id: BlockId)
  ```

- `runJsCode`

  ```ts
  public async runJsCode(code: string)
  ```

- `runJsCodeAsync`

  Alis to `runJsCode``

- `runJsCodeSync`

  ```ts
  public runJsCodeSync(code: string)
  ```

  Run code in sync mode


- `createRunButton`

  ```ts
  public createRunButton(id: BlockId, title?: string)
  ```

  Create a button, uppon the given code block, to quickly run the code block.

  ```js
  plugin.createRunButton(thisBlock.id);
  ```

  ![CreateRunButton](asset/createRunButton.png)

- `call`

  ```ts
  public async call(callableId: string, ...args: any[]): Promise<any>
  ```

  Call the registered callable function

  See details bellow

## Example

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

## Registering Code Blocks as Callable Methods

Click on the code block menu and select "Save as Callable" to convert the corresponding code block into a callable function. Here's an example:

1. First, create a code block that contains a return statement:

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

Note the `args` variable, which will be an array of arguments passed in when the function is called.

2. Name the code block `GetActiveDoc`.
3. Save it as a callable function.
4. Use `plugin.call("GetActiveDoc", ...args)` to call the function. The `call` method returns a Promise, so if you need to `await` it, you must call it within an `async` function.

```js
const main = async () => {
    let ans = await plugin.call('getActiveDoc', 'parameter1', 'parameter2');
    siyuan.showMessage("Current Document:" + ans, 5000);
}
main();
```

At runtime, `'parameter1'` and `'parameter2'` will be combined into the `args` array.

## EventBus

The plugin extends `eventBus` to add events that can be called externally.

```ts
interface MyEventBusMap extends IEventBusMap {
    'run-code-block': BlockId;
    'run-js-code': string;
}
```

1. `run-code-block`, input parameter is BlockID, run the js code block with specified ID.
2. `run-js-code`, input parameter is a js code string, run the specified code.

```ts
let bus = window?.runJs.plugin.eventBus;
if (bus) {
    bus.emit("run-code-block", blockID);
    bus.emit("run-js-code", `
      console.log("Hello world");
    `);
}
```

> But you can actually call the `plugin.runCodeBlock` and `plugin.runJsCode` functions directly without using eventBus.
