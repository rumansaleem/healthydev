const vscode = require('vscode');

const now = () => Number(new Date);
const mins = (mins) => mins * 60 * 1000;
const secs = (secs) => secs * 1000;

const MAX_WORK_TIME = mins(10); // 10mins
const SNOOZE_DURATION = mins(5); // in ms
const BREAK_DURATION = secs(10); // in ms

let ticker;
let startTimestamp;
let nextBreakTimestamp;
let lastBreakStartTimestamp;
let statusBarItem;
let breakPanel;
let timerInterval;

function getFormattedTime(millis) {
	let totalSeconds = Math.floor(millis / 1000);
	let totalMins = Math.floor(totalSeconds / 60);

	let secs = totalSeconds % 60;
	let mins = totalMins % 60;
	let hours = Math.floor(totalMins / 60);

	return `${hours < 10 ? "0" + hours : hours}:${
		mins < 10 ? "0" + mins : mins
	}:${secs < 10 ? "0" + secs : secs}`;
}

function showBreakSuggestionMessage() {
	const POSITIVE = 'Take a Break';
	const SNOOZE = 'Later';
	vscode.window.showInformationMessage(
		'Hey hackerman! you are doing great, take care of yourself, consider taking a short break.',
		POSITIVE,
		SNOOZE
	).then(option => option === POSITIVE  ? takeBreak() : snoozeBreakSuggestion());
}

function takeBreak() {
	vscode.commands.executeCommand('healthy-dev.start-break');
}

function snoozeBreakSuggestion() {
	nextBreakTimestamp = now() + SNOOZE_DURATION;
	startTicker();
}

function updateStatusBarItem(text) {
	statusBarItem.text = text;
	if(text != '') {
		statusBarItem.show();
	}
}

function calculateTime() {
	updateStatusBarItem(getFormattedTime(now() - startTimestamp));

	if (now() > nextBreakTimestamp) {
		showBreakSuggestionMessage();
		stopTicker();
	}
}

function startTicker() {
	ticker = setInterval(calculateTime, 1000);
}

function stopTicker() {
	clearInterval(ticker);
}

function resetTicker() {
	stopTicker();
	nextBreakTimestamp = now() + MAX_WORK_TIME;
	startTicker();
}

function updateBreakWebview() {
	let timeLeft = (BREAK_DURATION - (now() - lastBreakStartTimestamp));
	let message = `Break Over! Back to Work`; 
	
	if( timeLeft > 0) {
		message = `Relax timer : ${getFormattedTime(timeLeft)}`;
	} else {
		clearInterval(timerInterval);
	}

    breakPanel.webview.html = getWebViewHTML(message);
}

function getWebViewHTML(timerMessage){
	return `<! DOCTYPE html>
		<html lang="en">
			<head>
				<meta http-equiv="Content-Security-Policy" content="default-src: 'self';">
				<title>Break Panel</title>
			</head>
			<body style="min-height: 100vh; display:flex; flex-direction: column; align-items:center; justify-content: center;">
				<h1 style="margin-bottom: 10px;">Stop Breaking your bones. Take a break! </h1>
				<h2> ${timerMessage} </h2>
			</body>
		</html>`;
}

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {

	startTimestamp = now();
	statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0); 

	let disposable = vscode.commands.registerCommand('healthy-dev.start-break', () => {
		lastBreakStartTimestamp = now();

		breakPanel = vscode.window.createWebviewPanel(
			'breaker', 
			'Pomo Break', 
			vscode.ViewColumn.One, 
			{}
		);

    	// Set initial content
		updateBreakWebview();
		
		// And schedule updates to the content every second
		timerInterval = setInterval(updateBreakWebview, 1000);

		breakPanel.onDidDispose(() => {
				// When the panel is closed, cancel any future updates to the webview content
				clearInterval(timerInterval);
				resetTicker();
			},
			null,
			context.subscriptions
		);

	});

	nextBreakTimestamp = startTimestamp + MAX_WORK_TIME;

	startTicker();

	context.subscriptions.push(statusBarItem);
	context.subscriptions.push(disposable);
}

exports.activate = activate;

function deactivate() {
	clearInterval(ticker);
}

module.exports = {
	activate,
	deactivate
}
