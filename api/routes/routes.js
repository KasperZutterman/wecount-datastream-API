'use strict';


module.exports = function (app) {
    var controller = require('../controllers/controller');

    // todoList Routes
    app.route('/cameras')
        .get(controller.list_all_cameras)
   
    app.route('/observations_daily')
        .get(controller.list_all_observations_daily)
    //.post(controller.create_a_task);


    /* app.route('/tasks/:taskId')
      .get(controller.read_a_task)
      .put(controller.update_a_task)
      .delete(controller.delete_a_task); */
};