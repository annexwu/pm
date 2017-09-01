var path = require('path');
var CONFIG_DIR_PATH = '../';
var util = require('./util');
var fs = require('fs');
var uploader = require('./uploader');
var _ = require('underscore');
var config = require('../config');

var DEFAULT_IGNORE = config.DEFAULT_IGNORE || [];


var myExec = util.exec;

/**
*	方法暴露
*/

var API_MAP = {
	updateProjectVersion : updateProjectVersionPromise,		// 更新项目的版本信息和历史信息，返回 promise 对象

	getPackData : getPackData,
	packProject : packProject,								// 打包项目，返回 promise 对象

	getRollbackData : getRollbackData,
	rollbackProject : rollbackProject,						// 回滚项目，返回 promise 对象

	uploadProject : uploadProject,							// 上传项目到指定的 COS Bucket ，返回 promise 对象

	getVersionData : getVersionData,						// 获取项目的 version 信息
};

module.exports = API_MAP;


/**
*	私有函数定义
*/

// 获取打包项目需要的参数，并且预先创建对应的目录和文件
function getPackData(project) {
	var project_name = project.name,
		pack_list = project.pack_list,
		upload = project.upload,
		pack_mode = project.pack_mode,
		default_dir = path.resolve(__dirname, CONFIG_DIR_PATH),
		project_path = path.resolve(default_dir, project.path),
		project_zip_path = path.resolve(project_path, project_name) + '.zip',
		project_package_dir = path.resolve(default_dir, `./packages/${project_name}`),
		project_version_path = path.resolve(default_dir, `./versions/${project_name}`);


	if(pack_mode == 'ignore') {
		var files = fs.readdirSync(project_path);
		
		pack_list = removeList(files, pack_list);
	}

	pack_list = removeList(pack_list, DEFAULT_IGNORE);


	util.makeDir(project_package_dir);
	util.makeFile(project_version_path, '{}');

	var timestamp = (new Date()).getTime(),
		project_package_path = path.resolve(project_package_dir, `./${project_name}.${timestamp}.zip`);

	return {
		project_name : project_name,					// 项目名称
		pack_list : pack_list,							// 项目的打包列表
		project_path : project_path,					// 项目的绝对路径
		project_zip_path : project_zip_path,			// 项目打包成功之后，压缩包的临时路径
		project_package_path : project_package_path,	// 项目的压缩包存储路径
		project_version_path : project_version_path,	// 项目的版本文件路径
		timestamp : timestamp,							// 项目的时间戳，暂时作为版本号
		upload : upload,								// 是否要上传到指定的 Bucket 
	};
}

// 更新项目的版本信息
function updateProjectVersion(params) {
	var version_path = params.project_version_path || '',
		action = params.action || 'pack',
		timestamp = params.timestamp || '',
		executor = params.executor || 'default';

	var version = fs.readFileSync(version_path);

	version = JSON.parse(version);

	version.current = params.timestamp;
	(!version.history) && (version.history = []);

	version.history.push({
		action : action,
		timestamp : timestamp,
		executor : executor
	});

	version = JSON.stringify(version);

	fs.writeFileSync(version_path, version);
}

// 更新项目的版本信息, Promise 版本
function updateProjectVersionPromise(params) {
	return new Promise(function(resolve, reject) {
		try{
			updateProjectVersion(params);
		} catch(e) {
			return reject(e || {});
		}

		resolve({
			current : params.timestamp
		})
	});
}

// 打包项目
function packProject(params) {
	var project_path = params.project_path,
		project_name = params.project_name,
		pack_list = params.pack_list,
		pack_list_str = pack_list.join(' ');
	
	var command = `7z a ${project_name}.zip ${pack_list_str} -r`;

	return new Promise(function(resolve, reject) {
		myExec(command, {
			cwd : project_path
		}, function(err, data) {
			if(err) {
				return reject(err || {});
			}

			resolve(data || {});
		});
	});
}


// 获取回滚项目需要的参数，并且预先创建对应的目录和文件
function getRollbackData(project, timestamp) {
	var project_name = project.name;
	var default_dir = path.resolve(__dirname, CONFIG_DIR_PATH);

	var project_path = path.resolve(default_dir, project.path);
	var project_package_dir = path.resolve(default_dir, `./packages/${project_name}`);
	var project_version_path = path.resolve(default_dir, `./versions/${project_name}`);

	util.makeDir(project_package_dir);
	util.makeFile(project_version_path, '{}');

	var version = fs.readFileSync(project_version_path);

	version = JSON.parse(version);

	timestamp = timestamp || version.current || '';

	var project_package_path = path.resolve(project_package_dir, `./${project_name}.${timestamp}.zip`);

	return {
		project_name : project_name,					// 项目名称
		project_path : project_path,					// 项目的绝对路径
		project_package_path : project_package_path,	// 项目的压缩包存储路径
		project_version_path : project_version_path,	// 项目的版本文件路径
		timestamp : timestamp							// 项目的时间戳，暂时作为版本号
	};
}


// 回滚项目
function rollbackProject(params) {
	var project_path = params.project_path || '',
		project_package_path = params.project_package_path || '';

	var command = `7z x ${project_package_path} -y -o${project_path}`;

	return new Promise(function(resolve, reject) {
		myExec(command, {
			
		}, function(err, data) {
			if(err) {
				return reject(err || {});
			} 

			resolve(data || {});
		}); 
	});
}

// 将项目压缩包上传到指定的 Bucket 中指定的目录下
function uploadProject(params) {
	var project_name = params.project_name,
		project_package_path = params.project_package_path,
		key = project_package_path.split('\\').pop();

	return new Promise(function(resolve, reject) {
		uploader.uploadFile({
			file_name : `${project_name}/${key}`,
			file_path : project_package_path
		}, function(err, data) {
			if(err) {
				return reject(err);
			}

			resolve(data);
		});
	});
}


// 获取项目的 version 信息

function getVersionData(project) {
	var default_dir = path.resolve(__dirname, CONFIG_DIR_PATH),
		project_name = project.name,
		version_path = path.resolve(default_dir, `./versions/${project_name}`);

	var version = fs.readFileSync(version_path);

	version = JSON.parse(version);

	return version;
}


function removeList(target, remove) {
	var map = {},
		result = [];

	_.each(target, function(value, key) {
		map[value] = true;
	});

	_.each(remove, function(value, key) {
		map[value] = false;
	});

	_.each(map, function(value, key) {
		if(value) {
			result.push(key);
		}
	});

	return result;
}