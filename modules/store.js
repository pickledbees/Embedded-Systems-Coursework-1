'use strict';

const Directory = require('./Directory');
const {JSONFile} = require('file-class');
const path = require('path');

//Represents storage abstraction of WeightSensorJSON objects
//For simplicity uses the local file system for persistence
class WeightSensorJsonStore {
    constructor(location) {
        this._dir = new Directory(location);
    }

    async store(weightSensorJson) {
        const jsonString = JSON.stringify(weightSensorJson);
        return this._dir.writeFile(weightSensorJson.sensorId + '.json', jsonString)
    }

    async remove(sensorId) {
        return this._dir.unlink(sensorId + '.json')
    }

    async exists(sensorId) {
        return this._dir.exists(sensorId + '.json')
    }

    async retrieve(sensorId) {
        const jsonName = sensorId + '.json';
        if (this._dir.exists(jsonName)) {
            const filePath = path.join(this._dir.location, jsonName);
            return new Promise((resolve, reject) =>
                new JSONFile(filePath).read((err, json) =>
                    err ? reject(sensorId) : resolve(json)))
        } else {
            throw sensorId;
        }
    }

    async retrieveAll() {
        const store = this;
        const paths = await store._dir.readdir(true);
        return Promise.all(paths.map(path =>
            new Promise((resolve, reject) =>
                new JSONFile(path).read((err, json) =>
                    err ? reject(null) : resolve(json)))))
    }
}

module.exports = {
    WeightSensorJsonStore,
};