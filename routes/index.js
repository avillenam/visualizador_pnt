var express = require('express');
var router = express.Router();
var postgeo = require("postgeo");
var pg = require("pg");
var zerorpc = require("zerorpc");


//*****************************************************************


// var client = new zerorpc.Client();
// client.connect("tcp://10.13.86.182:4242");

// client.invoke("hello", "Tony", function(error, res, more) {
//     console.log(res);
// });
//*****************************************************************


// Probar con POST --> https://codeforgeek.com/2014/09/handle-get-post-request-express-4/


// router.get('/sentinelsat/:bbox/:time_ini/:time_fin/:sensor', function(req, response) {
router.get('/sentinelsat/:bbox/:desde/:hasta', function(req, response) {
    if (req.params.bbox) {
    
        console.log("Petición http recibida");
        // console.log(req.params.bbox);
        var client = new zerorpc.Client();
        client.connect("tcp://10.13.86.182:4242");  //esta es la IP donde está el servidor python a través de zerorpc

        // bbox = '{"type":"FeatureCollection","features":[{"type":"Feature","geometry":{"type":"Polygon","coordinates":[[[-1.6040039062500022,39.85072092501596],[-1.6040039062500022,40.25437660372651],[-0.8789062500000011,40.25437660372651],[-0.8789062500000011,39.85072092501596],[-1.6040039062500022,39.85072092501596]]]},"properties":null}]}'
        bbox = req.params.bbox;
        desde = req.params.desde;
        hasta = req.params.hasta;

        // console.log(req.params.bbox)


        // Realiza la peticion al servidor Python a través de zerorpc
        client.invoke("buscaimagensentinel", bbox, desde, hasta, 'Sentinel-2', function(error, res, more) {
            // console.log(JSON.stringify(res));
            // console.log(res);
            response.json(res);
        });

    } else {
        res.status(404) // HTTP status 404: NotFound
            .send('Not found');
    }

        // res.send("Peticion realizada correctamente, pero no se como enviar la respuesta JSON al fichero map.jade");
        

        // console.log(bbox);


    // obtieneIds();
});



// var conString = "postgres://postgres:postgres@10.13.86.181:5432/catalogo_pnt";
// var conString = "postgres://postgres:postgres1@10.13.86.178:5432/catalogo_pnt2";
var conString = "postgres://postgres:postgres@10.13.86.182:5432/catalogo_pnt";
// var conString = "postgres://postgres:postgres@localhost:5433/pruebas_tony";

//Fechas por defecto
var ahora = new Date();
var time_ini = '20150101';
var time_fin = '' + ahora.getFullYear() + (ahora.getMonth() + 1) + ahora.getDate();

//Satelites seleccionados
var satelites = {};
var id_satelites = "";


/* GET home page. */
router.get('/', function(req, res) {
    res.render('index', {
        title: 'Express'
    });
});

/* GET map page. */
router.get('/map', function(req, res) {
    var client = new pg.Client(conString);
    client.connect();
    var query = client.query("select distinct(satellite) FROM \"CT_products\" order by satellite");
    query.on("row", function(row, result) {
        result.addRow(row);
    });

    query.on("end", function(result) {
        res.render('map', {
            title: 'Visualizador del PNT',
            lat: 36.66,
            lng: -6.95,
            satellites: (result.rows)
        });
    });
});

/* GET pg json data. */
//Recoge una petición GET de tipo http://10.13.86.11:3000/satellites/('SENTINEL')
router.get('/satellites/:sats', function(req, res) {
    if (req.params.sats) {
        var client = new pg.Client(conString);
        client.connect();

        // console.log(req.params.sats);

        var query = client.query("SELECT id_product,satellite FROM \"CT_products\" WHERE satellite IN " + req.params.sats + "");
        query.on("row", function(row, result) {
            result.addRow(row);
        });
        query.on("end", function(result) {
            res.send(result.rows);
            satelites = result.rows;
            console.log(satelites);
            res.end();
        });
    } else {
        res.status(404) // HTTP status 404: NotFound
            .send('Not found');
    }

    // obtieneIds();
});


//petición principal que recoge la consulta según las coordenadas del BBOX
router.get('/pg/:xmin/:ymin/:xmax/:ymax/:srid', function(req, res) {
    if (req.params.xmin) {
        var client = new pg.Client(conString);
        client.connect();
        var xmin = req.params.xmin;
        var ymin = req.params.ymin;
        var xmax = req.params.xmax;
        var ymax = req.params.ymax;
        var srid = req.params.srid;

        if (req.param('sats')) {
            obtieneIds();
            var query = client.query("SELECT row_to_json(fc) " + "FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features " + "FROM (SELECT 'Feature' As type " + ", ST_AsGeoJSON(lg.geom)::json As geometry " + ", row_to_json(lp) As properties " + "FROM \"CT_images\" As lg " + "INNER JOIN (select id_image, fileidentifier, pathtodownload, pathtopreview, datecaptured fecha_captura FROM \"CT_images\"" + " where (st_overlaps(geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326)) OR " + " ST_Within (geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326))) AND " + " (datecaptured between to_date('" + time_ini + "','YYYYMMDD') and to_date('" + time_fin + "','YYYYMMDD')) AND id_product IN " + id_satelites + " order by datecaptured)  As lp " + "ON lg.id_image = lp.id_image  ) As f )  As fc");
        } else {
            var query = client.query("SELECT row_to_json(fc) " + "FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features " + "FROM (SELECT 'Feature' As type " + ", ST_AsGeoJSON(lg.geom)::json As geometry " + ", row_to_json(lp) As properties " + "FROM \"CT_images\" As lg " + "INNER JOIN (select id_image, fileidentifier, pathtodownload, pathtopreview, datecaptured fecha_captura FROM \"CT_images\"" + " where (st_overlaps(geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326)) OR " + " ST_Within (geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326))) AND " + " (datecaptured between to_date('" + time_ini + "','YYYYMMDD') and to_date('" + time_fin + "','YYYYMMDD')) order by datecaptured)  As lp " + "ON lg.id_image = lp.id_image  ) As f )  As fc");
        };

        query.on("row", function(row, result) {
            result.addRow(row);
        });
        query.on("end", function(result) {
            res.send(result.rows[0].row_to_json);
            console.log(result.rows[0].row_to_json.features);
            res.end();
        });
    } else {
        res.status(404) // HTTP status 404: NotFound
            .send('Not found');
    }
});

router.get('/time/:time_ini/:time_fin', function(req, res) {
    if (req.params.time_ini) {
        var client = new pg.Client(conString);
        client.connect();

        time_ini = req.params.time_ini;
        time_fin = req.params.time_fin;

        var query = client.query("select * from \"CT_images\" where datecaptured between to_date('" + time_ini + "','YYYYMMDD') and to_date('" + time_fin + "','YYYYMMDD') order by datecaptured");
        query.on("row", function(row, result) {
            result.addRow(row);
        });
        query.on("end", function(result) {
            res.send(result.rows);
            res.end();
        });
    } else {
        res.status(404) // HTTP status 404: NotFound
            .send('Not found');
    }
});

router.get('/api/users', function(req, res) {
    var user_id = req.param('id');
    var token = req.param('token');
    var geo = req.param('geo');

    res.send(user_id + ' ' + token + ' ' + geo);
});

function obtieneIds() {
    results = [];

    for (var i = 0; i < satelites.length; i++) {
        results.push(satelites[i].id_product);
    };

    id_satelites = "(" + results.join() + ")";
}

module.exports = router;
