var COS = require('cos-nodejs-sdk-v5');
var fs = require('fs');
var util = require('./util');
var config = require('../config');


/**
*	方法暴露
*/

var API_MAP = {
	uploadFile : uploadFile,			// 上传文件， callback 回调形式
	downloadFile : downloadFile			// 下载文件， callback 回调形式
};

module.exports = API_MAP;



/**
*	私有函数定义
*/

var COS_CONFIG = config.COS_CONFIG;

var cos = new COS({
	AppId : COS_CONFIG.Appid,
	SecretId : COS_CONFIG.SecretId,
	SecretKey : COS_CONFIG.SecretKey
});

// 上传文件到指定的 Bucket 
function uploadFile(params, callback) {
	var Key = params.file_name || '',
		FilePath = params.file_path || '';

	cos.sliceUploadFile({
		Bucket : COS_CONFIG.Bucket,
		Region : COS_CONFIG.Region,
		Key : Key,
		FilePath : FilePath,
	}, function(err, data) {
		callback(err, data);
	});
}


// 下载文件到指定的本地路径
function downloadFile(params, callback) {
	var Key = params.file_name || '',
		FilePath = params.file_path || '';

	var ws = fs.createWriteStream(FilePath);

	cos.getObject({
		Bucket : COS_CONFIG.Bucket,
		Region : COS_CONFIG.Region,
		Key : Key,
		Output : ws
	}, function(err, data) {
		callback(err, data);
	});
}


