var express = require('express');
var router = express.Router();
var postgeo = require("postgeo");
var pg = require("pg");

// var conString = "postgres://postgres:postgres@10.13.86.181:5432/catalogo_pnt";
// var conString = "postgres://postgres:postgres1@10.13.86.178:5432/catalogo_pnt2";
var conString = "postgres://postgres:postgres@localhost:5432/catalogo_pnt";
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
//Recoge una petición GET de tipo http://localhost:3000/satellites?id=DEIMOS1
router.get('/satellites/:sats', function(req, res) {
    if (req.params.sats) {
        var client = new pg.Client(conString);
        client.connect();

        console.log(req.params.sats);

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
            var query = client.query("SELECT row_to_json(fc) " + "FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features " + "FROM (SELECT 'Feature' As type " + ", ST_AsGeoJSON(lg.geom)::json As geometry " + ", row_to_json(lp) As properties " + "FROM \"CT_images\" As lg " + "INNER JOIN (select id_image, fileidentifier, pathtofile, datecaptured fecha_captura FROM \"CT_images\"" + " where (st_overlaps(geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326)) OR " + " ST_Within (geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326))) AND " + " (datecaptured between to_date('" + time_ini + "','YYYYMMDD') and to_date('" + time_fin + "','YYYYMMDD')) AND id_product IN " + id_satelites + " order by datecaptured)  As lp " + "ON lg.id_image = lp.id_image  ) As f )  As fc");
        } else {
            var query = client.query("SELECT row_to_json(fc) " + "FROM ( SELECT 'FeatureCollection' As type, array_to_json(array_agg(f)) As features " + "FROM (SELECT 'Feature' As type " + ", ST_AsGeoJSON(lg.geom)::json As geometry " + ", row_to_json(lp) As properties " + "FROM \"CT_images\" As lg " + "INNER JOIN (select id_image, fileidentifier, pathtofile, datecaptured fecha_captura FROM \"CT_images\"" + " where (st_overlaps(geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326)) OR " + " ST_Within (geom, st_transform(st_makeEnvelope(" + xmin + "," + ymin + "," + xmax + "," + ymax + "," + srid + "),4326))) AND " + " (datecaptured between to_date('" + time_ini + "','YYYYMMDD') and to_date('" + time_fin + "','YYYYMMDD')) order by datecaptured)  As lp " + "ON lg.id_image = lp.id_image  ) As f )  As fc");
        };

        query.on("row", function(row, result) {
            result.addRow(row);
        });
        query.on("end", function(result) {
            res.send(result.rows[0].row_to_json);
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
