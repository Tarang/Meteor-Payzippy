Package.describe({
  summary: "Payzippy API for meteor"
});

Package.on_use(function (api) {
	Npm.depends({connect: '2.19.6'});
	
	api.use(['http', 'underscore', 'webapp'], 'server');
	api.export('PayZippy', ['server']);
	api.add_files(
	[
		'lib.js',
		'errorcodes.js',
		'callback_handler.js'
	], ['server'] );
});