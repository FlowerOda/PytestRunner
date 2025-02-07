

# 开发vscode插件步骤

## 1. 环境准备

### 1.1 安装 Node.js（推荐使用 nvm 管理多版本）

- 下载并安装 nvm for Windows：

  ```
    https://github.com/coreybutler/nvm-windows
  ```

  安装好 nvm 后，在命令行中运行：

  ```bash
  nvm install --lts  # 可安装最新的
  nvm use --lts
  
  nvm install 20.17.0 # 也可以安装指定版本
  nvm use 20.17.0   # 用的Node版本
  ```
  

这样可以安装并切换到最新的 LTS 版本（例如 18.x 或 20.x）。

### 1.2 验证 Node.js 和 npm 版本

在命令行中运行：

```bash
node --version  # 建议版本 >= 16.x
npm --version   # 建议版本 >= 7.x
```

### 1.3 安装全局工具

为了快速生成和打包扩展，需要安装以下全局工具：

- Yeoman（脚手架工具）和 generator-code（生成 VS Code 插件模板）

  ```bash
  npm install -g yo generator-code
  ```

- vsce（VS Code 扩展打包工具）

  ```bash
  npm install -g vsce
  ```
- 安装typescript

  ```bash
  npm install -g typescript
  ```
  检查是否已经安装 TypeScript：
  
  ```bash
  npm list -g --depth=0 | grep typescript
  ```
  
  

------

## 2. 生成 VS Code 插件模板

在命令行中运行以下命令，启动扩展生成向导：

```bash
yo code
```

生成过程中会提示：

- 选择扩展类型（例如：New Extension (TypeScript)）
- 输入扩展名称、标识符、描述、作者等信息
- 自动生成一个包含基本功能的插件项目（包括 `package.json`、`src/extension.ts`、`README.md`、调试配置等）

生成完成后，项目目录结构类似如下：

```csharp
pytest-runner/
├── .vscode/             # 调试配置文件
├── out/                 # 编译后的 JavaScript 文件（TypeScript 项目）
├── src/
│   └── extension.ts     # 插件主要入口文件
├── package.json         # 插件描述和配置
├── README.md            # 插件说明（打包前请修改，不可为空）
└── tsconfig.json        # TypeScript 配置文件
```

------

## 3. 插件开发与调试

### 3.1 编辑代码

- 在 `src/extension.ts` 中添加或修改你的插件功能。
- 修改 package.json 中的相关字段：
  - **publisher**：一定不要留成 `undefined`，需要填写你注册的发布者标识（或者先填写任意非空字符串进行测试）。
  - **engines.vscode**：确保与你本地 VS Code 版本兼容（例如 `"vscode": "^1.80.0"` 或 `"^1.92.0"`）。

### 3.2 在 VS Code 中调试插件

- 打开生成的项目文件夹，然后按 `F5` 启动调试。这会打开一个新的 VS Code 实例（Extension Development Host），加载你的扩展。
- 在开发主窗口中测试你的扩展功能，并根据需要修改代码。

------

## 4. 打包 VS Code 扩展

### 4.1 修改 README.md

- **重要**：在打包前请确保 README.md 文件已编辑，不能是空文件或默认模板内容，否则 vsce 打包时会报错提示 “Make sure to edit the README.md file before you package or publish your extension.”

### 4.2 使用 vsce 打包生成 vsix 文件

在项目根目录下运行：

```bash
vsce package
```

- 执行完成后，会在当前目录生成一个 `.vsix` 文件（例如 pytest-runner-0.0.1.vsix`）。



