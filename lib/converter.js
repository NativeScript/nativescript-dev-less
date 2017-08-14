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

		var i = 0;
		var loopLessFilesAsync = function(lessFiles){
			parseLess(lessFiles[i], function(e){
				if(e !== undefined){
					//Error in the LESS parser; Reject promise
					reject(Error(lessFiles[i] + ' LESS CSS pre-processing failed. Error: ' + e));
				}

				i++; //Increment loop counter

				if(i < lessFiles.length){
					loopLessFilesAsync(lessFiles);
				} else {
					//All files have been processed; Resolve promise
					resolve();
				}
			});
		}

		loopLessFilesAsync(lessFiles);
	});
}

function parseLess(filePath, callback){
	var lessFileContent = fs.readFileSync(filePath, { encoding: 'utf8'});
	less.render(lessFileContent, {
		filename: filePath,
		compress: true,
		sync: true
	}, function (e, output) {
		if(e) {
			//Callback with error
			callback(e);
			return;
		}

		if(!output.css) {
			// No CSS to write to file, so just call callback without creating the file.
			callback();
			return;
		}

		var cssFilePath = filePath.replace('.less', '.css');

		var currentContent = fs.existsSync(cssFilePath) ? fs.readFileSync(cssFilePath).toString() : null;
		if (currentContent !== output.css) {
			// Overwrite file only in case the new content is not the same as current one.
			// This prevents infinite loop of `tns run` command.
			fs.writeFileSync(cssFilePath, output.css, 'utf8');
		}

		callback();
	});
}
