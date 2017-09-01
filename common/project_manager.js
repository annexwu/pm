var tool = require('./tool');
var util = require('./util');
var CONFIG = require('../config');
var path = require('path');
var fs = require('fs');

var LOCAL_DEBUG = process.argv.indexOf('--debug') > -1;
/**
*	方法暴露
*/

var API_MAP = {
	pack : pack,
	rollback : rollback,
	//upload : upload,

	getVersion : getVersion,

	init : init,

	run : run,
};

var API_PROMISE_MAP = util.apiPromisifyList(API_MAP, ['pack', 'rollback', 'run']);


module.exports = API_PROMISE_MAP;


/**
*	私有函数定义
*/

var moveFile = util.moveFile,
	getPackData = tool.getPackData,
	getRollbackData = tool.getRollbackData,
	packProject = tool.packProject,
	rollbackProject = tool.rollbackProject,
	updateProjectVersion = tool.updateProjectVersion,
	uploadProject = tool.uploadProject,
	getVersionData = tool.getVersionData;


// 打包项目，并更新项目的版本编号，历史记录
function pack(params, callback) {
	var project_name = params.project_name,
		executor = params.executor,
		project = CONFIG[project_name];

	if(params.project_config) {
		project = params.project_config || {};
	}

	var data = getPackData(project),	
		project_package_path = data.project_package_path,
		project_zip_path = data.project_zip_path,
		timestamp = data.timestamp,
		need_upload = data.upload,
		project_version_path = data.project_version_path;

	packProject(data)
		.then(function(res) {
			
			debugLog('pack project zip success...');
			
			return moveFile(project_package_path, project_zip_path);
		})
		.then(function(res) {
			
			debugLog('move project zip success...');
			
			return updateProjectVersion({
				action : 'pack',
				timestamp : timestamp,
				project_version_path : project_version_path,
				executor : executor
			});
		})
		.then(function(res) {
			
			debugLog(`update project version succcess... \ncurrent version is : ${timestamp}`);
			
			if(need_upload) {
				upload(data, callback);
			}
		})
		.catch(function(err) {
			callback(err);
		});
}

// 回滚项目，并更新项目的版本编号，历史记录
function rollback(params, callback) {
	var project_name = params.project_name,
		executor = params.executor,
		project = CONFIG[project_name];

	if(params.project_config) {
		project = params.project_config || {};
	}

	var data = getRollbackData(project, params.timestamp),
		project_version_path = data.project_version_path,
		timestamp = data.timestamp;


	rollbackProject(data)
		.then(function(res) {
			
			debugLog('rollback project success...');
			
			return updateProjectVersion({
				action : 'rollback',
				timestamp : timestamp,
				project_version_path : project_version_path,
				executor : executor
			});
		})
		.then(function(res) {
			
			debugLog(`update project version succcess... \ncurrent version is : ${timestamp}`);

			if(!params.pretty) {
				return callback(null, res);
			}

			callback(null, `\ncurrent version : ${res.current}`);
		})
		.catch(function(err) {
			callback(err);
		});
}

// 将项目压缩包上传到指定的 Bucket 中
function upload(params, callback) {
	uploadProject(params)
		.then(function(data) {
			callback(null, data);
		})
		.catch(function(err) {
			callback(err);
		});
}

// 获取项目的 verison 信息
function getVersion(params) {
	var project_name = params.project_name,
		project = CONFIG[project_name],
		pretty = params.pretty;

	if(params.project_config) {
		project = params.project_config || {};
	}

	var version = getVersionData(project);

	if(!pretty) {
		return version;
	}

	var pretty_str = `\ncurrent version : ${version.current}\n\nhistory version : \n\n`,
		history = version.history || [];

	util.each(history, function(value, key) {
		pretty_str += `  action : ${value.action}, version : ${value.timestamp}, executor : ${value.executor} \n`;
	});

	return pretty_str;
}

function run(params, callback) {
	
	var action_params = util.extend({}, params),
		action = action_params.action || 'pack';

	delete action_params['action'];

	if(action == 'pack') {
		pack(action_params, callback);
	} else if(action == 'rollback') {
		rollback(action_params, callback);
	} else if(action == 'version') {
		action_params['executor'] && (delete action_params['executor']);
		action_params['timestamp'] && (delete action_params['timestamp']);
		callback(null, getVersion(action_params));
	} else if(action == 'init') {
		init(action_params, callback);
	}

}


function debugLog(msg) {
	if(LOCAL_DEBUG) {
		console.log(msg);
	}
}

// 执行初始化操作，在项目中生成 pm.config.js 文件
function init(params, callback) {
	var project_name = params.project_name || '',
		project_path = path.resolve();

	var content = {
		name : project_name,
		path : project_path,
		pack_mode : 'ignore',
		pack_list : []
	};

	fs.writeFileSync(path.resolve(project_path, 'pm.config.json'), JSON.stringify(content));

	callback(null, 'init success...');

}