'use strict';
const unirest = require('unirest');
const fs = require('fs');
const { stringify } = require('wkt');
const moment = require('moment-timezone');

let base_url = "http://localhost:3000/";
let url = "http://localhost:3000/cameras";
let response_template = JSON.parse(fs.readFileSync('./templates/response.jsonld'));
let response_template_cameras = JSON.parse(fs.readFileSync('./templates/response_cameras.jsonld'));
let items_template = JSON.parse(fs.readFileSync('./templates/items.jsonld'));
let observation_template = JSON.parse(fs.readFileSync('./templates/observation.jsonld'));

let sensors_list = [];
let segments_map = {}; // k:segment_id, v:segment_geometry
var last_update_time;
const refresh_time = 1000 * 60; // 1000 milisec * 60 sec * x min
const page_size = 50;

module.exports = {
    get_all_cameras,
    get_all_cameras_paginated,
    get_all_observations_daily_paginated
};

async function get_all_cameras() {
    if (sensors_list.length == 0 || last_update_time < (Date.now() - refresh_time)) {
        //console.log("needs an update")
        sensors_list = await update_values();
        last_update_time = Date.now();
    }
    else {
        //console.log("no update needed")
    }

    return sensors_list;
}

async function get_all_cameras_paginated(req) {
    let sensors_list = await get_all_cameras();
    let url = base_url + "cameras";
    let response_object = response_template;
    let items_object = items_template;
    return paginate_result(sensors_list, req, response_object, items_object, url);
}

async function update_values() {
    /* refresh list of segments*/
    let segments_request = await unirest('GET', 'https://telraam-api.net/v0/segments/active');
    let segments_json = JSON.parse(segments_request.raw_body);
    segments_map = {};
    segments_json.features.map(segment => {
        segments_map[segment.properties.id] = stringify(segment.geometry);
    });

    /* refresh list of sensors*/
    let sensor_list = [];
    let val = await unirest('GET', 'https://telraam-api.net/v0/cameras');
    let cameras_json = JSON.parse(val.raw_body);
    cameras_json.cameras.map(camera => {
        let sensor = {};
        sensor.id = url + "#" + camera.mac;
        sensor["dct:created"] = camera.time_added;
        sensor.memberOf = url;
        sensor.hasGeometry = {
            "asWKT": segments_map[camera.segment_id]
        };
        sensor["wecount:mac"] = camera.mac;
        sensor["wecount:user_id"] = camera.user_id;
        sensor["wecount:segment_id"] = camera.segment_id;
        sensor["wecount:CameraStatus"] = "wecount:" + camera.status;

        let observes = [
            "wecount:uptime",
            "wecount:heavy",
            "wecount:car",
            "wecount:bike",
            "wecount:pedestrian",
            "wecount:heavy_lft",
            "wecount:heavy_rgt",
            "wecount:car_lft",
            "wecount:car_rgt",
            "wecount:bike_lft",
            "wecount:bike_rgt",
            "wecount:pedestrian_lft",
            "wecount:pedestrian_rgt",
            "wecount:direction"
        ];
        if (camera.pedestrians_left) observes.push("wecount:pedestrians_left");
        if (camera.pedestrians_right) observes.push("wecount:pedestrians_right");
        if (camera.bikes_left) observes.push("wecount:bikes_left");
        if (camera.bikes_right) observes.push("wecount:bikes_right");
        if (camera.cars_left) observes.push("wecount:cars_left");
        if (camera.cars_right) observes.push("wecount:cars_right");

        sensor.observes = observes;

        sensor_list.push(sensor);
    })

    sensor_list.sort((a, b) => (parseInt(a["wecount:mac"]) > parseInt(b["wecount:mac"]) ? -1 : 0));
    return sensor_list;
}

async function get_all_observations_daily_paginated(req) {
    let day = moment(req.query.date).format('YYYY-MM-DD');
    let json = await get_all_observations_daily(day);
    let url = base_url + "observations_daily";
    
    if (json != null) {
        let response_object = response_template_cameras;
        let response = paginate_result(json, req, response_object, observation_template, url);
        return response;
    }
    else  {
        return null;
    }
}

async function get_all_observations_daily(day) {
    let filepath = "./files/" + day + ".json";
    console.log(day)
    if (fs.existsSync(filepath)) {
        //file exists
        let json = JSON.parse(fs.readFileSync(filepath));
        return json;
    }
    console.log("filepath" + filepath + " doesn't exist")
    return null;
}


function paginate_result(result_json, req, response_template, items_template, url) {
    const page = req.query.page != null ? parseInt(req.query.page) : 1;
    let start_index = (page - 1) * page_size;
    let end_index = page * page_size;
    
    let response_object = response_template;
    
    response_object.items = result_json.slice(start_index, end_index);
    items_template["@id"] = url;
    response_object.items.unshift(items_template);

    response_object.feed_url = url;
    response_object.id = url + "?page=" + page;
    if (result_json.length > end_index) {
        response_object.next_url = url + "?page=" + (page + 1);
        
        response_object["tree:relation"][0]["tree:node"] = url + "?page=" + (page + 1);
        response_object["tree:relation"][0]["tree:value"]["@value"] = result_json.slice(end_index -1, end_index)[0].id
    }
    else {
        delete response_object.next_url;
        
        delete response_object["tree:relation"][0]["tree:node"];
        delete response_object["tree:relation"][0]["tree:value"]["@value"];
    }

    if (page > 1) {
        response_object.previous_url = url + "?page=" + (page - 1);
    } else {
        delete response_object.previous_url;
    }

    return response_object;
}