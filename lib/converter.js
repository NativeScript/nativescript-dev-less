exports.convert = convert;

var fs = require('fs');
var path = require('path');
var less = require('less');
var glob = require('glob');

function convert(logger, projectDir, options) {
	return new Promise(function (resolve, reject) {
		options = options || {};
		
		var lessFilesPath = path.join(projectDir, 'app/**/*.less');
		var lessFiles = glob.sync(lessFilesPath).filter(function(fileName){
			return fileName.indexOf("App_Resources") === -1;
		});
	
		for(var i = 0; i < lessFiles.length; i++) {
		    var filePath = lessFiles[i];
			
			var lessFileContent = fs.readFileSync(filePath, { encoding: 'utf8'});
			less.render(lessFileContent, {
				filename: filePath,
				compress: true,
				sync: true
			}, function (e, output) {
				if(e) {
					reject(Error(filePath + ' LESS CSS pre-processing failed. Error: ' + e));
				}
				var cssFilePath = filePath.replace('.less', '.css');
				fs.writeFile(cssFilePath, output.css, 'utf8');
			});
		}
		
		resolve();
	});
}