//imports
const path = require('path');
const mqtt = require('mqtt');
const electron = require('electron');
const { app, BrowserWindow, ipcMain } = electron;
const {WeightSensorJson, WeightSensorFactory} = require('./modules/sensor');
const {WeightSensorJsonStore} = require('./modules/store');

//constants
const URL = 'mqtt://test.mosquitto.org';
const PORT = 1883;
const SERVER_ID = 'SERVE001';
const TOPIC_ROOT = 'IC.embedded/P/F';
const PATH_WEIGHT_SENSOR_STORE = path.join(__dirname, 'weight_sensors');
const PATH_MAIN_WINDOW_HTML = path.join(__dirname, 'ui', 'main_window.html');

//MQTT
const client  = mqtt.connect(URL, {port: PORT});

client.on('connect', onConnectCallback);

async function onConnectCallback() {
	console.log('Client connected to', URL, 'on port', PORT);
	try {
		await main();
	} catch (e) {
		console.log(e);
	}
}

//TODO:------------------------------------------------------------------------------------------------------------------------

async function main() {
	//init sensor store
	const weightSensorStore = new WeightSensorJsonStore(PATH_WEIGHT_SENSOR_STORE);
	const weightSensorFactory = new WeightSensorFactory(client);
	const weightSensors = {};
	try {
		const weightSensorJsons = await weightSensorStore.retrieveAll();
		weightSensorJsons.forEach(sensorJson => {
			weightSensors[sensorJson.sensorId] = weightSensorFactory.getSensorFromJson(sensorJson);
		});
	} catch {
		console.log('failed to start application due to file fault');
		process.exit(1);
	}

	ipcMain.on('get-all-sensors', (event, arg) => {
		console.log('rendering sensors');
		event.reply('get-all-sensors-reply', Object.entries(weightSensors).map(([index, sensor]) => {
			return {
				sensorId: sensor.sensorId,
				itemName: sensor.unitName,
				weightPerUnit: sensor.weightPerUnit,
			}
		}))
	});

	ipcMain.on('add-sensor', async (event, arg) => {
		const newSensorJson = new WeightSensorJson(
			arg.sensorId,
			TOPIC_ROOT + '/' + arg.sensorId + '/getWeight',
			TOPIC_ROOT + '/' + arg.sensorId + '/' + SERVER_ID + '/giveWeight',
			arg.itemName,
			arg.weightPerUnit,
		);
		try {
			await weightSensorStore.store(newSensorJson);
			weightSensors[arg.sensorId] = weightSensorFactory.getSensorFromJson(newSensorJson);
			event.reply('add-sensor-reply', { stored: true, data: arg});
		} catch (e) {
			event.reply('add-sensor-reply', { stored: false, data: arg});
		}
	});

	ipcMain.on('delete-sensor', async (event, sensorId) => {
		try {
			await weightSensorStore.remove(sensorId);
			delete weightSensors[sensorId];
			event.reply('delete-sensor-reply', {
				success: true,
				sensorId
			})
		} catch (e) {
			console.log(e);
			event.reply('delete-sensor-reply', {
				success: false,
				sensorId
			})
		}
	})

	ipcMain.on('get-weight', async (event, sensorId) => {
		const sensor = weightSensors[sensorId];
		try {
			const weight = await sensor.getWeight(SERVER_ID, 10000);
			const units =  weight / sensor.weightPerUnit;
			event.reply('get-weight-reply', {
				success: true,
				sensorId,
				units: Math.round(units >= 0 ? units : 0),
			});
		} catch (sensorId) {
			console.log('failed to get weight');
			event.reply('get-weight-reply', {
				success: false,
				sensorId,
				units: 'Unknown - Could not fetch'
			})
		}

	});

	app.whenReady().then(createWindow);

	//MAC OS FIXES
	// Quit when all windows are closed.
	app.on('window-all-closed', () => {
		// On macOS it is common for applications and their menu bar
		// to stay active until the user quits explicitly with Cmd + Q
		if (process.platform !== 'darwin') {
			app.quit()
		}
	});

	app.on('activate', () => {
		// On macOS it's common to re-create a window in the app when the
		// dock icon is clicked and there are no other windows open.
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow()
		}
	});
}

function createWindow () {
	// Create the browser window.
	let win = new BrowserWindow({
		width: 610,
		height: 800,
		webPreferences: {
			nodeIntegration: true
		},
		resizable: false
	});

	win.loadFile(PATH_MAIN_WINDOW_HTML);

	//win.webContents.openDevTools();
}