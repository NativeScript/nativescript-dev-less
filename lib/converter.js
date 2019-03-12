exports.convert = convert;

const fs = require('fs');
const path = require('path');
const less = require('less');
const glob = require('glob');

function convert(logger, $projectData) {
	return new Promise(function (resolve, reject) {
		const appDirPath = $projectData.appDirectoryPath;
		// NOTE: path.join will convert the `/` to correct ones based on the current OS
		const lessFilesPath = path.join(appDirPath, '/**/*.less');

		let appResourcesDirectoryPath = $projectData.appResourcesDirectoryPath;
		if (process.platform === "win32") {
			// glob returns all paths with UNIX style, i.e. with `/` instead of `\`, so ensure we use correct path for comparison
			appResourcesDirectoryPath = appResourcesDirectoryPath.replace(/\\/g, "/");
		}

		const lessFiles = glob.sync(lessFilesPath).filter(function (fileName) {
			return fileName.indexOf(appResourcesDirectoryPath) === -1;
		});

		if (!lessFiles || lessFiles.length === 0) {
			logger.trace(`Unable to find any '.less' files matching pattern: ${lessFilesPath}. nativescript-dev-less plugin will not do anything`);
			resolve();
			return;
		}

		let i = 0;
		const loopLessFilesAsync = function (lessFiles) {
			parseLess(lessFiles[i], function (e) {
				if (e !== undefined) {
					//Error in the LESS parser; Reject promise
					reject(Error(lessFiles[i] + ' LESS CSS pre-processing failed. Error: ' + e));
				}

				i++; //Increment loop counter

				if (i < lessFiles.length) {
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

function parseLess(filePath, callback) {
	const lessFileContent = fs.readFileSync(filePath, { encoding: 'utf8' });
	less.render(lessFileContent, {
		filename: filePath,
		compress: true,
		sync: true
	}, function (e, output) {
		if (e) {
			//Callback with error
			callback(e);
			return;
		}

		if (!output.css) {
			// No CSS to write to file, so just call callback without creating the file.
			callback();
			return;
		}

		const cssFilePath = filePath.replace('.less', '.css');

		const currentContent = fs.existsSync(cssFilePath) ? fs.readFileSync(cssFilePath).toString() : null;
		if (currentContent !== output.css) {
			// Overwrite file only in case the new content is not the same as current one.
			// This prevents infinite loop of `tns run` command.
			fs.writeFileSync(cssFilePath, output.css, 'utf8');
		}

		callback();
	});
}
