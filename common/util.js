var path = require('path');
var cp = require('child_process');
var fs = require('fs');
var _ = require('underscore');

/**
*	方法暴露
*/

var API_MAP = {
	exec : exec,
	moveFile : moveFile,
	removeFile : removeFile,
	makeFile : makeFile,
	makeDir : makeMultiLevelDir,
	apiPromisify : apiPromisify,
	apiPromisifyList : apiPromisifyList,

	extend : extend,
	each : each
};

module.exports = API_MAP;


/**
*	私有方法定义
*/

// 打包 API
function apiWrapper(apiName, apiFn) {
	return function(params, callback) {
		callback = callback || _.noop;
		params = params || {};
		var res = apiFn.call(this, params, callback);
	};
}

// 将调用形式如 API(params, callback) 的 API 修改为 promise 形式
function apiPromisify(API) {
	return function(params) {
		return new Promise(function(resolve, reject) {
			API.call(null, params, function(err, data) {
				if(err) {
					return reject(err);
				}

				resolve(data);
			});
		}); 
	};
}

// 批量调用 apiPromisify， 将 API_MAP 中的 API 修改为 promise 形式
function apiPromisifyList(API_MAP, list) {
	var API_MAP_CLONE = _.extend({}, API_MAP);
	var API_PROMISE_MAP = {};

	_.each(list, function(value, key) {
		API_PROMISE_MAP[value] = apiPromisify(API_MAP_CLONE[value]) || _.noop;
		API_MAP_CLONE[value] = false;
	});

	_.each(API_MAP_CLONE, function(value, key) {
		if(value) {
			API_PROMISE_MAP[key] = value;
		}
	});

	return API_PROMISE_MAP;
}

// 执行 child_process 的 exec 操作
function exec(command, params, callback) {
	if(params && (typeof params == 'function')) {
		callback = params;
		params = {};
	}
	cp.exec(command, params, function(error, stdout, stderr) {
		if(error || stderr) {
			return callback({
				error : error,
				stderr : stderr
			});
		}

		return callback(null, {
			stdout : stdout,
			stderr : stderr
		});
	});
}

// 移动文件操作
function moveFile(target_path, source_path, callback) {
	var command = `mv -f ${source_path} ${target_path}`;

	return new Promise(function(resolve, reject) {
		exec(command, {}, function(err, data) {
			if(err) {
				return reject(err || {});
			}

			resolve(data || {});
		});
	});
}


// 删除文件操作
function removeFile(target_path, callback) {
	var command = `rm -rf ${target_path}`;

	return new Promise(function(resolve, reject) {
		exec(command, {}, function(err, data) {
			if(err) {
				return reject(err || {});
			}

			resolve(data || {});
		});
	});
}

// 创建多级目录，如果多级目录不存在，则创建文件多级目录。如果存在则不进行处理。
function makeMultiLevelDir(dirname) {  
	if (fs.existsSync(dirname)) {  
		return true;  
	} else {  
		if (makeMultiLevelDir(path.dirname(dirname))) {  
			fs.mkdirSync(dirname);  
			return true;  
		}  
	}  
}

// 创建指定文件，如果该文件不存在，则创建文件多级目录和空文件。如果存在则不进行处理。
function makeFile(file_path, content) {
	if(makeMultiLevelDir(path.dirname(file_path))) {
		if(!fs.existsSync(file_path)) {
			fs.writeFileSync(file_path, content || '');
		}
	}
}

function extend(target, source) {
	return _.extend(target, source);
}

function each(target, callback) {
	return _.each(target, callback);
}