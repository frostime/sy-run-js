## 操作

1. 新建一个 javascript 代码块
2. 点击「块菜单——>Run JS」
3. 插件将自动运行代码块中的代码

## 可用的 API

- `siyuan`: 插件的 `siyuan` module
- `plugin`: 本插件的 `this` 对象
- `thisBlock`: 代码块本身的 block 对象
- `client`: 一个 [@siyuan-community/siyuan-sdk](https://github.com/siyuan-community/siyuan-sdk/tree/main/node) 的 `client` 实例

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
```
