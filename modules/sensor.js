'use strict';

//Represents the JSON format of the stored sensor
class WeightSensorJson {
    constructor(sensorId, requestTopic, receiveTopic, unitName, weightPerUnit) {
        this.sensorId = sensorId;
        this.requestTopic = requestTopic;
        this.receiveTopic = receiveTopic;
        this.unitName = unitName;
        this.weightPerUnit = weightPerUnit;
    };
}

//Represents the weight sensor object to interact with the weight sensor
//Should not be instantiated directly, only by WeightSensorManager (client dependency handling)
class _WeightSensor {
    constructor(sensorId, requestTopic, receiveTopic, unitName, weightPerUnit, client) {
        this.sensorId = sensorId;
        this.requestTopic = requestTopic;
        this.receiveTopic = receiveTopic;
        this.unitName = unitName;
        this.weightPerUnit = weightPerUnit;
        this._client = client;
    }

    //For hydration, to be used only by WeightSensorManager
    static _fromJson({sensorId, requestTopic, receiveTopic, unitName, weightPerUnit}, client) {
        return new _WeightSensor(sensorId, requestTopic, receiveTopic, unitName, weightPerUnit, client);
    }

    //Allow for conversion of object into JSON for storing, to be used only by WeightSensorManager
    _toJson() {
        return {
            sensorId: this.sensorId,
            requestTopic: this.requestTopic,
            receiveTopic: this.receiveTopic,
            unitName: this.unitName,
            weightPerUnit: this.weightPerUnit,
        }
    }

    //Payload should include necessary information for remote sensor to construct receiveTopic during response
    async getWeight(payload, timeout = 3000) {
        const sensor = this;
        const executor = (resolve, reject) => {
            const listener = (topic, messageBuffer) => {
                if (topic === sensor.receiveTopic) {
                    sensor._client.removeListener('message', listener);
                    resolve(parseFloat(messageBuffer.toString()));
                }
            };

            sensor._client.subscribe(sensor.receiveTopic, {}, err => {
                    if (err) {
                        reject(sensor.sensorId)
                    } else {
                        sensor._client.on('message', listener);
                        sensor._client.publish(sensor.requestTopic, payload)
                    }
                }
            );
            setTimeout(_ => {
                sensor._client.removeListener('message', listener);
                reject(sensor.sensorId);
            }, timeout)
        };
        return new Promise(executor);
    }
}

//Handles creation of the WeightSensor objects
class WeightSensorFactory {
    constructor(client) {
        this._client = client;
    }

    getSensor(sensorId, requestTopic, receiveTopic, unitName, weightPerUnit) {
        return new _WeightSensor(sensorId, requestTopic, receiveTopic, unitName, weightPerUnit, this._client);
    }

    getSensorFromJson(weightSensorJson) {
        return _WeightSensor._fromJson(weightSensorJson, this._client);
    }
}

module.exports = {
    WeightSensorJson,
    WeightSensorFactory,
};