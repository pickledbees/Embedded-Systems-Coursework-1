'use strict';

const { ipcRenderer } = require('electron');

const ELEMENT_ID_SENSOR_CARDS_CONTAINER = 'sensor_cards_container';
const ELEMENT_ID_ADD_SENSOR_FORM = "add_sensor_form";

//Main renderer for card tiles on the UI screen
class SensorCardManager {
    constructor(containerElementId) {
        this._element = document.getElementById(containerElementId);
        this._cards = new Map();
    }

    createSensorCard(sensorId, itemName, weightPerUnit, units) {
        return new SensorCard(sensorId, itemName, weightPerUnit, units, this);
    }

    addSensorCard(newCard) {
        this._cards.set(newCard.sensorId, newCard);
        this.renderCards();
    }

    getSensorCard(sensorId) {
        return this._cards.get(sensorId);
    }

    getSensorCards() {
        return this._cards;
    }

    deleteSensorCard(sensorId) {
        this._cards.delete(sensorId);
        this.renderCards();
    }

    renderCards() {
        const container = this._element;
        container.innerHTML = '';
        this._cards.forEach(sensorCard => {
            container.appendChild(sensorCard.getDiv());
        });
    }
}

//Dont call the constructor directly, use sensorCardManager to obtain instance
class SensorCard {
    constructor(sensorId, itemName, weightPerUnit, units, manager) {
        this.sensorId = sensorId;
        this.itemName = itemName;
        this.weightPerUnit = weightPerUnit;
        this.units = units;
        this._manager = manager;
        this._element = document.createElement('div');
    }

    getDiv(className) {
        const that = this;
        const div = this._element;
        div.innerHTML = `
            <h3 class="${className}__item_name">${this.itemName}</h3>
            <p class="${className}__unit_weight">Unit Weight: ${this.weightPerUnit}</p>
            <p class="${className}__units">Units: ${this.units}</p>
            <p class="${className}__sensor_id">Sensor ID: ${this.sensorId}</p>
        
        `;
        div.classList.add('card');
        const deleteButton = document.createElement('button');
        deleteButton.innerText = 'Delete';
        deleteButton.addEventListener('click', _ => deleteSensor(this.sensorId));
        const refreshButton = document.createElement('button');
        refreshButton.innerText = 'Refresh';
        refreshButton.addEventListener('click', _ => refreshReading(this.sensorId));
        div.appendChild(deleteButton);
        div.appendChild(refreshButton);
        return div;
    }
}

const sensorCardManager = new SensorCardManager(ELEMENT_ID_SENSOR_CARDS_CONTAINER);

const addSensorForm = document.getElementById(ELEMENT_ID_ADD_SENSOR_FORM);
addSensorForm.querySelector("#set_sensor_button").addEventListener('click', addSensor);

ipcRenderer.on('get-all-sensors-reply', (event, sensors) => {
    sensors.forEach(sensor => {
        const {sensorId, itemName, weightPerUnit} = sensor;
        const sensorCard = sensorCardManager.createSensorCard(
            sensorId,
            itemName,
            weightPerUnit,
            'Fetching...'
        );
        sensorCardManager.addSensorCard(sensorCard);
        ipcRenderer.send('get-weight', sensorId);
    });
});

ipcRenderer.on('add-sensor-reply', (event, arg) => {
    const {sensorId, itemName, weightPerUnit} = arg.data;
    if (arg.stored) {
        const sensorCard = sensorCardManager.createSensorCard(
            sensorId,
            itemName,
            weightPerUnit,
            'Fetching...'
        );
        sensorCardManager.addSensorCard(sensorCard);
        ipcRenderer.send('get-weight', sensorId);
    } else {
        console.log('could not add card for sensor', arg.data.sensorId);
    }
});

ipcRenderer.on('delete-sensor-reply', (event, arg) => {
    if (arg.success) {
        sensorCardManager.deleteSensorCard(arg.sensorId);
    } else {
        //TODO: fix stub
        console.log('could not delete');
    }
})

ipcRenderer.on('get-weight-reply', (event, arg) => {
    const card = sensorCardManager.getSensorCard(arg.sensorId);
    card.units = arg.units;
    sensorCardManager.addSensorCard(card);
});

function addSensor() {
    const sensorIdInputField = addSensorForm.querySelector("#sensor_id_input");
    const itemNameInputField = addSensorForm.querySelector("#item_name_input");
    const weightPerUnitInputField = addSensorForm.querySelector("#weight_per_unit_input");
    if (
        sensorIdInputField.value !== ""
        && itemNameInputField.value !== ""
        && weightPerUnitInputField.value >= 0
    ) {
        ipcRenderer.send('add-sensor', {
            sensorId: sensorIdInputField.value,
            itemName: itemNameInputField.value,
            weightPerUnit: weightPerUnitInputField.value,
        })
    } else {
        alert("Sensor ID and Item Name cannot be empty and Per Unit Weight must be >= 0!")
    }
}

function deleteSensor(sensorId) {
    sensorCardManager.deleteSensorCard(sensorId);
    ipcRenderer.send('delete-sensor', sensorId);
}

function refreshReading(sensorId) {
    const card = sensorCardManager.getSensorCard(sensorId);
    card.units = 'Fetching...';
    sensorCardManager.addSensorCard(card);
    ipcRenderer.send('get-weight', sensorId);
}

ipcRenderer.send('get-all-sensors', 'GIMME');


