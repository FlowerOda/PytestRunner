import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    // 注册 CodeLens 提供程序（针对 Python 文件）
    const codelensProvider = new TestCodeLensProvider();
    context.subscriptions.push(
        vscode.languages.registerCodeLensProvider('python', codelensProvider)
    );
    vscode.window.showInformationMessage("恭喜，PytestRunner注册成功啦");

    // 注册运行测试命令
    context.subscriptions.push(
        vscode.commands.registerCommand('pytest-runner.runTest', (args: { testName: string; filePath: string; testClass?: string }) => {
            runPytestTestFunc(args.testName, args.filePath, args.testClass);
        })
    );

    // 注册调试测试命令
    context.subscriptions.push(
        vscode.commands.registerCommand('pytest-runner.debugTest', (args: { testName: string; filePath: string; testClass?: string }) => {
            debugPytestTestFunc(args.testName, args.filePath, args.testClass);
        })
    );

	// 注册运行测试类命令
	context.subscriptions.push(
		vscode.commands.registerCommand('pytest-runner.runTestClass', (args: { className: string; filePath: string }) => {
			runPytestTestClass(args.className, args.filePath);
		})
	);

	 // 注册调试测试类命令
	context.subscriptions.push(
        vscode.commands.registerCommand('pytest-runner.debugTestClass', (args: { className: string; filePath: string }) => {
            debugPytestTestClass(args.className, args.filePath);
        })
    );

    // 在 VSCode 文件管理器中右键某个文件夹，就能看到 查看 Allure 报告 按钮
    let disposable = vscode.commands.registerCommand('extension.viewAllureReport', (uri: vscode.Uri) => {
        if (!uri) {
            vscode.window.showErrorMessage("请选择一个文件夹");
            return;
        }
        const reportPath = uri.fsPath; // 绝对路径
        const terminal = vscode.window.createTerminal("Allure Report");
        terminal.show();
        terminal.sendText(`allure serve "${reportPath}"`);
    });
    context.subscriptions.push(disposable);
}

class TestCodeLensProvider implements vscode.CodeLensProvider {
    provideCodeLenses(document: vscode.TextDocument): vscode.CodeLens[] {
        const codeLenses: vscode.CodeLens[] = [];
        const fileName = document.fileName.split(/[\\/]/).pop() || ''; // 兼容 Windows 和 Unix

        // 仅对以 test_ 开头的文件生效
        if (!fileName.startsWith('test_')) {
            return codeLenses;
        }

        // 遍历文件的每一行，寻找测试函数定义（以 def test_ 开头）
        for (let i = 0; i < document.lineCount; i++) {
            const line = document.lineAt(i);
            const text = line.text.trim();
            if (/^def\s+test_/.test(text)) {
                // 提取测试函数名（例如 def test_addition(...) 提取 test_addition）
                const testName = text.split(' ')[1].split('(')[0];
                const range = new vscode.Range(i, 0, i, text.length);

                // 向上查找所属的测试类（如果有）
                let testClass: string | undefined = undefined;
                for (let j = i - 1; j >= 0; j--) {
                    const prevLine = document.lineAt(j).text;
                    const classMatch = prevLine.match(/^\s*class\s+(\w+)\s*[:\(]/);
                    if (classMatch) {
                        testClass = classMatch[1];
                        break;
                    }
                }

                // 添加 “Run Test” CodeLens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '▶ Run Test',
                    command: 'pytest-runner.runTest',
                    arguments: [{ testName, filePath: document.fileName, testClass }],
                }));

                // 添加 “Debug Test” CodeLens
                codeLenses.push(new vscode.CodeLens(range, {
                    title: '🐞 Debug Test',
                    command: 'pytest-runner.debugTest',
                    arguments: [{ testName, filePath: document.fileName, testClass }],
                }));
            }

			// 针对测试类：匹配形如 "class TestXXX(...):"
			if (/^class\s+Test/.test(text)) {
			const className = text.split(' ')[1].split(/[:\(]/)[0];
			const range = new vscode.Range(i, 0, i, text.length);

			// 添加 “Run Test Class” 按钮
			codeLenses.push(new vscode.CodeLens(range, {
				title: '▶ Run Test Class',
				command: 'pytest-runner.runTestClass',
				arguments: [{ className, filePath: document.fileName }],
			}));

			// 添加 “Debug Test Class” 按钮
			codeLenses.push(new vscode.CodeLens(range, {
				title: '🐞 Debug Test Class',
				command: 'pytest-runner.debugTestClass',
				arguments: [{ className, filePath: document.fileName }],
			}));
            }
        }

        return codeLenses;
    }
}

/**
 * 运行 pytest 测试命令（非调试）
 */
function runPytestTestFunc(testName: string, filePath: string, testClass?: string) {
    const config = vscode.workspace.getConfiguration("pytestRunner");
    const alluredir = config.get<string>("allureDir", "report_v3"); // 读取用户设置，默认 "report_v3"
    const pytestArgs = config.get<string>('pytestArgs', '-v'); // 读取 pytest 参数，默认 '-v'
    const pythonCmd = config.get<string>('pythonCmd', 'python'); // 读取运行时对于python的设定
    let command = `${pythonCmd} -m pytest ${pytestArgs}`;
    if (alluredir.trim()) {
        command += ` --alluredir=${alluredir}`;
    }
    if (testClass) {
        command += ` ${filePath}::${testClass}::${testName}`;
    } else {
        command += ` ${filePath}::${testName}`;
    }

    const terminal = vscode.window.createTerminal("Pytest Runner");
    terminal.show();
    terminal.sendText(command);
}
/**
 * 启动调试测试用例
 */
function debugPytestTestFunc(testName: string, filePath: string, testClass?: string) {
    const config = vscode.workspace.getConfiguration("pytestRunner");
    const allureDir = config.get<string>("allureDir", "report_v3");
	const pytestArgs = config.get<string>('pytestArgs', '-v'); // 读取 pytest 额外参数
    let testTarget = testClass ? `${filePath}::${testClass}::${testName}` : `${filePath}::${testName}`;
    console.log("参数是"+pytestArgs);
    // 按空格拆分成数组（如果参数中有带空格的部分，需要更精细的解析，这里假设简单拆分足够）
    const pytestArgsArray = pytestArgs.split(/\s+/);
    let args = [...pytestArgsArray];
    if (allureDir.trim()) {
        args.push(`--alluredir=${allureDir}`);
    }
    args.push(testTarget);

    const debugConfig: vscode.DebugConfiguration = {
        name: "Debug Pytest Test",
        type: "python",
        request: "launch",
        module: "pytest",
        args: args,
        console: "integratedTerminal",
        justMyCode: false
    };

    vscode.debug.startDebugging(undefined, debugConfig);
}
/**
 * 运行整个测试类
 */
function runPytestTestClass(className: string, filePath: string) {
    const config = vscode.workspace.getConfiguration("pytestRunner");
    const alluredir = config.get<string>("allureDir", "report_v3");
    const pytestArgs = config.get<string>('pytestArgs', '-v');
    // const cwd = '${PWD}';
    // let command = `sudo PYTHONPATH=${cwd} python3.7 -m pytest ${pytestArgs}`;
    const pythonCmd = config.get<string>('pythonCmd', 'python'); // 读取运行时对于python的设定
    let command = `${pythonCmd} -m pytest ${pytestArgs}`;
    if (alluredir.trim()) {
        command += ` --alluredir=${alluredir}`;
    }
    command += ` ${filePath}::${className}`;
    const terminal = vscode.window.createTerminal("Pytest Runner");
    terminal.show();
    terminal.sendText(command);
}

/**
 * 调试整个测试类
 */
function debugPytestTestClass(className: string, filePath: string) {
    const config = vscode.workspace.getConfiguration("pytestRunner");
    const alluredir = config.get<string>("alluredir", "report_v3");
    const pytestArgs = config.get<string>('pytestArgs', '-v');
    let testTarget = `${filePath}::${className}`;
    const pytestArgsArray = pytestArgs.split(/\s+/);
    let args = [...pytestArgsArray];
    if (alluredir.trim()) {
        args.push(`--alluredir=${alluredir}`);
    }
    args.push(testTarget);
    const debugConfig: vscode.DebugConfiguration = {
        name: "Debug Pytest Test Class",
        type: "python",
        request: "launch",
        module: "pytest",
        args: args,
        console: "integratedTerminal",
        justMyCode: false
    };
    vscode.debug.startDebugging(undefined, debugConfig);
}
export function deactivate() {}
