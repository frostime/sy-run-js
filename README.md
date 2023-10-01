
## Basic Operations

- Run code block
  1. Create a new JavaScript code block
  2. Click "Block Menu -> Run JS -> Run it"
  3. The plugin will automatically run the code in the code block
- Register code block to the top bar button

  - Way 1: Click "Block Menu -> Run JS -> Save to topbar"

    You should set the name of the code block first

  - Way 2: use `plugin.saveAction` API
- Add run button to code block
  See `plugin.createRunButton` API

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

- `createRunButton`

  ```ts
  public createRunButton(id: BlockId, title?: string)
  ```

  Create a button, uppon the given code block, to quickly run the code block.

  ```js
  plugin.createRunButton(thisBlock.id);
  ```

  ![CreateRunButton](asset/createRunButton.png)

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

## Developer

Expose a custom event to global.

```ts
let bus = window.siyuan.ws.app.plugins.find(p => p.name === 'sy-run-js')?.eventBus;
if (bus) {
  bus.emit("run-code-block", blockID);
}
```
