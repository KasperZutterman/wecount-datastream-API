'use strict';

exports.list_all_cameras = async function (req, res) {
    var model = require('../models/model');

    try {
        //let cameras = await model.get_all_cameras()
        let cameras = await model.get_all_cameras_paginated(req)

        if (cameras) {
            res.status(200).json(cameras);
        }
        else {
            res.status(404).json({error : "not found"})
        }
    } catch (err) {
        res.status(500).json({error : "error getting cameras"})
    }
    
};

exports.list_all_observations_daily = async function (req, res) {
    var model = require('../models/model');

    try {
        //let cameras = await model.get_all_cameras()
        let observations_daily = await model.get_all_observations_daily_paginated(req)

        if (observations_daily) {
            res.status(200).json(observations_daily);
        }
        else {
            res.status(404).json({error : "not found"})
        }
    } catch (err) {
        res.status(500).json({error : "error getting observations"})
    }
};