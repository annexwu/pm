var fs = require('fs');
var path = require('path');
var PM = require('./common/project_manager');

var argv = process.argv;

var config_path = path.resolve('pm.config.json');


var config = '{}';

try {
	config = fs.readFileSync(config_path);
} catch(e) {

}

PM.run({
	project_name : argv[2],
	action : argv[3],
	executor : argv[4],
	timestamp : (argv.length >= 6 && argv[5] != '--debug') ? argv[5] : null,
	pretty : true,
	project_config : JSON.parse(config)
})
.then(function(data) {
	console.log(data);
})
.catch(function(err) {
	console.log(err);
});