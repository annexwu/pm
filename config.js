var config = {
	COS_CONFIG : {
		Appid : 'xxx',
		SecretId : 'xxx',
		SecretKey : 'xxx',

		Bucket : 'xxx',
		Region : 'xxx'
	},

	DEFAULT_IGNORE : [
		'node_modules',
		'pm.sh',
		'pm.config.json'
	],

	'first_project' : {
		name : 'first_project',
		path : '../first_project',
		pack_mode : 'ignore',
		pack_list : [
			
		],

		upload : false
	}
};

module.exports = config;