    //initialize variables needed for layer management
    var layer_list = [
        {
            'name':'Layer 1',
            'labels_enabled':false,
            'points_list':[],
            'lines_list':[],
            'polygons_list':[]
        }
    ];

    //rename the layer in the layer array and in all points, lines, and polygons within layer
    function rename_layer(index, new_layer_name){
        //renames layer in layer_list array

        // layer_list.splice(index, 1, new_layer_name);
        layer_list[index].name = new_layer_name;

        //Updates layer on point attributes for points in layer
        for(var i = 0; i < layer_list[index].points_list.length; i++){
            layer_list[index].points_list[i].properties.layer_name = layer_list[index].name;
        }

        //Updates layer on line attributes for lines in layer
        for(var i = 0; i < layer_list[index].lines_list.length; i++){
            layer_list[index].lines_list[i].properties.layer_name = layer_list[index].name;
        }

        //Updates layer on polygons attributes for polygons in layer
        for(var i = 0; i < layer_list[index].polygons_list.length; i++){
            layer_list[index].polygons_list[i].properties.layer_name = layer_list[index].name;
        }
    }

    //creates new layer {
    function create_layer(name) {
        layer_list.push(
            {
            'name':name,
            'labels_enabled':false,
            'points_list':[],
            'lines_list':[],
            'polygons_list':[]
            }
        );
    }

    function delete_layer(index){
        let is_confirmed = window.confirm("Delete Selected Layer? Deleting a layer will delete all associated items");
        if (is_confirmed){
            layer_list.splice(index, 1);
            renumber_layer_on_properties();
            recalculate_min_max();
        }
    }

    function renumber_layer_on_properties(){
        for (var i = 0; i < layer_list.length; i++){

            //Renumbers points
            for (var x = 0; x < layer_list[i].points_list.length; x++){
                layer_list[i].points_list[x].properties.layer_index = i;
            }

            //Renumbers lines
            for (var x = 0; x < layer_list[i].lines_list.length; x++){
                layer_list[i].lines_list[x].properties.layer_index = i;
            }

            //Renumbers polygons
            for (var x = 0; x < layer_list[i].polygons_list.length; x++){
                layer_list[i].polygons_list[x].properties.layer_index = i;
            }
        }
    }

    //variables used for auto-scaling;
    //auto-scaling is not handled by this application, but the minimum and maximum values are calculated and stored.
    var max_x_value;
    var min_x_value;
    var max_y_value;
    var min_y_value;

    function calculate_min_max(x, y){
        if (max_x_value == null) {
            max_x_value = geoJSON_pointer.x;
            min_x_value = geoJSON_pointer.x;
            max_y_value = geoJSON_pointer.y;
            min_y_value = geoJSON_pointer.y;
        }

        if (x > max_x_value) {
            max_x_value = x;
        }
        if (x < min_x_value) {
            min_x_value = x;
        }
        if (y > max_y_value){
            max_y_value = y;
        }
        if (y < min_y_value) {
            min_y_value = y;
        }
    }

    function recalculate_min_max(){
        max_x_value = null;
        max_y_value = null;
        min_x_value = null;
        min_y_value = null;

        for (x = 0; x < layer_list.length; x++){

            //calculates min/max for all points. 
            for (i = 0; i < layer_list[x].points_list.length; i++) {
                calculate_min_max(layer_list[x].points_list[i].geometry.coordinates[0], layer_list[x].points_list[i].geometry.coordinates[1]);
            }

            //calculates min/max for all lines.
            for (i = 0; i < layer_list[x].lines_list.length; i++) {
                for (a = 0; a < layer_list[x].lines_list[i].geometry.coordinates.length; a++) {
                    calculate_min_max(layer_list[x].lines_list[i].geometry.coordinates[a][0], layer_list[x].lines_list[i].geometry.coordinates[a][1]);
                }
            }

            //calculates min/max for all polygons
            for (i = 0; i < layer_list[x].polygons_list.length; i++) {
                for (a = 0; a < layer_list[x].polygons_list[i].geometry.coordinates.length; a++) {
                    calculate_min_max(layer_list[x].polygons_list[i].geometry.coordinates[a][0], layer_list[x].polygons_list[i].geometry.coordinates[a][1]);
                }
            }
        }       
    }

    //variables used to determine if a polygon is closed or
    //to determine if point is selected for editing
    var SELECTION_RANGE = 10;
    var GPS_SELECTION_RANGE = 0.0000001;

    //Keeps track of the current location for feature creation a
    var geoJSON_pointer = {
        x: undefined,
        y: undefined,
        z: 0
    }

    line_start = true;
    polygon_start = true;
    polygon_x1 = 0;
    polygon_y1 = 0;

    //sets coordinate values
    function set_coordinates(x, y, z) {
        geoJSON_pointer.x = x;
        geoJSON_pointer.y = y;
        geoJSON_pointer.z = z;

        return{'coordinates': geoJSON_pointer};
    }

    //Geolocation functions needed
    const successCallback = (position) => {
        return position;
    };

    const errorCallback = (error) => {
      return error;
    };

    async function create_gps_point(layer_index, color, label, description, z = 0){

        if (layer_list[layer_index] === undefined) {
                window.alert('You must select an existing layer');
                return;
        }
        
        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition((position) => {
                let lat = position.coords.latitude;
                let long = position.coords.longitude;
                let alt = position.coords.altitude;

                geoJSON_pointer.x = long;
                geoJSON_pointer.y = lat;

                if (alt != null){
                    geoJSON_pointer.z = alt;
                }
                else {
                    geoJSON_pointer.z = z;
                }

                resolve(create_point(layer_index, color, label, description));
            });
        });
    }

    //coordinates must be set before creating point
    function create_point(layer_index, color, label, description){
        if (layer_list[layer_index] === undefined) {
            var error = 'You must select an existing layer';
            return error;
        }

        calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);

        var point_data = {
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [geoJSON_pointer.x, geoJSON_pointer.y, geoJSON_pointer.z]
            },
            "properties": {
                "color": color,
                "layer_index": layer_index,
                "layer_name": layer_list[layer_index].name,
                "description" : description,
                "label": label
            },
        }

        layer_list[layer_index].points_list.push(point_data);
        return point_data;

    }

    //returns index of point within layer index provided which is within selection range and is closest to pointer.
    function select_edit_point(layer_index) {

        var potential_matches = [];
        var minX = geoJSON_pointer.x - SELECTION_RANGE;
        var maxX = geoJSON_pointer.x + SELECTION_RANGE;
        var minY = geoJSON_pointer.y - SELECTION_RANGE;
        var maxY = geoJSON_pointer.y + SELECTION_RANGE;

        //fills potential matches list with list of points within selection range of geoJSON pointer location.
        for (i = 0; i < layer_list[layer_index].points_list.length; i++) {
            if (layer_list[layer_index].points_list[i].geometry.coordinates[0] < maxX) {
                if (layer_list[layer_index].points_list[i].geometry.coordinates[0] > minX) {
                    if (layer_list[layer_index].points_list[i].geometry.coordinates[1] > minY) {
                        if (layer_list[layer_index].points_list[i].geometry.coordinates[1] < maxY) {
                            potential_matches.push(i);
                        }
                    }
                }
            }
        }

        //compares points within potential matches to return the one closest to the pointer.
        if (potential_matches.length > 0) {
            point_index = potential_matches[0];
            if (potential_matches.length > 1){
                for (i = 0; i < potential_matches.length; i++) {
                    var compare_point = layer_list[layer_index].points_list[potential_matches[i]];
                    var current_point = layer_list[layer_index].points_list[point_index];
                    var compare_dif = Math.abs((geoJSON_pointer.x - compare_point.geometry.coordinates[0])) + Math.abs((geoJSON_pointer.y - compare_point.geometry.coordinates[1]));
                    var current_dif = Math.abs((geoJSON_pointer.x - current_point.geometry.coordinates[0])) + Math.abs((geoJSON_pointer.y - current_point.geometry.coordinates[1]));
                    if (compare_dif < current_dif) {
                        point_index = potential_matches[i];
                    }
                }
            }
            return point_index;
        }
        else {
            point_index = undefined;
            return point_index;
        }
    }

    //set coordinates must be used first as this references the geoJSON_pointer values.
    function update_point_coordinates(layer_index, point_index){
        layer_list[layer_index].points_list[point_index].geometry.coordinates[0] = geoJSON_pointer.x;
        layer_list[layer_index].points_list[point_index].geometry.coordinates[1] = geoJSON_pointer.y;
        layer_list[layer_index].points_list[point_index].geometry.coordinates[2] = geoJSON_pointer.z;
        calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
        return layer_list[layer_index].points_list[point_index];
    }

    function delete_point(layer_index, point_index){
        var recalculate = false;
        if (layer_list[layer_index].points_list[point_index].geometry.coordinates[0] == min_x_value | layer_list[layer_index].points_list[point_index].geometry.coordinates[0] == max_x_value){
            recalculate = true;
        }
        if (layer_list[layer_index].points_list[point_index].geometry.coordinates[1] == min_y_value | layer_list[layer_index].points_list[point_index].geometry.coordinates[1] == max_y_value){
            recalculate = true;
        }
        layer_list[layer_index].points_list.splice(point_index, 1);
        if (recalculate){
            recalculate_min_max();
        }

    }

    async function create_gps_line(layer_index, color, label, description, z=0){

        if (layer_list[selected_layer] === undefined) {
                window.alert('You must select an existing layer');
                return;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
            navigator.geolocation.getCurrentPosition((position) => {
                let lat = position.coords.latitude;
                let long = position.coords.longitude;
                let alt = position.coords.altitude;

                geoJSON_pointer.x = long;
                geoJSON_pointer.y = lat;

                if (alt != null){
                    geoJSON_pointer.z = alt;
                }
                else {
                    geoJSON_pointer.z = z;
                }

                resolve(create_line(layer_index, color, label, description));
            });
        });
    }

    //creates new line if line_start=true, else continues line.
    function create_line(layer_index, color, label, description){
        if (layer_list[layer_index] === undefined) {
            var error = 'You must select an existing layer';
            return error;
        }

        if (line_start){
            line_start = false;

            var line_data = {
                "type": "Feature",
                "geometry": {
                    "type": "LineString",
                    "coordinates": [
                        [geoJSON_pointer.x, geoJSON_pointer.y, geoJSON_pointer.z]
                    ]
                },
                "properties": {
                    "color": color,
                    "layer_index": layer_index,
                    "layer_name": layer_list[layer_index].name,
                    "description" : description,
                    "label":label
                },
            }

            layer_list[layer_index].lines_list.push(line_data);
            calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
            return line_data;
        }

        else {
            layer_list[layer_index].lines_list[layer_list[layer_index].lines_list.length - 1].geometry.coordinates.push([geoJSON_pointer.x, geoJSON_pointer.y, geoJSON_pointer.z]);
            calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
            return layer_list[layer_index].lines_list[layer_list[layer_index].lines_list.length - 1];
        }
    }

    function end_line(){
        line_start = true;
        return line_start;
    }

    //returns index of point & line within layer index provided which is within selection range and is closest to pointer.
    function select_edit_line(layer_index) {

        var potential_matches = [];
        var minX = geoJSON_pointer.x - SELECTION_RANGE;
        var maxX = geoJSON_pointer.x + SELECTION_RANGE;
        var minY = geoJSON_pointer.y - SELECTION_RANGE;
        var maxY = geoJSON_pointer.y + SELECTION_RANGE;

        //loops through lines list and points within each line to determine if any fall within range of the current pointer;
        //pushes matches to potential matches list.
        for (i = 0; i < layer_list[layer_index].lines_list.length; i++) {
            for (x = 0; x < layer_list[layer_index].lines_list[i].geometry.coordinates.length; x++) {

                if (layer_list[layer_index].lines_list[i].geometry.coordinates[x][0] < maxX) {
                    if (layer_list[layer_index].lines_list[i].geometry.coordinates[x][0] > minX) {
                        if (layer_list[layer_index].lines_list[i].geometry.coordinates[x][1] > minY) {
                            if (layer_list[layer_index].lines_list[i].geometry.coordinates[x][1] < maxY) {
                                var match = {
                                    'line': i,
                                    'point': x
                                };
                                potential_matches.push(match);
                            }
                        }
                    }
                }

            }
        }

        //loops through potential matches to find the closest match.
        if (potential_matches.length > 0) {
            line_index = potential_matches[0];

            if (potential_matches > 1) {
                for (i = 0; i < potential_matches.length; i++) {

                    var compare_point = layer_list[selected_layer].lines_list[potential_matches[i].line].geometry.coordinates[potential_matches[i].point];
                    var current_point = layer_list[selected_layer].lines_list[line_index.line].geometry.coordinates[line_index.point];

                    var compare_dif = Math.abs((geoJSON_pointer.x - compare_point[0])) + Math.abs((geoJSON_pointer.y - compare_point[1]));
                    var current_dif = Math.abs((geoJSON_pointer.x - current_point[0])) + Math.abs((geoJSON_pointer.y - current_point[1]));
                    if (compare_dif < current_dif) {
                        line_index = potential_matches[i];
                    }
                }
            }
            return line_index;
        }
        else {
            line_index = undefined;
            return line_index;
        }
    }

    //set coordinates must be used first as this references the geoJSON_pointer values.
    //line index must be an object with the same format as that returned by select_edit_line();
    function update_line_coordinates(layer_index, line_index){
        layer_list[layer_index].lines_list[line_index.line].geometry.coordinates[line_index.point][0] = geoJSON_pointer.x;
        layer_list[layer_index].lines_list[line_index.line].geometry.coordinates[line_index.point][1] = geoJSON_pointer.y;
        layer_list[layer_index].lines_list[line_index.line].geometry.coordinates[line_index.point][2] = geoJSON_pointer.z;
        calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
        return layer_list[layer_index].lines_list[line_index.line];
    }

    //line index must be an object with the same format as that returned by select_edit_line();
    function delete_line_point(layer_index, lines_index) {
        var recalculate = false;
        if (layer_list[layer_index].lines_list[lines_index.line].geometry.coordinates[lines_index.point][0] == min_x_value | layer_list[layer_index].lines_list[lines_index.line].geometry.coordinates[lines_index.point][0] == max_x_value){
            recalculate = true;
        }
        if (layer_list[layer_index].lines_list[lines_index.line].geometry.coordinates[lines_index.point][1] == min_y_value | layer_list[layer_index].lines_list[lines_index.line].geometry.coordinates[lines_index.point][1] == max_y_value){
            recalculate = true;
        }
        layer_list[layer_index].lines_list[lines_index.line].geometry.coordinates.splice(lines_index.point, 1);
        if (recalculate){
            recalculate_min_max();
        }
    }

    //line index must be an object with the same format as that returned by select_edit_line();
    function delete_line(layer_index, lines_index) {
        layer_list[layer_index].lines_list.splice(lines_index.line, 1);
        recalculate_min_max();
    }

    async function create_gps_polygon(layer_index, color, label, description, z=0){
        if (layer_list[selected_layer] === undefined) {
                window.alert('You must select an existing layer');
                return;
        }

        return new Promise((resolve) => {
            navigator.geolocation.getCurrentPosition(successCallback, errorCallback);
            navigator.geolocation.getCurrentPosition((position) => {
                let lat = position.coords.latitude;
                let long = position.coords.longitude;
                let alt = position.coords.altitude;

                geoJSON_pointer.x = long;
                geoJSON_pointer.y = lat;

                if (alt != null){
                    geoJSON_pointer.z = alt;
                }
                else {
                    geoJSON_pointer.z = z;
                }

                resolve(create_polygon(layer_index, color, label, description, true))
            });
        });
    }

    //creates new polygon if polygon_start=true, else continues polygon.
    function create_polygon(layer_index, color, label, description, use_gps_selection){
        if (layer_list[layer_index] === undefined) {
            var error = 'You must select an existing layer';
            return error;
        }

        //if polygon start push new polygon to list;
        if (polygon_start){

            polygon_start = false;
            polygon_x1 = geoJSON_pointer.x;
            polygon_y1 = geoJSON_pointer.y;

            var polygon_json = {
                "type": "Feature",
                "geometry": {
                    "type": "Polygon",
                    "coordinates": [
                        [geoJSON_pointer.x, geoJSON_pointer.y, geoJSON_pointer.z],
                    ]
                },
                "properties": {
                    "color": color,
                    "layer_index": layer_index,
                    "layer_name": layer_list[layer_index].name,
                    "description" : description,
                    "label":label
                }
            }

            layer_list[layer_index].polygons_list.push(polygon_json);
            calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
            return polygon_json;
        }

        //continue existing polygon
        else {

            //Used to verify polygon is closed.
            var minX = geoJSON_pointer.x - SELECTION_RANGE;
            var maxX = geoJSON_pointer.x + SELECTION_RANGE;
            var minY = geoJSON_pointer.y - SELECTION_RANGE;
            var maxY = geoJSON_pointer.y + SELECTION_RANGE;

            if (use_gps_selection) {
                var minX = geoJSON_pointer.x - GPS_SELECTION_RANGE;
                var maxX = geoJSON_pointer.x + GPS_SELECTION_RANGE;
                var minY = geoJSON_pointer.y - GPS_SELECTION_RANGE;
                var maxY = geoJSON_pointer.y + GPS_SELECTION_RANGE;
            }

            //if the current point created is within the selection range of the first point of the polygon:
            //complete the polygon and push the first coordinates to the polygon to close
            if (polygon_x1 > minX && polygon_x1 < maxX && polygon_y1 > minY && polygon_y1 < maxY) {
                polygon_start = true;
                layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1].geometry.coordinates.push(layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1].geometry.coordinates[0]);
                return layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1];
            }
            //if the current point created is not within the selection range of the first point of he polygon:
            //push new point to the polygon
            else {
                layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1].geometry.coordinates.push([geoJSON_pointer.x, geoJSON_pointer.y, geoJSON_pointer.z]);
                calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
                return layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1];
            }
        }
    }

    function auto_close_polygon(layer_index){

        if(!polygon_start){
            polygon_start = true;
            //gets first point for this polygon from the data structure so that it can be pushed as the last point in the polygon.
            var first = layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1].geometry.coordinates[length];
            layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1].geometry.coordinates.push(first);
            return layer_list[layer_index].polygons_list[layer_list[layer_index].polygons_list.length - 1];
        }
        else {
            var error = "No in progress polygon detected";
            return error;
        }
    }

    //returns index of point & polygon within layer index provided which is within selection range and is closest to pointer.
    function select_edit_polygon(layer_index) {

        var potential_matches = [];
        var minX = geoJSON_pointer.x - SELECTION_RANGE;
        var maxX = geoJSON_pointer.x + SELECTION_RANGE;
        var minY = geoJSON_pointer.y - SELECTION_RANGE;
        var maxY = geoJSON_pointer.y + SELECTION_RANGE;

        //loops through each point within each polygon in the selected layer to find any within selection range
        for (i = 0; i < layer_list[layer_index].polygons_list.length; i++) {
            for (x = 0; x < layer_list[layer_index].polygons_list[i].geometry.coordinates.length; x++) {

                if (layer_list[layer_index].polygons_list[i].geometry.coordinates[x][0] < maxX) {
                    if (layer_list[layer_index].polygons_list[i].geometry.coordinates[x][0] > minX) {
                        if (layer_list[layer_index].polygons_list[i].geometry.coordinates[x][1] > minY) {
                            if (layer_list[layer_index].polygons_list[i].geometry.coordinates[x][1] < maxY) {
                                var match = {
                                    'polygon': i,
                                    'point': x
                                };
                                potential_matches.push(match);
                            }
                        }
                    }
                }

            }
        }

        //loops through potential matches to find the closest one
        if (potential_matches.length > 0) {
            polygon_index = potential_matches[0];

            if (potential_matches.length > 1){
                for (i = 0; i < potential_matches.length; i++) {

                    var compare_point = layer_list[selected_layer].polygons_list[potential_matches[i].polygon].geometry.coordinates[potential_matches[i].point];
                    var current_point = layer_list[selected_layer].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point];

                    var compare_dif = Math.abs((geoJSON_pointer.x - compare_point[0])) + Math.abs((geoJSON_pointer.y - compare_point[1]));
                    var current_dif = Math.abs((geoJSON_pointer.x - current_point[0])) + Math.abs((geoJSON_pointer.y - current_point[1]));
                    if (compare_dif < current_dif) {
                        polygon_index = potential_matches[i];
                    }
                }
            }
            return polygon_index;
        }
        else {
            polygon_index = undefined;
            return polygon_index;
        }
    }

    //set coordinates must be used first as this references the geoJSON_pointer values.
    //polygon index must be an object with the same format as that returned by select_edit_line();
    function update_polygon_coordinates(layer_index, polygon_index){
        layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][0] = geoJSON_pointer.x;
        layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][1] = geoJSON_pointer.y;
        layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][1] = geoJSON_pointer.y;
        calculate_min_max(geoJSON_pointer.x, geoJSON_pointer.y);
        return layer_list[layer_index].polygons_list[polygon_index.polygon];
    }

    //polygon index must be an object with the same format as that returned by select_edit_line();
    function delete_polygon(layer_index, polygon_index) {
        layer_list[layer_index].polygons_list.splice(polygon_index.polygon, 1);
        recalculate_min_max();
    }

    //polygon index must be an object with the same format as that returned by select_edit_line();
    function delete_polygon_point(layer_index, polygon_index) {

        if (layer_list[selected_layer].polygons_list[polygon_index.polygon].geometry.coordinates.length <= 4) {
            return 'Polygon must have more than three points in order to delete.';
        }
        else if (polygon_index.point == 0 | polygon_index.point == layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates.length - 1) {
            return 'You cannot delete the first point in the Polygon.';
        }
        else {
            recalculate = false;
            if (layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][0] == min_x_value | layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][0] == max_x_value){
                recalculate = true;
            }
            if (layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][1] == min_y_value | layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates[polygon_index.point][1] == max_y_value){
                recalculate = true;
            }

            layer_list[layer_index].polygons_list[polygon_index.polygon].geometry.coordinates.splice(polygon_index.point, 1);
            if (recalculate){
                recalculate_min_max();
            }
        }
    }

    //features should be a geoJSON list of features
    function initialize_gis_project_from_file(features){
        try{

            //loops through each feature within the list provided
            for (i = 0; i < features.length; i++) {
                var feature = features[i];
                var layer_index = 0;

                // if feature includes a layer_index value:
                if (feature.properties.layer_index){

                   //add layer to layer_list if it does not already exist
                   if (layer_list[feature.properties.layer_index] === undefined){
                    layer_list.splice(feature.properties.layer_index, 1,
                        {
                            'name':feature.properties.layer_name,
                            'labels_enabled':false,
                            'points_list':[],
                            'lines_list':[],
                            'polygons_list':[]
                        });
                    }

                    //if data does not include layers, use default layer.
                    layer_index = feature.properties.layer_index;

                }

                //add feature to points_list within layer if geometry type is point
                if (feature.geometry.type == "Point") {
                    layer_list[layer_index].points_list.push(feature);
                    calculate_min_max(feature.geometry.coordinates[0], feature.geometry.coordinates[1]);
                }

                //add feature to ine list within layer if geometry type is line
                if (feature.geometry.type == "LineString") {
                    layer_list[layer_index].lines_list.push(feature);
                    for (var x = 0; x < feature.geometry.coordinates.length; x++){
                        calculate_min_max(feature.geometry.coordinates[x][0], feature.geometry.coordinates[x][1]);
                    }
                }

                //add feature to polygons list within layer if geometry type is polygon
                if (feature.geometry.type == "Polygon") {
                    layer_list[layer_index].polygons_list.push(feature);
                    for (var x = 0; x < feature.geometry.coordinates.length; x++){
                        calculate_min_max(feature.geometry.coordinates[x][0], feature.geometry.coordinates[x][1]);
                    }
                }
            }

            return layer_list;
        }

        catch (err){
            var error = "Error initializing project from GeoJSON";
            return error;
        }
    }

    function generate_geoJSON(){
        var features = [];

        for (var i = 0; i < layer_list.length; i++){
            features = features.concat(layer_list[i].points_list).concat(layer_list[i].lines_list.concat(layer_list[i].polygons_list));
        }

        var GeoJSON = {
            "type": "FeatureCollection",
            "features": features
        }
        return JSON.stringify(GeoJSON);
    }
